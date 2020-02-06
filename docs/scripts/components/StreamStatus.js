const template = `
<div style="font-family:monospace;font-size:smaller">
  <div>stream id: {{stream.id}}</div>
  <div>
    <hr />
    <template v-for='track of trackList'>
      <hr v-if="track.separator" />
      <track-status v-else v-bind:key="track.id" v-bind="track" v-on:stop="onStopTrack" v-on:set-enabled="onSetTrackEnabled"></track-status>
    </template>
    <hr />
  </div>
</div>
`;

import TrackStatus from './TrackStatus.js';

export default {
  template,
  components: {
    TrackStatus
  },
  props: ['stream'],
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
};

