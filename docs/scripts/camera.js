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


  const connected = ((app, hub, sendToHub)=> {

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

      pc.addEventListener('connectionstatechange', () => {
        app.peerConnectionState = pc.connectionState;
      });
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
  })(app, hub, sendToHub);

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



})();

