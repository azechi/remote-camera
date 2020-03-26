const template = `
<div style="font-family:monospace;font-size:smaller;">
  {{id}}: {{connectionState}}
  </div>
`;

export default {
  template,
  props: ["id", "pc", "stream"],
  data() {
    return {
      connectionState: "",
    };
  },
  watch: {
    pc: {
      immediate: true,
      async handler(c, oldVal) {
        this.connectionState = c.connectionState;

        c.onconnectionstatechange = () => {
          this.connectionState = c.connectionState;
        };

        //c.addEventListener('negotiationneeded', e => console.log(e));

        await new Promise((resolve) => {
          const h = () => {
            if (c.connectionState == "connected") {
              resolve();
              c.removeEventListener("connectionstatechange", h);
            }
          };
          c.addEventListener("connectionstatechange", h);
          h();
        });

        this.$emit("connected", this.id, c);
      },
    },
  },
};
