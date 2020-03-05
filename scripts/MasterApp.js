const template = `
<div id="app" v-cloak>
  <hub-connection v-on:receive-offer="onReceiveOffer"></hub-connection>

  <h2>Remote Viewers</h2>
  <template v-for="item of remoteViewerList">
    <hr v-if="item.separator" />
    <remote-viewer v-else v-bind="item" v-bind:stream="mediaStream"></remote-viewer>
  </template>
  
  <h2>Media Controller</h2>
  <media-controller v-bind="mediaStream" v-on:set-media-stream="onSetMediaStream"></media-controller>
  <hr/>
  <h2>Track Controllers</h2>
  <track-controller 
    v-for="track in tracks"
    v-bind:key="track.id"
    v-bind="track"
    v-on:apply="onApplyTrackConstraints"
    v-on:stop="onStopTrack"
    v-on:set-enabled="onSetTrackEnabled"
    ></track-controller>
  <hr/>
  <h2>Local Viewer</h2>
  <local-viewer v-bind:stream="mediaStream"></local-viewer>
</div>
`;

import Vue from "./vue.js";
import MediaController from "./components/MediaController.js";
import LocalViewer from "./components/LocalViewer.js";
import HubConnection from "./components/HubConnection.js";
import RemoteViewer from "./components/RemoteViewer.js";
import TrackController from "./components/TrackController.js";

export default {
  template,
  components: {
    HubConnection,
    RemoteViewer,
    MediaController,
    LocalViewer,
    TrackController
  },
  data() {
    return {
      remoteViewers: [],
      mediaStream: new MediaStream(),
      touch: {}
    };
  },
  computed: {
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
      if (!this.remoteViewers.some(x => x.id == remote.id)) {
        this.remoteViewers.push(remote);
      }
    },
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
      }
    }
  }
};
