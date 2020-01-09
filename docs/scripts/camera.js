
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

})(()=> new LANPeerConnection());


const div_status = document.getElementById("loading");

let h;
let s;

window.onload = async () => {

  const auth = await auth0.loggedIn;

  div_status.innerText = "Hub negotiate ...";

  await auth.getIdTokenClaims().then(x => x.name).then(console.log);
  
  const {hub, send: sendToHub} = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });

  h = hub;
  s = sendToHub;

  const gen = (() =>{

    let current_resolve;
    
    let current = new Promise(resolve => {
      current_resolve = resolve;
    } );
   
    const next = val => {
      current_resolve(val);
    };

    const gen = async function* () {
      while(true){
        const val = await current;
        yield val;

        current = new Promise(resolve => {
          current_resolve = resolve;
        });
      }
    };
      
    // Promiseが一つだと、connectedで取りこぼす場合がありそう
    // queueか何かでpromiseを複数持てるようにしたほうがよさげ


    hub.on("connected", ({from}) => {
      if (!from || from == hub.connectionId) {
        return;
      }
      
      next(from);

    });

    return gen;
  })();

  div_status.innerText = "Hub connecting ...";
  await hub.start();

  div_status.innerText = "Hub connected " + hub.connectionId; 


  
  sendSignalingMessage = to => {

    return async sessionDescription => {
      console.log(`from [${hub.connectionId}]`,`to [${to}]`,sessionDescription);
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


  hub.on('message', async ({from, sessionDescription}) => {
    
    const pc = getPeerConnection(from);

    if (sessionDescription.type == 'offer') {
      // this peer is receiver
      pc.send = sendSignalingMessage(from);
    }
   
    pc.setRemoteDescription(sessionDescription);

  });

  // broadcast
  await sendToHub({
    Target: "connected",
    Arguments: [{
      from: hub.connectionId
    }]
  });

  // loop
  for await (const peer of gen()) {

    const p = document.createElement("p");
    p.innerText = `call from [${peer}]`
    document.body.appendChild(p);

    // initiate peer connection
    // this peer is initiator
    const pc = getPeerConnection(peer);
    pc.send = sendSignalingMessage(peer);
    pc.createSignalingDataChannel();
  }
};

