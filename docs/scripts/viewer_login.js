export {getRefreshToken, getIdToken};



function callApi(endpointPath ,data) {
  const domain = 'azechify.auth0.com';
  const clientId = '18cBqG2qRvzXvxdGrMamVpVL3zB9b1tn';

  return fetch(
    `https://${domain}/oauth/${endpointPath}`,
    {
      mode: 'cors',
      method: 'POST',
      body: new URLSearchParams({
        'client_id': clientId,
        ...data
      })
    }
  );
}

/*
  displayCallback({
    user_code,
    verification_uri,
    verification_uri_complete
  })
*/


async function getRefreshToken(displayCallback) {
  
  const deviceCodeResponse = await getDeviceCode();
  
  displayCallback(deviceCodeResponse);

  return getIdTokenUsingDeviceCode(deviceCodeResponse);

}

// new URLSearchParams()
// fetch()
async function getIdToken(refreshToken) {

  const response = await callApi(
  "token",
  {
    'grant_type': 'refresh_token',
    'refresh_token': refreshToken
  });

  if (response.ok) {
    return (await response.json()).id_token;
  }

  throw (await response.json());
}

async function getDeviceCode() {

  const response = await callApi(
  "device/code",
  {
    'scope': 'offline_access'
  }
  );

  if (response.ok) {
    return await response.json();
  }
    
  throw await response.json();
}

async function getIdTokenUsingDeviceCode(deviceCodeResponse) {

  while(true) {

    const response = await callApi("token", 
    {
      'device_code': deviceCodeResponse.device_code,
      'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'
    });
  
    if(response.ok) {
      return await response.json();
    }

    if (response.status == 403
      && (await response.json()).error == 'authorization_pending') {
      await new Promise(resolve => setTimeout(resolve, deviceCodeResponse.interval * 1000));
      continue;
    }

    throw await response.json();
  }
}

