import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.esm.browser.js';

const app = new Vue({
  el: "#app",
  data: {
    userName: "...",
    peerConnectionState: ""
  }

});

(async () => {

  const auth = await auth0.loggedIn;

  app.userName = await auth.getIdTokenClaims().then(x => x.name);
  
  const {hub, send: sendToHub} = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });


  const connected = ((hub, sendToHub)=> {

    const sendSignalingMessage = to => {
      return async sessionDescription => {
        //console.log(`from [${hub.connectionId}]`,`to [${to}]`,sessionDescription);
        await sendToHub({
          Target: 'message',
          Arguments: [{
            from: hub.connectionId,
            sessionDescription: sessionDescription
          }],
          ConnectionId: to
        });
      };
    };

    let resolveConnected;
    const connected = new Promise(resolve => {
      resolveConnected = resolve;
    });

    const initPeerConnection = from => {
      const pc = new LANPeerConnection();
      pc.send = sendSignalingMessage(from);

      const h = () => {
        if (pc.connectionState == 'connected') {
          resolveConnected(pc);
          pc.removeEventListener('connectionstatechange', h);
        }
      };

      pc.addEventListener('connectionstatechange', h);

      return pc;
    };

    let pc;
    hub.on("connected", ({from}) => {

      if (!from || from == hub.connectionId) {
        return;
      }

      // initiator
      pc = initPeerConnection(from);
      pc.createSignalingDataChannel();

    });

    hub.on('message', async ({from, sessionDescription}) => {

      if (sessionDescription.type == 'offer') {
        // receiver
        pc = initPeerConnection(from);
      }

      pc.setRemoteDescription(sessionDescription);

    });

    return connected;
  })(hub, sendToHub);

  await hub.start();
  console.log("hub connected", hub.connectionId);

  // broadcast
  await sendToHub({
    Target: "connected",
    Arguments: [{
      from: hub.connectionId
    }]
  });

  const pc = await connected;
  app.peerConnectionState = pc.connectionState;
  await Vue.nextTick();

  // get mediastream
  const v = document.createElement("video");
  v.muted = true;
  v.autoplay = true;
  v.height = 300;
  v.width = 300;
  v.loop = true;
  v.src = "video.mp4";

  document.body.appendChild(v);
  // v.load() ???

  console.log("!!!");
  //await v.play();



  let stream;
  v.oncanplay = () => {
    stream = v.captureStream();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    console.log("addTrack");
    v.oncanplay = null;
  };
  if(v.readyState >= 3) {
    stream = v.captureStream();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    console.log("addTrack");
    v.oncanplay = null;
  }
  
})();

