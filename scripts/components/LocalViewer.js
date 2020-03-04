const template = `
<div>
  <video ref="video" controls autoplay></video>
</div>
`;

export default {
  template,
  props: ["stream"],
  watch: {
    stream: async function(val, oldVal) {
      this.$refs.video.srcObject = (val.active)? val: null;
    }
  }
};
