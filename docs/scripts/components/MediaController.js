const template = `
<div>
  <label><input type="radio" v-model="useCamera" value="false">サンプル映像</label>
  <div>
    <label><input type="radio" v-model="useCamera" value="true">カメラ</label>
    <dummy-media v-bind:bus="bus" v-on:start-media="onStartMedia"></dummy-media>
  </div>
  <button v-on:click="startMedia">start</button>
</div>
`

import Vue from '../vue.js';
import DummyMedia from './DummyMedia.js';

export default {
  template,
  components: {
    DummyMedia
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



async function getUserMedia() {
  
  const constraints = {
    video: {
      facingMode: "user",
      aspectRatio: 1
    }
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
  
};

