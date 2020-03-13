export { getRefreshToken, getIdToken };

const domain = "azechify.auth0.com";
const clientId = "18cBqG2qRvzXvxdGrMamVpVL3zB9b1tn";

/*
displayCallback({
  user_code,
  verification_uri,
  verification_uri_complete
})
*/
async function getRefreshToken(displayCallback) {
  const deviceCodeResponse = await getDeviceCode("offline_access openid");

  displayCallback(deviceCodeResponse);

  return (await getTokenUsingDeviceCode(deviceCodeResponse)).refresh_token;
}

async function getIdToken(refreshToken) {
  return (await getTokenUsingRefreshToken(refreshToken)).id_token;
}

async function getTokenUsingRefreshToken(refreshToken) {
  const response = await callApi("token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  if (response.ok) {
    return response.json();
  }

  throw await response.json();
}

async function getDeviceCode(scope) {
  const response = await callApi("device/code", {
    scope
  });

  if (response.ok) {
    return response.json();
  }

  throw await response.json();
}

async function getTokenUsingDeviceCode(deviceCodeResponse) {
  while (true) {
    const response = await callApi("token", {
      device_code: deviceCodeResponse.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    });

    if (response.ok) {
      return response.json();
    }

    if (
      response.status == 403 &&
      (await response.json()).error == "authorization_pending"
    ) {
      await new Promise(resolve =>
        setTimeout(resolve, deviceCodeResponse.interval * 1000)
      );
      continue;
    }

    throw await response.json();
  }
}

// new URLSearchParams()
// fetch()
function callApi(endpointPath, data) {
  return fetch(`https://${domain}/oauth/${endpointPath}`, {
    mode: "cors",
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      ...data
    })
  });
}
