let toGetUserMediaConstraints = {
  video: true
};

let videoTrackConstraints = {
  width: 5000,
};

const elem = {
  button: document.getElementById("button"),
  pre: document.getElementById("pre"),
  video: document.getElementById("video")
};


elem.button.addEventListener("click", onClick);
elem.video.addEventListener("loadedmetadata", () => {
  const s = `width:${elem.video.videoWidth}, height:${elem.video.videoHeight}`;
  elem.pre.textContent = s;
});

async function onClick() {
  const stream = await navigator.mediaDevices.getUserMedia(
    toGetUserMediaConstraints
  );

  // https://crbug.com/711524
  await new Promise(r => setTimeout(r, 1000));

  await stream.getVideoTracks()[0].applyConstraints(videoTrackConstraints);

  video.srcObject = stream;
}
