import auth_config from './auth_config.js';

auth_config.clientId = '18cBqG2qRvzXvxdGrMamVpVL3zB9b1tn'

const key = "Refresh Token";

// storage: { getItem(SKey):SValue?, removeItem(SKey): void, setItem(SKey, SValue): void }
// async display({user_code, verification_uri, verification_uri_complete}): void;
export default (async (storage, display) => {
 
  const rt = storage.getItem(key);
  if (rt) {
    
    const id = await getTokenUsingRefreshToken(rt)

    if(id) {
      return id;
    }

    // refreshToken is invalid
    storage.removeItem(key);
  }

  // device authorization flow
  const deviceCodeResponse = await getDeviceCode();

  await display(deviceCodeResponse);

  return await getTokenUsingDeviceCode(deviceCodeResponse, rt => storage.setItem(key, rt))

  
});

async function getDeviceCode() {
  const p = new URLSearchParams();
  p.set('client_id', auth_config.clientId);
  p.set('scope', 'openid offline_access');
  
  return await fetch(
    "https://" + auth_config.domain + '/oauth/device/code',
    {
      mode: 'cors',
      method: 'POST',
      body: p
    }
  ).then(res => res.json());

}

async function getTokenUsingDeviceCode(deviceCodeResponse, storeRefreshToken) {
  const p = new URLSearchParams();
  p.set('client_id', auth_config.clientId);
  p.set('device_code', deviceCodeResponse.device_code);
  p.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
  
  while(true) {
    const response = await fetch(
      "https://" + auth_config.domain + '/oauth/token',
      {
        mode: 'cors',
        method: 'POST',
        body: p
      }
    );
  
    if(response.ok) {
      const data = await response.json();
      storeRefreshToken(data.refresh_token);
      return data.id_token;
    }

    if (response.status == 403
      && (await response.json()).error == 'authorization_pending') {
      await new Promise(resolve => setTimeout(resolve, deviceCodeResponse.interval * 1000));
      continue;
    }

    throw (await response.json());
  }
}

// fetch(), new URLSearchParams()
async function getTokenUsingRefreshToken(refreshToken) {
  const p = new URLSearchParams();
  p.set('client_id', auth_config.clientId);
  p.set('grant_type', 'refresh_token');
  p.set('refresh_token', refreshToken);

  let response = await fetch(
    "https://" + auth_config.domain + '/oauth/token',
    {
      mode: 'cors',
      method: 'POST',
      body: p
    }
  );

  if (response.ok) {
    return (await response.json()).id_token;
  }

  throw (await response.json());

}

