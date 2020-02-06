const template = `
<div style="font-family:monospace;font-size:smaller;">
  {{id}}: {{connectionState}}
</div>
`

export default {
  template,
  props: ['id', 'pc', 'stream'],
  data() {
    return {
      connectionState: ""
    };
  },
  watch: {
    pc: {
      immediate: true,
      handler(c, oldVal) {
        this.connectionState = c.connectionState;

        c.onconnectionstatechange = () => {
          this.connectionState = c.connectionState;
        };

        const h = () => {
          if (c.connectionState == 'connected') {
            const stream = this.stream.clone();
            stream.getTracks().forEach(t => c.addTrack(t, stream));
            c.removeEventListener('connectionstatechange', h);
          }
      
        };
        c.addEventListener('connectionstatechange', h);
        h();
      }
    }
  }
};

