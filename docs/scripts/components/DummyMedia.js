const template = `
<div>

</div>
`;

export default {
  template,
  props: ["bus", "enabled"],
  data() {
    return {
      ready: true,
      mediaElement: document.createElement("video"),
    };
  },
  methods: {
    async start() {
      if (!this.enabled) {
        return;
      }
      const e = this.mediaElement;

      await e.play();
      const stream = await new Promise(resolve => {
        e.oncanplay = () => {
          e.oncanplay = null;
          resolve(e.captureStream()); 
        };
        
        if(e.readyState >= 3) {
          e.oncanplay = null;
          resolve(e.captureStream());
        }
      });  
      
      this.$emit("start-media", stream)
    }
  },
  created() {
    this.bus.$on("start", this.start);

    this.mediaElement.loop = true;
    this.mediaElement.src = "video.mp4";
    // captureStreamのmutedではない、playerのmuted
    this.mediaElement.muted = true;
  }
}

