import auth0 from "./login.js";
import { LANPeerConnection } from "./lanpeerconnection.js";
import { buildHubConnection } from "./hubconnection.js";


const toGetUserMediaConstraints = {
  video: true,
  audio: true
};

const videoTrackConstraints = {
  frameRate: 15,
  aspectRatio: 1,
  width: 300
};

const contentLoaded = new Promise(resolve => {
  if(document.readyState == 'loading') {
    resolve();
    return;
  }
  document.addEventListener('DOMContentLoaded', resolve, {once:true});
});

const viewerConnected = (async () =>{
  const auth = $dbg.auth = await auth0;
  

  console.log("login", await auth.getIdTokenClaims().then(x => x.name));

  const { hub, send: sendToHub } = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });

  const connected = new Promise(resolve => {
    hub.on("offer", async({from, sessionDescription})=>{
      const pc = $dbg.pc = new LANPeerConnection();

      const onConnected = () => {
        if(pc.connectionState == "connected") {
          pc.removeEventListener("connectionstatechange", onConnected);
          resolve(pc);
        }
      };
      pc.addEventListener("connectionstatechange", onConnected)


      pc.send = sdp => {
        return sendToHub({
          Target: "answer",
          Arguments: [{
            from: hub.connectionId,
            sessionDescription: sdp
          }],
          ConnectionId: from
        });
      };

      await pc.setRemoteDescription(sessionDescription);
    });
  });  

  

  await hub.start();
  console.log(`hub connected [${hub.connectionId}]`);

  return connected;

})();

// main
(async () => {
  const stream = $dbg.stream = await navigator.mediaDevices.getUserMedia(
    toGetUserMediaConstraints
  );

  // https://crbug.com/711524
  new Promise(r => setTimeout(r, 1000));

  await stream.getVideoTracks()[0].applyConstraints(videoTrackConstraints);

  await contentLoaded;

  const elem = {
    button: document.getElementById("button"),
    pre: document.getElementById("pre"),
    video: document.getElementById("video")
  };

  elem.video.addEventListener("loadedmetadata", () => {
    const s = `width:${elem.video.videoWidth}, height:${elem.video.videoHeight}`;
    elem.pre.textContent = s;
  });

  elem.video.srcObject = stream;

  const viewer = await viewerConnected;
  console.log(`${viewer.signalingState} ${viewer.connectionState}`)

  await new Promise(r => setTimeout(r, 1000));
  console.log("connected");
  console.log(`${viewer.signalingState} ${viewer.connectionState}`)
  //stream.getTracks().forEach(track => viewer.addTrack(track, stream));

  stream.getTracks().forEach(track => viewer.addTransceiver(track, {stream, direction:"sendonly"}));


})();
