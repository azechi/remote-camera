
import {LANPeerConnection} from './lanpeerconnection.js'
import {buildHubConnection} from './hubconnection.js'

(async () => {


// fetch (negotiate)
// 403 forbidden


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
      document.body.appendChild(p);
    });

    const a = document.createElement("a");
    a.href = verification_uri_complete;
    a.innerText = verification_uri_complete;
    document.body.appendChild(a);
  }
});

console.log(idToken);




// fetch (login)
// start login session 
// cookie をもらう


/// connect Hub

const {hub, send: sendToHub} = await buildHubConnection({
  serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
  // idToken の期限が切れてしまったら？
  idTokenFactory: () => idToken
});

const stream = new MediaStream();


const connected = ((hub, sendToHub)=> {

    const sendSignalingMessage = to => {
      return async sessionDescription => {
        //console.log(`from [${hub.connectionId}]`,`to [${to}]`,sessionDescription);
        await sendToHub({
          Target: 'message',
          Arguments: [{
            from: hub.connectionId,
            sessionDescription: sessionDescription
          }],
          ConnectionId: to
        });
      };
    };

    let resolveConnected;
    const connected = new Promise(resolve => {
      resolveConnected = resolve;
    });

    const initPeerConnection = from => {
      const pc = new LANPeerConnection();
      pc.send = sendSignalingMessage(from);

      pc.ontrack = e => {
        stream.addTrack(e.track);
      };
      
      const h = () => {
        if (pc.connectionState == 'connected') {
          resolveConnected(pc);
          pc.removeEventListener('connectionstatechange', h);
        }
      };

      pc.addEventListener('connectionstatechange', h);

      return pc;
    };

    let pc;
    hub.on("connected", ({from}) => {

      if (!from || from == hub.connectionId) {
        return;
      }

      // initiator
      pc = initPeerConnection(from);
      pc.createSignalingDataChannel();

    });

    hub.on('message', async ({from, sessionDescription}) => {

      if (sessionDescription.type == 'offer') {
        // receiver
        pc = initPeerConnection(from);
      }

      pc.setRemoteDescription(sessionDescription);

    });

    return connected;
  })(hub, sendToHub);

  await hub.start();
  
  console.log("hub connected", hub.connectionId);
  
  // broadcast
  await sendToHub({
    Target: "connected",
    Arguments: [{
      from: hub.connectionId
    }]
  });
  const pc = await connected;
  console.log(`connection State = ${pc.connectionState}`, pc);

  hub.stop();


  const v = document.createElement("video");
  v.srcObject = stream;
  v.width = 300;
  v.height = 300;
  v.muted = true;
  v.autoplay = true;
  document.body.appendChild(v);
  await v.play();

  



})();




async function getIdToken({baseUrl, clientId, callback}) {

  let p = new URLSearchParams();
  p.set('client_id', clientId);
  p.set('scope', 'openid');
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
