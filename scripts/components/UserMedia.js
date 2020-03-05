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
          width: 300,
          aspectRatio: 1,
          frameRate: 30,
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      $dbg = stream;

      this.$emit("start-media", stream);
    }
  },
  created() {
    this.bus.$on("start", this.start);
  }
};
