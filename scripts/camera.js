import auth0 from "./login.js";
import { LANPeerConnection } from "./lanpeerconnection.js";
import { buildHubConnection } from "./hubconnection.js";

async function loop(context, handlers, initialLabel) {
  const listen = async function* () {
    let resolve;

    function emit(...args) {
      resolve(...args);
    }

    yield [initialLabel, context, emit];
    while (true) {
      yield [await new Promise((rslv) => (resolve = rslv)), context];
    }
  };

  const _handlers = new Map(handlers);

  for await (const [label, context, emit] of listen()) {
    if (!_handlers.has(label)) {
      throw `"${label}" handler not found`;
    }
    await _handlers.get(label)(context, emit);
  }
}

const contentLoaded = new Promise((resolve) => {
  const f = () => {
    resolve({
      document: {
        getElementById: document.getElementById.bind(document),
      },
      mediaDevices: {
        getUserMedia: navigator.mediaDevices.getUserMedia.bind(
          navigator.mediaDevices
        ),
      },
    });
  };

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", f, { once: true });
  } else {
    f();
  }
});

const data = (() => {
  let _pc = new RTCPeerConnection();
  let _stream = new MediaStream();

  return {
    get pc() {
      return _pc;
    },
    set pc(val) {
      _pc = val;
      new Promise((r) => setTimeout(r, 1000)).then((_) => {
        _stream.getTracks().forEach((track) => {
          console.log(track);
          _pc.addTransceiver(track, { stream: _stream, direction: "sendonly" });
        });
      });
    },
    get stream() {
      return _stream;
    },
    set stream(val) {
      _stream = val;
      _pc.getSenders().forEach((sender) => {
        const track = _stream
          .getTracks()
          .find((track) => track.kind == sender.track.kind);
        sender.replaceTrack(track);
      });
    },
  };
})();

/* connection */
(async () => {
  const { document } = await contentLoaded;

  const context = (() => {
    const button = document.getElementById("button_connection");
    const connectionStatus = document.getElementById("connection");
    return {
      button,
      writeStatus: (text) => {
        connectionStatus.textContent = text;
      },
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

  const connectHandler = (ctx) => {
    /* 接続を開始する */
    ctx.writeStatus("connecting");
    ctx.button.disabled = false;
    ctx.button.dataset.command = "disconnect";
    ctx.button.textContent = "disconnect";

    /* fire and forget */
    /* キャンセル可能にする必要がある */
    viewerConnected(
      () => ctx.writeStatus("pending"),
      () => ctx.writeStatus("connected")
    ).then((pc) => (data.pc = pc));
  };

  const disconnectHandler = (ctx) => {
    ctx.writeStatus("disconnected");
    ctx.button.disabled = false;
    ctx.button.dataset.command = "connect";
    ctx.button.textContent = "connect";

    data.pc = null;
  };

  loop(
    context,
    [
      ["initialize", initializeHandler],
      ["connect", connectHandler],
      ["disconnect", disconnectHandler],
    ],
    "initialize"
  );
})();

const defaultUserMediaConstraints = {
  video: true,
  audio: true,
};

const defaultVideoTrackConstraints = {
  frameRate: 15,
  aspectRatio: 1,
  width: 300,
};

/* user media */
(async () => {
  const { document, mediaDevices } = await contentLoaded;

  const context = {
    btn_start: document.getElementById("button_stream"),
    btn_videoMute: document.getElementById("button_videoTrack"),
    btn_audioMute: document.getElementById("button_audioTrack"),
    btn_show: document.getElementById("button_preview"),
    video: document.getElementById("video"),
    get stream() {
      return data.stream;
    },
    set stream(val) {
      data.stream = val;
      this.video.srcObject = !(this.video.dataset.alt == "true") ? val : null;
    },
  };

  const init = (ctx, emit) => {
    ctx.btn_start.addEventListener("click", ({ currentTarget: e }) => {
      e.disabled = true;
      emit(e.dataset.alt == "true" ? "stop" : "start");
    });

    ctx.btn_videoMute.disabled = true;
    ctx.btn_videoMute.addEventListener("click", ({ currentTarget: e }) => {
      const track = ctx.stream.getVideoTracks()[0];
      e.dataset.alt = !(track.enabled = !track.enabled);
    });

    ctx.btn_audioMute.disabled = true;
    ctx.btn_audioMute.addEventListener("click", ({ currentTarget: e }) => {
      const track = ctx.stream.getAudioTracks()[0];
      e.dataset.alt = !(track.enabled = !track.enabled);
    });

    ctx.btn_show.addEventListener("click", ({ currentTarget: e }) => {
      const visible = !(e.dataset.alt == "true");
      e.dataset.alt = visible;
      ctx.video.style.display = visible ? "initial" : "none";
      ctx.video.srcObject = visible ? ctx.stream : null;
    });
  };

  const start = async (ctx, emit) => {
    const ori_stream = await mediaDevices.getUserMedia(defaultUserMediaConstraints);
    
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(ori_stream);
    const filter = audioCtx.createBiquadFilter();
    const dest = audioCtx.createMediaStreamDestination();
    const stream = dest.stream;
    ori_stream.getVideoTracks().forEach(t => stream.addTrack(t));

    src.connect(filter);
    filter.connect(dest);
    filter.frequency.value = 800;


    await new Promise((r) => setTimeout(r, 1000));
    await stream
      .getVideoTracks()[0]
      .applyConstraints(defaultVideoTrackConstraints);
    ctx.stream = dest.stream;
    ctx.btn_start.dataset.alt = true;
    ctx.btn_start.disabled = false;

    ctx.btn_videoMute.dataset.alt = false;
    ctx.btn_videoMute.disabled = false;
    ctx.btn_audioMute.dataset.alt = false;
    ctx.btn_audioMute.disabled = false;
  };

  const stop = (ctx) => {
    ctx.stream.getTracks().forEach((track) => track.stop());
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
      ["stop", stop],
    ],
    "init"
  );
})();

const viewerConnected = async (
  hubConnectedCallback,
  viewerConnectedCallback
) => {
  const auth = ($dbg.auth = await auth0);

  const { hub, send: sendToHub } = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then((x) => x.__raw),
  });

  const connected = new Promise((resolve) => {
    hub.on("offer", async ({ from, sessionDescription }) => {
      const pc = ($dbg.pc = new LANPeerConnection());

      const onConnected = () => {
        if (pc.connectionState == "connected") {
          pc.removeEventListener("connectionstatechange", onConnected);
          viewerConnectedCallback();
          resolve(pc);
        }
      };
      pc.addEventListener("connectionstatechange", onConnected);

      pc.send = (sdp) => {
        return sendToHub({
          Target: "answer",
          Arguments: [
            {
              from: hub.connectionId,
              sessionDescription: sdp,
            },
          ],
          ConnectionId: from,
        });
      };

      await pc.setRemoteDescription(sessionDescription);
    });
  });

  await hub.start();
  hubConnectedCallback();
  return connected;
};
