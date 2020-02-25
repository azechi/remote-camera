export async function buildHubConnection({ serviceUrl, idTokenFactory }) {
  const hub_info = await fetch(new URL("negotiate", serviceUrl), {
    mode: "cors",
    method: "POST",
    headers: {
      Authorization: "bearer " + (await idTokenFactory())
    }
  }).then(r => r.json());

  const sendMessageAsync = async msg => {
    const id_token = await idTokenFactory();
    await fetch(new URL("messages", serviceUrl), {
      mode: "cors",
      credentials: "include",
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "bearer " + id_token
      },
      body: JSON.stringify(msg)
    }).then(r => r.blob());
  };

  // signaling
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hub_info.url, {
      accessTokenFactory: () => hub_info.accessToken
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return {
    hub: connection,
    send: sendMessageAsync
  };
}
