import auth0 from "./login.js";
import { LANPeerConnection } from "./lanpeerconnection.js";
import { buildHubConnection } from "./hubconnection.js";


const defaultUserMediaConstraints = {
  video: true,
  audio: true
};

const defaultVideoTrackConstraints = {
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
    defaultUserMediaConstraints
  );

  // https://crbug.com/711524
  await new Promise(r => setTimeout(r, 1000));

  await stream.getVideoTracks()[0].applyConstraints(defaultVideoTrackConstraints);
  
  window.addEventListener("hashchange", async e => {
    const p = JSON.parse(decodeURIComponent(new URL(e.newURL).hash.substring(1)));
    console.log("hashchanged", p);
    await stream.getVideoTracks()[0].applyConstraints(p);
  })
  
  await contentLoaded;

  const elem = {
    //button: document.getElementById("button"),
    pre: document.getElementById("pre"),
    video: document.getElementById("video")
  };

  elem.video.addEventListener("loadedmetadata", () => {
    const s = `width:${elem.video.videoWidth}, height:${elem.video.videoHeight}`;
    elem.pre.textContent = s;
  });

  elem.video.srcObject = stream;
  const viewer = await viewerConnected;

  // peerconnection connectedの直後にaddTransceiverしてもnegotiationneededが発火しないから1秒待つ
  await new Promise(r => setTimeout(r, 1000));

  stream.getTracks().forEach(track => viewer.addTransceiver(track, {stream, direction:"sendonly"}));

})();
