import auth0 from "./login.js";
import { LANPeerConnection } from "./lanpeerconnection.js";
import { buildHubConnection } from "./hubconnection.js";

const contentLoaded = new Promise(resolve => {

  const f = () => {
    resolve({
      document: {
        getElementById: document.getElementById.bind(document)
      },
      mediaDevices: {
        getUserMedia: navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      }
    });
  };

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", f, { once: true });
  } else {
    f()
  }
});

const data = (() => {
  let connection = new RTCPeerConnection();
  let stream = new MediaStream();

  return {};
})();


async function loop(context, handlers, initialLabel) {
  const listen = async function*() {
    let resolve;

    function emit(...args) {
      resolve(...args);
    }

    yield [initialLabel, context, emit];
    while (true) {
      yield [await new Promise(rslv => (resolve = rslv)), context];
    }
  };

  const _handlers = new Map(handlers);

  for await (const [label, context, emit] of listen()) {
    if (!_handlers.has(label)) {
      throw `"${label}" handler not found`;
    }
    console.log(label);
    await _handlers.get(label)(context, emit);
  }
}

/* connection */
(async () => {
  const {document} = await contentLoaded;

  const context = (() => {
    const button = document.getElementById("button_connection");
    const connectionStatus = document.getElementById("connection");
    return {
      button,
      writeStatus: text => {
        connectionStatus.textContent = text;
      }
    };
  })();

  const initializeHandler = (ctx, emit) => {
    ctx.writeStatus("disconnected");
    ctx.button.disabled = false;
    ctx.button.dataset.command = "connect";
    ctx.button.textContent = "connect";
    ctx.button.addEventListener("click", ({ currentTarget: e }) => {
      e.disabled = true;
      emit(e.dataset.command);
    });
  };

  const connectHandler = ctx => {
    /* 接続を開始する */
    ctx.writeStatus("connecting");
    ctx.button.disabled = false;
    ctx.button.dataset.command = "disconnect";
    ctx.button.textContent = "disconnect";

    /* fire and forget */
    viewerConnected(() => ctx.writeStatus("pending")).then(pc => {
      ctx.writeStatus("connected");
      console.log("connected", pc);
    });
  };

  const disconnectHandler = ctx => {
    ctx.writeStatus("disconnected");
    ctx.button.disabled = false;
    ctx.button.dataset.command = "connect";
    ctx.button.textContent = "connect";
    /* 
    if (pc) {
      pc.disconnect();
    }
    */
  };

  loop(
    context,
    [
      ["initialize", initializeHandler],
      ["connect", connectHandler],
      ["disconnect", disconnectHandler]
    ],
    "initialize"
  );
})();

const defaultUserMediaConstraints = {
  video: true,
  audio: true
};

const defaultVideoTrackConstraints = {
  frameRate: 15,
  aspectRatio: 1,
  width: 300
};





/* user media */
(async ()=>{
  const {document, mediaDevices} = await contentLoaded;

  let _stream = new MediaStream();

  const context = {
    btn_start : document.getElementById("button_stream"),
    btn_videoMute : document.getElementById("button_videoTrack"),
    btn_audioMute : document.getElementById("button_audioTrack"),
    btn_show: document.getElementById("button_preview"),
    video: document.getElementById("video"),
    get stream() {
      return _stream;
    },
    set stream(val){
      _stream = val;
      this.video.srcObject = !(this.video.dataset.alt == 'true') ? val : null;
    }
  };

  const init = (ctx, emit) => {
    ctx.btn_start.addEventListener('click', ({currentTarget:e})=>{
      e.disabled = true;
      emit((e.dataset.alt == 'true')?'stop':'start');
    });

    ctx.btn_videoMute.disabled = true;
    ctx.btn_videoMute.addEventListener('click', ({currentTarget:e}) => {
      const track = ctx.stream.getVideoTracks()[0];
      e.dataset.alt = !(track.enabled = !track.enabled);
    });

    ctx.btn_audioMute.disabled = true;
    ctx.btn_audioMute.addEventListener('click', ({currentTarget:e}) => {
      const track = ctx.stream.getAudioTracks()[0];
      e.dataset.alt = !(track.enabled = !track.enabled);
    });

    ctx.btn_show.addEventListener('click', ({currentTarget:e}) => {
      const visible = !(e.dataset.alt == 'true');
      e.dataset.alt = visible;
      ctx.video.style.display = visible ? "initial" : "none";
      ctx.video.srcObject = visible ? ctx.stream : null;
    });
  }

  const start = async (ctx, emit) => {
    const stream = await mediaDevices.getUserMedia(defaultUserMediaConstraints);
    await new Promise(r => setTimeout(r, 1000));
    await stream.getVideoTracks()[0].applyConstraints(defaultVideoTrackConstraints);
    ctx.stream = stream;
    ctx.btn_start.dataset.alt = true;
    ctx.btn_start.disabled = false;

    ctx.btn_videoMute.dataset.alt = false;
    ctx.btn_videoMute.disabled = false;
    ctx.btn_audioMute.dataset.alt = false;
    ctx.btn_audioMute.disabled = false;
  };

  //stream.getTracks().forEach(t => t.stop());
  const stop = ctx => {
    ctx.stream.getTracks().forEach(track => track.stop());
    ctx.btn_start.dataset.alt = false;
    
    ctx.btn_start.disabled = false;
    ctx.btn_videoMute.disabled = true;
    ctx.btn_audioMute.disabled = true;
  };

  loop(
    context,
    [
      ["init", init],
      ["start", start],
      ["stop", stop]
    ],
    "init");

})();

/*
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
*/

const viewerConnected = async hubConnectedCallback => {
  const auth = ($dbg.auth = await auth0);

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
  hubConnectedCallback();
  return connected;
};

// main
async () => {
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
};
