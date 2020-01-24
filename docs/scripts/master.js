import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.esm.browser.js';

import {LANPeerConnection} from './lanpeerconnection.js'
import {buildHubConnection} from './hubconnection.js'

import auth_config  from './auth_config.js'

// createAuth0Client from auth0 sdk
const loggedIn = (async ()=>{

  const url = new URL(window.location);
  
  const config = auth_config;

  const auth = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: url.origin + url.pathname
  });

  if (
    ["code", "state"].every(Array.prototype.includes, [...url.searchParams.keys()])
  ) {
    await auth.handleRedirectCallback();
    window.history.replaceState({}, document.title, location.pathname);
  } 

  if (! await auth.isAuthenticated()) {
    await auth.loginWithRedirect();
    // sso session があったら待ち時間がある
    await new Promise(resolve => {setTimeout(resolve, 1000 * 60)});
    throw "auth0 loginWithRedirect TIMEOUT";
    return;
  }

  return auth;

})();

const mediaController =  {
  data() {
    return { useCamera: true};
  },
  methods: {

    async startVideo() {
      console.log("start video");
    }
  },
  template: "#media-controller"};



const remoteViewer = {

  template: "#remote-viewer"

};
  
const vueMounted = new Promise(resolve => {
  new Vue({
    components: {
      "media-controller": mediaController,
      "remote-viewer": remoteViewer
    },
    el: "#app",
    data: {
      userName: null,
      peerConnectionState: "...",
      viewers: [],
    },
    mounted: function() {
      resolve(this);
    },
    methods: {
    }
  });
});


// main
(async () => {

  const [auth, app] = await Promise.all([loggedIn, vueMounted]);

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

  await new Promise(resolve => setTimeout(resolve, 0));

  const stream = await getDummyVideo();

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  
})();


async function getUserMedia() {
  
  const constraints = {
    video: {
      facingMode: "user",
      aspectRatio: 1
    }
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
  
};

async function getDummyMediai() {

  const v = document.createElement("video");
  v.loop = true;
  v.src = "video.mp4";
  await v.play();

  return await new Promise(resolve => {
    v.oncanplay = () => {
      v.oncanplay = null;
      resolve(v.captureStream());
    };

    if(v.readyState >= 3) {
      v.oncanplay = null;
      resolve(v.captureStream());
    }
  });

};


