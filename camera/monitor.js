const auth0 = {
  domain: "azechify.auth0.com",
  client_id: "18cBqG2qRvzXvxdGrMamVpVL3zB9b1tn",
  get baseUrl() {
    return `https://${this.domain}/oauth/`;
  }
};

const storage = localStorage;
const key = "refresh_token";

async function refreshToken() {
  const refresh_token = storage.getItem(key);
  if (!refresh_token) {
    throw "refresh_token does not exist.";
  }

  const data = await fetch(auto0.baseUrl + "token", {
    mode: "cors",
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: auth0.client_id,
      refresh_token: refresh_token
    })
  })
    .then(res => res.json())
    .catch(e => {
      storage.removeItem(key);
      throw e;
    });

  return data.id_token;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let p = new URLSearchParams();
  p.set("client_id", auth0.client_id);
  p.set("scope", "offline_access openid"); // scopes must be separated by a space
  p.set("audience", "test");

  let data = await fetch(auth0.baseUrl + "device/code", {
    mode: "cors",
    method: "POST",
    body: p
  }).then(res => res.json());

  /*
   * data: Device Code Response
   * device_code
   * user_code
   * verification_uri
   * verification_uri_complete: verification_uri + user_code
   * expires_in: seconds
   * interval: seconds
   */

  p = new URLSearchParams();
  p.set("client_id", auth0.client_id);
  p.set("device_code", data.device_code);
  p.set("grant_type", "urn:ietf:params:oauth:grant-type:device_code");

  while (true) {
    let response = await fetch(auth0.baseUrl + "token", {
      mode: "cors",
      method: "POST",
      body: p
    });

    if (response.ok) {
      data = await response.json();
      break;
    }

    if (
      response.status == 403 &&
      (await response.json()).error == "authorization_pending"
    ) {
      await sleep(data.interval * 1000);
      continue;
    }

    throw new Error(await response.json());
  }

  // id_token
  // refresh_token

  storage.setItem(key, data.refresh_token);
})();
