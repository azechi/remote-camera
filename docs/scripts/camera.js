let auth0 = null;
let connection = null;

window.onload = async () => {
  const url = new URL(window.location);

  const config = await fetch("/auth_config.json").then(res => res.json());
  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: url.origin + url.pathname
  });

  if (
    !["code", "state"].every(Array.prototype.includes, [
      ...url.searchParams.keys()
    ])
  ) {
    console.log("くるくる");
    // sso session があったら待ち時間がある
    await auth0.loginWithRedirect();
    return;
  }

  await auth0.handleRedirectCallback();
  window.history.replaceState({}, document.title, location.pathname);

  //console.log(await auth0.getIdTokenClaims().then(x => x.__raw));

  // signaling
  connection = new signalR.HubConnectionBuilder()
    .withUrl("https://p1-azechify.azure-api.net", {
      accessTokenFactory: async () => {
        return await auth0.getIdTokenClaims().then(x => x.__raw);
      }
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on("newMessage", msg => {
    console.log(msg);
  });

  connection
    .start()
    .then(console.log)
    .catch(console.error);
};
