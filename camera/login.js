let auth0 = null;

window.onload = async () => {
  const config = await fetch("/auth_config.json").then(res => res.json());
  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: window.location.href
  });

  if (await auth0.isAuthenticated()) {
    throw "???";
    return;
  }

  // handle callback
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, "/login.html");
  } else {
    await auth0.loginWithRedirect();
    // sso session があったら待ち時間がある
    console.log("くるくる");
    return;
  }

  const claims = await auth0.getIdTokenClaims();
  const id_token = claims.__raw;
  console.log(id_token);
};
