import { LANPeerConnection } from "./lanpeerconnection.js";
import { buildHubConnection } from "./hubconnection.js";

import { getRefreshToken, getIdToken } from "./viewer_login.js";

const key = "Refresh Token";
const storage = window.localStorage;
let rt = storage.getItem(key);

const contentLoaded = new Promise(resolve => {
  if (document.readyState == "loading") {
    document.addEventListener("domcontentloaded", resolve);
  } else {
    resolve();
  }
});

const { display, clear } = (() => {
  const a = document.createElement("a");

  return {
    display: code => {
      a.href = code.verification_uri_complete;
      a.text = code.verification_uri_complete;
      document.getElementById("display").appendChild(a);
    },
    clear: () => a.remove()
  };
})();

(async () => {
  if (!rt) {
    rt = await getRefreshToken(code => contentLoaded.then(() => display(code)));
    clear();
    storage.setItem(key, rt);
  }

  const idToken = await getIdToken(rt);

  const { hub, send: sendToHub } = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => idToken
  });

  await contentLoaded;

  const stream = new MediaStream();
  document.getElementById("video").srcObject = stream;

  const connected = new Promise(resolve => {
    const pc = new LANPeerConnection();

    pc.ontrack = e => {
      const track = e.track;
      stream.addTrack(track);
    };

    let flg = false;

    pc.send = async sessionDescription => {
      // polling
      while (!flg) {
        // broadcast
        await sendToHub({
          Target: "offer",
          Arguments: [
            {
              from: hub.connectionId,
              sessionDescription: sessionDescription
            }
          ]
        });
        await new Promise(r => setTimeout(r, 2000));
      }
    };

    const h = () => {
      if (pc.connectionState == "connected") {
        resolve(pc);
        pc.removeEventListener("connectionstatechange", h);
      }
    };

    pc.addEventListener("connectionstatechange", h);

    hub.on("offer", () => {
      /* noop */
    });

    hub.on("answer", async ({ from, sessionDescription }) => {
      flg = true;
      pc.setRemoteDescription(sessionDescription);
    });

    hub.start().then(() => {
      pc.createSignalingDataChannel();
    });
  });

  const pc = ($dbg.pc = await connected);

  hub.stop();
})();
