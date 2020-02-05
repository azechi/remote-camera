const template = `
<div>
  <stream-status v-if="stream" v-bind:stream="stream"></stream-status>
  <video ref="video" style="width:200px" controls loop></video>
</div>
`

import streamStatus from './streamStatus.js';

export default {
  template,
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
  }
};
