const template = `
<div>
</div>
`;

export default {
  template,
  props: ["bus"],
  data() {
    return {
      ready: true
    };
  },
  methods: {
    async start() {
      // getUserMedia(constraints); 
      const constraints = {
        video: {
          facingMode: "user",
          aspectRatio: 1
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.$emit("start-media", stream)
    }
  },
  created() {
    this.bus.$on("start", this.start);
  }

};
