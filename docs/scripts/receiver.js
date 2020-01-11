
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
      return await response.json();
    }

    if (response.status == 403
      && (await response.json()).error == "authorization_pending") {
      await new Promise(resolve => setTimeout(resolve, data.interval * 1000));
      continue;
    }

    throw (await response.json());

  }

};
