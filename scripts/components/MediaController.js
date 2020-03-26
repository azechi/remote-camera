const template = `
<div>
  <div>
    <label><input type="radio" v-model="useCamera" v-bind:value="false">サンプル映像</label>
    <dummy-media v-bind:bus="bus" v-bind:enabled="!useCamera" v-on:start-media="onStartMedia"></dummy-media>
  </div>
  <div>
    <label><input type="radio" v-model="useCamera" v-bind:value="true">カメラ</label>
    <user-media v-bind:bus="bus" v-bind:enabled="useCamera" v-on:start-media="onStartMedia"></user-media>
  </div>
  <button v-on:click="startMedia">start</button>
  <div>
    active: {{active}} [{{id}}]
  </div>
</div>
`;

import Vue from "../vue.js";
import DummyMedia from "./DummyMedia.js";
import UserMedia from "./UserMedia.js";

export default {
  template,
  components: {
    DummyMedia,
    UserMedia,
  },
  props: ["active", "id"],
  data() {
    return {
      useCamera: false,
      bus: new Vue(),
    };
  },
  methods: {
    startMedia() {
      this.bus.$emit("start");
    },
    onStartMedia(stream) {
      this.$emit("set-media-stream", stream);
    },
  },
};
