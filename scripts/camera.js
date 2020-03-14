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
  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  } else {
    resolve({
      streamActivate: document.getElementById("button_stream"),
      videoMute: document.getElementById("button_videoTrack"),
      audioMute: document.getElementById("button_audioTrack"),
      previewShow: document.getElementById("button_preview"),
      connect: document.getElementById("button_connection"),
      video: document.getElementById("video"),
      connection: document.getElementById("connection")
    });
    return;
  }
});


let _spawnResolve;
let _spawned = new Promise(resolve => {
  _spawnResolve = resolve;
});
async function* spawnStream() {
  while (true){
    const o = await _spawned;
    _spawned = new Promise(resolve => {
      _spawnResolve = resolve;
    });
    yield await o;
  }
}

(async () => {

  let stream = new MediaStream();
  let pc;

  const view = await contentLoaded;

  // fire and forget
  (async () => {
    for await (const s of spawnStream()) {
      stream.getTracks().forEach(t => t.stop());
      stream = s;
    }
  })();

  view.streamActivate.addEventListener("click", async ({currentTarget:e})=>{
    if (stream && stream.active) {
      stream.getTracks().forEach(t => t.stop());
    } else {
      const s = await navigator.mediaDevices.getUserMedia(defaultUserMediaConstraints);
      await new Promise(r => setTimeout(r, 1000));
      s.getVideoTracks()[0].applyConstraints(defaultVideoTrackConstraints);
      _spawnResolve(s);
    }
  });

})();


const viewerConnected = (async () => {
  const auth = ($dbg.auth = await auth0);

  console.log("login", await auth.getIdTokenClaims().then(x => x.name));

  const { hub, send: sendToHub } = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });

  const connected = new Promise(resolve => {
    hub.on("offer", async ({ from, sessionDescription }) => {
      const pc = ($dbg.pc = new LANPeerConnection());

      const onConnected = () => {
        if (pc.connectionState == "connected") {
          pc.removeEventListener("connectionstatechange", onConnected);
          resolve(pc);
        }
      };
      pc.addEventListener("connectionstatechange", onConnected);

      pc.send = sdp => {
        return sendToHub({
          Target: "answer",
          Arguments: [
            {
              from: hub.connectionId,
              sessionDescription: sdp
            }
          ],
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

(async()=>{
  await contentLoaded;

})();

// main
(async () => {
  const stream = ($dbg.stream = await navigator.mediaDevices.getUserMedia(
    defaultUserMediaConstraints
  ));

  // https://crbug.com/711524
  await new Promise(r => setTimeout(r, 1000));

  await stream
    .getVideoTracks()[0]
    .applyConstraints(defaultVideoTrackConstraints);

  window.addEventListener("hashchange", async e => {
    console.log("hashchanged", p);
    await stream.getVideoTracks()[0].applyConstraints(p);
  });

  await contentLoaded;

  const elem = {
    video: document.getElementById("video")
  };

  elem.video.addEventListener("loadedmetadata", () => {
    const s = `width:${elem.video.videoWidth}, height:${elem.video.videoHeight}`;
    console.log(s);
  });

  elem.video.srcObject = stream;
  const viewer = await viewerConnected;

  // peerconnection connectedの直後にaddTransceiverしてもnegotiationneededが発火しないから1秒待つ
  await new Promise(r => setTimeout(r, 1000));

  stream
    .getTracks()
    .forEach(track =>
      viewer.addTransceiver(track, { stream, direction: "sendonly" })
    );
});
