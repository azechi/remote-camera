let auth0 = null;
let connection = null;
let hub_info = null;

let sendMessageAsync = null;


const log = s => {
  const p = document.createElement("p");
  p.innerText = s;
  document.body.appendChild(p);
};


class LANPeerConnection extends RTCPeerConnection {
  constructor(...args) {
    super(...args);
    this.__proto__ = LANPeerConnection.prototype; //ios safari workaround https://bugs.webkit.org/show_bug.cgi?id=172867

    this.send = async () => {};

    // is triggered by createDataChannel and addTrack call
    this.addEventListener('negotiationneeded', async () => {
      const o = await this.createOffer();
      await this.setLocalDescription(o);
    });

    // is triggered by setRemoteDescription call
    this.addEventListener('signalingstatechange', async () => {

      if (this.signalingState == 'have-remote-offer') {
        const o = await this.createAnswer();
        await this.setLocalDescription(o);

        await this.send(await this.getLocalDescription());
        return
      }

      if (this.signalingState == 'have-local-offer'){
        await this.send(await this.getLocalDescription());
        return;
      }

    });

    // connected
    this.addEventListener('datachannel', ({channel}) => {
      if (channel.label == 'signaling') {
        channel.onopen = this._signalingDataChannelOpenHandler;
      }
    });
  }

  _signalingDataChannelOpenHandler({target}) {
     log("datachannel opened");
    console.log(target);

    this.send = async desc => {
      target.send(JSON.stringify(desc));
    }

    target.onmessage = ({data}) => {
      const o = JSON.parse(data);
      this.setRemoteDescription(o);
    };
  }


  createSignalingDataChannel() {
    const ch = this.createDataChannel('signaling');
    ch.onopen = this._signalingDataChannelOpenHandler;
  }

  getLocalDescription() {
    if (this.iceGatheringState == 'complete') {
      return Promise.resolve(this.localDescription);
    }

    return new Promise((resolve, _) => {
      const h = () => {
        if (this.iceGatheringState == 'complete') {
          this.removeEventListener('icegatheringstatechange', h);
          return resolve(this.localDescription);
        }
      };

      this.addEventListener('icegatheringstatechange', h);
    });
  }

}


const initPeerConnection = id => {
  const o = new LANPeerConnection();

  //log(`new [${id}]`);
  o.addEventListener('connectionstatechange', () =>{
    log(`connection state "${o.connectionState}" [${id}]`)
  });

  o.addEventListener('signalingstatechange', () => {
    log(`signaling state "${o.signalingState}" [${id}]`);
  });

  o.addEventListener('negotiationneeded', () => {
    log(`negotiation needed [${id}]`);
  });

  return o;
};


const getPeerConnection = (function(init) {

  let map = new Map();

  return key => {

    return map.get(key) 
      || (() => {
        const o = init(key);
        map.set(key, o);
        return o;
      })();
  
  };

})(initPeerConnection);


window.onload = async () => {
  const url = new URL(window.location);

  const config = await fetch("../auth_config.json").then(res => res.json());
  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: url.origin + url.pathname
  });

  if (
    !["code", "state"].every(Array.prototype.includes, [
      ...url.searchParams.keys()
    ])
  ) {
    console.log("くるくる");
    // sso session があったら待ち時間がある
    await auth0.loginWithRedirect();
    return;
  }

  await auth0.handleRedirectCallback();
  window.history.replaceState({}, document.title, location.pathname);

  //console.log(await auth0.getIdTokenClaims().then(x => x.__raw));
 
  // hub negotiate
  hub_info = await fetch("https://p1-azechify.azure-api.net/negotiate",{
    mode: "cors",
    method: "POST",
    headers: {
      "Authorization" : "bearer " + await auth0.getIdTokenClaims().then(x => x.__raw)
    }
  }).then(r => r.json());

  sendMessageAsync = async msg => {
    const id_token = await auth0.getIdTokenClaims().then(x => x.__raw);
    await fetch("https://p1-azechify.azure-api.net/messages", {
      mode: "cors",
      credentials: "include",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": "bearer " + id_token
      },
      body: JSON.stringify(msg)})
      .then(r => r.blob());
  };

  // signaling
  connection = new signalR.HubConnectionBuilder()
    .withUrl(hub_info.url, {
      accessTokenFactory: () => hub_info.accessToken
    })
    //.configureLogging(signalR.LogLevel.Information)
    .build();

  sendSignalingMessage = to => {

    return async sessionDescription => {
      console.log(`from [${connection.connectionId}]`,`to [${to}]`,sessionDescription);
      await sendMessageAsync({
        Target: 'message',
        Arguments: [{
          from: connection.connectionId,
          sessionDescription: sessionDescription
        }],
        ConnectionId: to
      });
    };

  };
  

  connection.on("connected", async ({from}) => {
    if (from && from != connection.connectionId) {

      const pc = getPeerConnection(from);
      pc.send = sendSignalingMessage(from);
      pc.createSignalingDataChannel();

    }
  });

  connection.on('message', async ({from, sessionDescription}) => {
    
    const pc = getPeerConnection(from);

    if (sessionDescription.type == 'offer') {
      pc.send = sendSignalingMessage(from);
    }
   
    pc.setRemoteDescription(sessionDescription);

  });

  await connection.start()

  // broadcast
  await sendMessageAsync({
    Target: "connected",
    Arguments: [{
      from: connection.connectionId
    }]
  });

};
