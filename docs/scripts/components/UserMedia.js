const template = `
<div>
</div>
`;

export default {
  template,
  props: ["bus", "enabled"],
  data() {
    return {
      ready: true
    };
  },
  methods: {
    async start() {
      if (!this.enabled) {
        return;
      }

      // getUserMedia(constraints); 
      const constraints = {
        video: {
          facingMode: "user",
          aspectRatio: 1
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.$emit("start-media", stream)
    }
  },
  created() {
    this.bus.$on("start", this.start);
  }

};
