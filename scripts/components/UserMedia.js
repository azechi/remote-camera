const template = `
<div>
</div>
`;

export default {
  template,
  props: ["bus", "enabled"],
  data() {
    return {
      width: 300,
      height: 300,
      audio: true,
      facingMode: "user",
      frameRate: 15
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
          facingMode: this.facingMode,
          width: this.width,
          height: this.height,
          frameRate: this.frameRate
        },
        audio: this.audio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.$emit("start-media", stream);
    }
  },
  created() {
    this.bus.$on("start", this.start);
  }
};
