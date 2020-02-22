import {LANPeerConnection} from './lanpeerconnection.js'
import {buildHubConnection} from './hubconnection.js'

const stream = new MediaStream();
let message;
let p_status;

window.onload = () => {
  document.getElementById("video").srcObject = stream;
  message = document.getElementById("message");
  p_status = document.getElementById("status");
};

(async () => {
  // get idToken
  //device authorization flow
  // auth0
  const idToken = await getIdToken({
    baseUrl: "https://azechify.auth0.com/oauth/", 
    clientId: "18cBqG2qRvzXvxdGrMamVpVL3zB9b1tn",
    callback: (user_code, verification_uri, verification_uri_complete) => {
      console.log(user_code, verification_uri, verification_uri_complete);
      [user_code, verification_uri].forEach(s => {
        const p = document.createElement('p');
        p.innerText = s;
        // await document.load
        message.appendChild(p);
      });

      const a = document.createElement("a");
      a.href = verification_uri_complete;
      a.innerText = verification_uri_complete;
      message.appendChild(a);
    }
  });

  [...message.children].map(e=>e.remove());
  p_status.innerText = "hub connection ...";

  const {hub, send: sendToHub} = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => idToken
  });



  let flg = false;

  const connected = new Promise(resolve => {
    const pc = new LANPeerConnection();
    pc.send = async sessionDescription => {

      // polling
      while(!flg) {
        // broadcast
        await sendToHub({
          Target: 'offer',
          Arguments: [{
            from: hub.connectionId,
            sessionDescription: sessionDescription
          }]
        });
        p_status.innerText = "offerした";
        await new Promise(r => setTimeout(r, 2000));
      }

    };

    pc.ontrack = e => {
      stream.addTrack(e.track);
      p_status.innerText = "";
    };

    const h = () => {
      if (pc.connectionState == 'connected') {
        resolve(pc);
        pc.removeEventListener('connectionstatechange', h);
      }
    };

    pc.addEventListener('connectionstatechange', h);

    hub.on('offer', () => {/* noop */});

    hub.on('answer', async ({from, sessionDescription}) => {
      flg = true;
      p_status.innerText = "answer 来た";
      console.log("master id", from);
      pc.setRemoteDescription(sessionDescription);
    });
    
    hub.start().then(() => {
      p_status.innerText = "hub connected";  
      pc.createSignalingDataChannel();
    });
    
  });

  p_status.innerText = "hub connecting ...";
  const pc = await connected;
  p_status.innerText = "connected!"

  hub.stop();



  



})();




async function getIdToken({baseUrl, clientId, callback}) {

  let p = new URLSearchParams();
  p.set('client_id', clientId);
  p.set('scope', 'openid offline_access');
  //p.set('audience', audience);

  let data = await fetch(
    baseUrl + "device/code",
    {
      mode: 'cors',
      method: 'POST',
      body: p
    }
  ).then(res => res.json());

  // display 
  // data.user_code
  // data.verification_uri
  // data.verification_uri_complete: verification_uri + user_code
  // data.expires_in(seconds)
  callback(data.user_code, data.verification_uri, data.verification_uri_complete);

  // polling
  // {data.device_code, data.interval(seconds)}
  
  p = new URLSearchParams();
  p.set('client_id', clientId);
  p.set('device_code', data.device_code);
  p.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');

  while (true) {
    let response = await fetch(
      baseUrl + 'token',
      {
        mode: 'cors',
        method: 'POST',
        body: p
      }
    );

    if (response.ok) {
      return (await response.json()).id_token;
    }

    if (response.status == 403
      && (await response.json()).error == "authorization_pending") {
      await new Promise(resolve => setTimeout(resolve, data.interval * 1000));
      continue;
    }

    throw (await response.json());

  }

};
