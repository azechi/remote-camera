const template = `
<div id="app" v-cloak>
  <hub-connection v-on:receive-offer="onReceiveOffer"></hub-connection>
  
  <h2>Remote Peers</h2>
  <template v-for="item of remoteViewerList">
    <hr v-if="item.separator" />
    <remote-viewer v-else 
      v-bind="item" 
      v-bind:stream="mediaStream"
      v-on:connected="onPeerConnected"
      ></remote-viewer>
  </template>
  
  <h2>Media Controller</h2>
  <media-controller v-bind="mediaStream" v-on:set-media-stream="onSetMediaStream"></media-controller>
  <track-controller 
    v-for="track in tracks"
    v-bind:key="track.id"
    v-bind="track"
    v-on:apply="onApplyTrackConstraints"
    v-on:stop="onStopTrack"
    v-on:set-enabled="onSetTrackEnabled"
    ></track-controller>
  <hr/>
  <div>
    <video controls autoplay :srcObject.prop="activeStream"></video>
  </div>
</div>
`;

import Vue from "./vue.js";
import HubConnection from "./components/HubConnection.js";
import RemoteViewer from "./components/RemoteViewer.js";
import MediaController from "./components/MediaController.js";
import TrackController from "./components/TrackController.js";

export default {
  template,
  components: {
    HubConnection,
    RemoteViewer,
    MediaController,
    TrackController
  },
  data() {
    return {
      remoteViewers: [],
      mediaStream: new MediaStream(),
      touch: {}
    };
  },
  created() {
    $dbg = this; 
  },
  computed: {
    activeStream() {
      this.touch;
      return this.mediaStream.active ? this.mediaStream: null; 
    },
    tracks() {
      this.touch;
      return this.mediaStream.getTracks();
    },
    remoteViewerList() {
      return this.remoteViewers.flatMap((v, i) =>
        i ? [{ separator: true }, v] : v
      );
    }
  },
  methods: {
    updateTracks() {
      this.touch = {};
    },
    onApplyTrackConstraints: function(id, constraints) {
      this.mediaStream.getTrackById(id).applyConstraints(constraints);
      this.updateTracks();
    },
    onSetMediaStream: function(mediaStream) {
      this.mediaStream = mediaStream;
    },
    onReceiveOffer: function(remote) {
      /* remote {id, pc} */
      if (!this.remoteViewers.some(x => x.id == remote.id)) {
        this.remoteViewers.push(remote);
      }
    },
    onPeerConnected: function(id, pc) {
      this.mediaStream.getTracks().forEach(t => pc.addTrack(t, this.mediaStream));
      pc.addEventListener('negotiationneeded', () => {console.log(pc)});
    }
    ,
    onStopTrack(id) {
      this.mediaStream.getTrackById(id).stop();
      this.updateTracks();
    },
    onSetTrackEnabled(id) {
      const track = this.mediaStream.getTrackById(id);
      track.enabled = !track.enabled;
      this.updateTracks();
    }
  },
  watch: {
    mediaStream: {
      handler(stream, oldValue) {

        oldValue.getTracks().forEach(track => track.stop());
        this.remoteViewers.forEach(({pc}) => pc.getSenders().forEach(sender => pc.removeTrack(sender)));
        stream.getTracks().forEach(track => this.remoteViewers.forEach(({pc})=> pc.addTrack(track, stream)));

      }
    }
  }
};
