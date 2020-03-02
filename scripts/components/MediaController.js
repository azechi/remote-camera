const template = `
<div>
  <label><input type="radio" v-model="useCamera" v-bind:value="false">サンプル映像</label>
  <div>
    <label><input type="radio" v-model="useCamera" v-bind:value="true">カメラ</label>
    <dummy-media v-bind:bus="bus" v-bind:enabled="!useCamera" v-on:start-media="onStartMedia"></dummy-media>
    <user-media v-bind:bus="bus" v-bind:enabled="useCamera" v-on:start-media="onStartMedia"></user-media>
  </div>
  <button v-on:click="startMedia">start</button>
  <template v-for='track of trackList'>
    <hr v-if="track.separator" />
    <track-status v-else v-bind:key="track.id" v-bind="track"
    v-on:stop="onStopTrack"
    v-on:set-enabled="onSetTrackEnabled">
    </track-status>
  </template>
</div>
`;

import Vue from "../vue.js";
import DummyMedia from "./DummyMedia.js";
import UserMedia from "./UserMedia.js";
import TrackStatus from "./TrackStatus.js";

export default {
  template,
  components: {
    DummyMedia,
    UserMedia,
    TrackStatus
  },
  data() {
    return {
      useCamera: true,
      bus: new Vue(),
      tracks: [],
    };
  },
  computed: {
    trackList() {
      return this.tracks.flatMap((v,i)=>(i?[{separator: true}, v]:v));
    }
  },
  methods: {
    onStopTrack(id) {
      console.log(id);
    },
    onSetTrackEnabled(id){
      console.log(id);
    },
    startMedia() {
      this.bus.$emit("start");
    },
    onStartMedia(stream) {
      this.tracks = stream.getTracks();
      this.$emit("set-media-stream", stream);
    }
  },
  watch: {
    tracks: {
      handler(n,o) {
        o.forEach(t => t.stop());
        console.log("videoTracks changing",n);
      }
    }
  }
};
