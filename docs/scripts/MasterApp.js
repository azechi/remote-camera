const template = `
<div id="app" v-cloak>
  <hub-connection v-on:receive-offer="onReceiveOffer"></hub-connection>

  <h2>Remote Viewers</h2>
  <template v-for="item of remoteViewerList">
    <hr v-if="item.separator" />
    <remote-viewer v-else v-bind="item" v-bind:stream="mediaStream"></remote-viewer>
  </template>
  
  <h2>Media Controller</h2>
  <media-controller v-bind:stream="mediaStream" v-on:set-media-stream="onSetMediaStream"></media-controller>
  <hr/>
  <h2>Local Viewer</h2>
  <local-viewer v-bind:stream="mediaStream"></local-viewer>
</div>
`

import Vue from './vue.js';
import MediaController from './components/MediaController.js';
import LocalViewer from './components/LocalViewer.js';
import HubConnection from './components/HubConnection.js';
import RemoteViewer from './components/RemoteViewer.js';

export default {
  template,
  components: {
    HubConnection,
    RemoteViewer,
    MediaController,
    LocalViewer,
  },
  data() {
    return {
      remoteViewers: [],
      mediaStream: undefined
    };
  },
  computed: {
    remoteViewerList() {
      return this.remoteViewers.flatMap((v,i)=> i? [{separator:true}, v]: v);
    },
  },
  methods: {
    onSetMediaStream: function (mediaStream) {
      this.mediaStream = mediaStream;
    },
    onReceiveOffer: function(remote) {
      if (!this.remoteViewers.some(x => x.id == remote.id)){
        this.remoteViewers.push(remote);
      }
    }
  }
};


