
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

  div_status.innerText = "Hub ...";

  await auth.getIdTokenClaims().then(x => x.name).then(console.log);
  
  const {hub, send: sendToHub} = await buildHubConnection({
    serviceUrl: new URL("https://p1-azechify.azure-api.net/"),
    idTokenFactory: () => auth.getIdTokenClaims().then(x => x.__raw)
  });

  h = hub;
  s = sendToHub;

  const gen = (() =>{

    let value;
    let current_resolve;
    
    let current = new Promise(resolve => {
      current_resolve = resolve;
    } );
   
    const next = v => {
      value = v;
      current_resolve();
    };

    const gen = async function* () {
      while(true){
        await current;
        yield value;

        current = new Promise(resolve => {
          current_resolve = resolve;
        });
      }

    };
    
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

  // broadcast
  await sendToHub({
    Target: "connected",
    Arguments: [{
      from: hub.connectionId
    }]
  });

  // loop
  for await (const peer of gen()) {
    console.log(peer);
  }


  // hub negotiate
  /*
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

  */
};
