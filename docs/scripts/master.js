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

const trackStatus = {
  template: "#track-status",
  props: ["id", "enabled", "readyState", "kind"],
  computed: {
    ended() {
      return this.readyState == "ended";
    }
  },
  methods: {
    toggleEnabled() {
      this.$emit('set-enabled', this.id);
    },
    stop() {
      this.$emit('stop', this.id); 
    }
  }
}

const streamStatus = {
  components: {
    "track-status": trackStatus
  },
  props: ['stream'],
  template: "#stream-status",
  data() {
    return {
      tracks: []
    };
  },
  computed: {
    trackList() {
      return this.tracks.flatMap((v,i)=>(i)?[{'separator':true}, v]:v);
    }
  },
  methods: {
    onStopTrack(id) {
      const track = this.stream.getTrackById(id);
      track.stop();
      this.tracks = this.stream.getTracks();
    },
    onSetTrackEnabled(id) {
      const track = this.stream.getTrackById(id);
      track.enabled = !track.enabled;
      this.tracks = this.stream.getTracks();
    }
  },
  watch: {
    stream: {
      immediate: true,
      handler: function(val, oldVal) {
        this.tracks = val.getTracks();
      }
    }
  }
}

const dummyMedia = {
  template: "#dummy-media",
  props: ["bus"],
  data() {
    return {
      ready: true,
      mediaElement: document.createElement("video"),
    };
  },
  methods: {
    async start() {
      const e = this.mediaElement;

      await e.play();
      const stream = await new Promise(resolve => {
        e.oncanplay = () => {
          e.oncanplay = null;
          resolve(e.captureStream()); 
        };
        
        if(e.readyState >= 3) {
          e.oncanplay = null;
          resolve(e.captureStream());
        }
      });  
      
      this.$emit("start-media", stream)
    }
  },
  created() {
    this.bus.$on("start", this.start);

    this.mediaElement.loop = true;
    this.mediaElement.src = "video.mp4";
    // captureStreamのmutedではない、playerのmuted
    this.mediaElement.muted = true;
  }
}


const mediaController =  {
  template: "#media-controller",
  components: {
    "dummy-media": dummyMedia
  },
  data() {
    return { 
      useCamera: true,
      bus: new Vue()
    };
  },
  methods: {
    startMedia() {
      this.bus.$emit('start');
    },
    onStartMedia(stream) {
      this.$emit('set-media-stream', stream);
    }
  }
};

const localViewer = {
  components: {
      "stream-status": streamStatus
  },
  props: ['stream'],
  watch: {
    stream: async function(val, oldVal) {
      
      const v = this.$refs.video;
      console.log(v, val);
      v.srcObject = val;
      //await v.play();
    }
  },

  template: "#local-viewer"
};

const remoteViewer = {
  props: ['stream'],
  data() {
    return {
    };
  },
  watch: {
    stream: function (val, oldVal) {
      console.log("mediaStream changed", val);
    }
  },
  template: "#remote-viewer"
};

const vueMounted = new Promise(resolve => {
  new Vue({
    components: {
      "media-controller": mediaController,
      "local-viewer": localViewer,
      "remote-viewer": remoteViewer,
    },
    el: "#app",
    data: {
      userName: null,
      peerConnectionState: "...",
      viewers: [{"id":"123", "name":"viewer1"}],
      mediaStream: undefined
    },
    mounted: function() {
      resolve(this);
    },
    methods: {
      onSetMediaStream: function (mediaStream) {
        this.mediaStream = mediaStream;
      }
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



