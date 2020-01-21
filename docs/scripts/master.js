import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.esm.browser.js';

import {LANPeerConnection} from './lanpeerconnection.js'
import {auth0} from './login.js'
import {buildHubConnection} from './hubconnection.js'


const app = new Vue({
  el: "#app",
  data: {
    userName: "...",
    peerConnectionState: "",

    useCamera: true
  },
  methods: {
    async startVideo() {

    }
  }

});

(async () => {

  const auth = await auth0.loggedIn;

  app.userName = await auth.getIdTokenClaims().then(x => x.name);
  
  const {hub, send: sendToHub} = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });

  const connected = new Promise(resolve => {
    hub.on('offer', ({from, sessionDescription}) => {

      const sendSignalingMessage = to => {
      };

      const pc = new LANPeerConnection();
      pc.send = async sessionDescription => {
        await sendToHub({
          Target: 'answer',
          Arguments: [{
            from: hub.connectionId,
            sessionDescription: sessionDescription,
          }],
          ConnectionId: from
        });
      };

      const h = () => {
        if (pc.connectionState == 'connected') {
          resolve(pc);
          pc.removeEventListener('connectionstatechange', h);
        }
      };

      pc.addEventListener('connectionstatechange', h);
      pc.setRemoteDescription(sessionDescription);

    });

  });

  await hub.start();
  console.log("hub connected", hub.connectionId);

  const pc = await connected;
  app.peerConnectionState = pc.connectionState;
  await Vue.nextTick();

  const v = document.createElement("video");
  v.height = 300;
  v.width = 300;
  v.loop = true;
  v.src = "video.mp4";

  //document.body.appendChild(v);
  // v.load() ???

  console.log("!!!");
  await v.play();



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

  await new Promise(resolve => setTimeout(resolve, 0));
/*
  const constraints = {
    video: {
      facingMode: "user",
      aspectRatio: 1
    }
  };
*/
 // const stream = await navigator.mediaDevices.getUserMedia(constraints);
 // stream.getTracks().forEach(t => pc.addTrack(t, stream));

  
  
  /*

  // get mediastream
  */
  
})();

