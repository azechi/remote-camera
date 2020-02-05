const template = `
<div>

</div>
`

export default {
  template,
  props: ['stream'],
  data() {
    return {
    };
  },
  watch: {
    stream: function (val, oldVal) {
      console.log("mediaStream changed", val);
    }
  }
};

