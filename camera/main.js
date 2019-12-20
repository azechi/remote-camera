const video = document.getElementById("video");

const constraints = {
  video: {
    facingMode: "user",
    aspectRatio: 1
  }
};

;
(async ()=>{

  const ms = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = ms;
  let videoTrack = ms.getVideoTracks()[0];
  
  // https://bugs.chromium.org/p/chromium/issues/detail?id=711524
  let caps;
  while (true) {
    caps = videoTrack.getCapabilities();
    if(caps.zoom) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  app = new Vue({
    el: "#app",
    data: {
      zoom: 0,
      caps: caps,
    },
    mounted: function (){
      this.zoom = 151;
    },
    watch: {
      zoom: async function(n, o) {
        await videoTrack.applyConstraints({advanced:[{zoom: n}]});
      },
    },
  });
})();


