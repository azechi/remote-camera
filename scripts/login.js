import auth_config from "./auth_config.js";

// createAuth0Client from auth0 sdk
export default (async () => {
  const url = new URL(window.location);

  const config = auth_config;

  const auth = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: url.origin + url.pathname
  });

  if (
    ["code", "state"].every(Array.prototype.includes, [
      ...url.searchParams.keys()
    ])
  ) {
    await auth.handleRedirectCallback();
    window.history.replaceState({}, document.title, location.pathname);
  }

  if (!(await auth.isAuthenticated())) {
    await auth.loginWithRedirect();
    // sso session があったら待ち時間がある
    await new Promise(resolve => {
      setTimeout(resolve, 1000 * 60);
    });
    throw "auth0 loginWithRedirect TIMEOUT";
    return;
  }

  return auth;
})();
