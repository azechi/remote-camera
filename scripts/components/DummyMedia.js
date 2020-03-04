const template = `
<div>
  <p>
    w:{{width}} h:{{height}} aspect:{{width / height}}
  </p>
</div>
`;

function doneCanplay(elem) {
  return new Promise(resolve => {

    if(elem.readyState >= 3) {
      resolve();
      return;
    }

    elem.addEventListener('canplay', resolve, {once:true})
  });
}

export default {
  template,
  props: ["bus", "enabled"],
  data() {
    return {
      ready: true,
      mediaElement: document.createElement("video"),
      width:0,
      height:0,
      src: "video.mp4"
    };
  },
  methods: {
    async start() {
      if (!this.enabled) {
        return;
      }
      const elem = this.mediaElement;

      await elem.play();
      await doneCanplay(elem);
      const stream = await elem.captureStream();
      
      this.$emit("start-media", stream);
    }
  },
  created() {
    this.bus.$on("start", this.start);

    const elem = this.mediaElement;
    elem.loop = true;
    elem.onloadedmetadata = () => {
      this.width = elem.videoWidth;
      this.height = elem.videoHeight;
    };
    elem.src = this.src;
    // captureStreamのmutedではない、playerのmuted
    elem.muted = true;
  }
};
