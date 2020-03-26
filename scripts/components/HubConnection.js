const template = `
<div>
  {{userName || "login ..."}}
  <hr/>
  {{state}}
</div>
`;

import auth0 from "../login.js";
import { LANPeerConnection } from "../lanpeerconnection.js";
import { buildHubConnection } from "../hubconnection.js";

const gen = async (vm) => {
  const auth = await auth0;

  vm.userName = await auth.getIdTokenClaims().then((x) => x.name);

  vm.state = "initialize";
  const { hub, send: sendToHub } = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then((x) => x.__raw),
  });

  vm.state = "hub connecting...";

  const connected = new Promise((resolve) => {
    hub.on("offer", async ({ from, sessionDescription }) => {
      const pc = new LANPeerConnection();
      pc.send = async (sessionDescription) => {
        await sendToHub({
          Target: "answer",
          Arguments: [
            {
              from: hub.connectionId,
              sessionDescription: sessionDescription,
            },
          ],
          ConnectionId: from,
        });
      };

      await pc.setRemoteDescription(sessionDescription);

      vm.$emit("receive-offer", { id: from, pc });
    });
  });

  await hub.start();
  vm.state = `hub connected [${hub.connectionId}]`;
};

export default {
  template,
  data() {
    return {
      userName: undefined,
      state: "",
    };
  },
  created() {
    gen(this);
  },
};
