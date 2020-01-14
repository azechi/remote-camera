
export const auth0 = {

  loggedIn: (async function(location, configPath){
    const url = new URL(window.location);
    const config = await fetch(configPath).then(r => r.json());

    const auth = await createAuth0Client({
      domain: config.domain,
      client_id: config.clientId,
      redirect_uri: url.origin + url.pathname
    });

    if (
      !["code", "state"].every(Array.prototype.includes, [
        ...url.searchParams.keys()
      ])
    ) {
      await auth.loginWithRedirect();
      // sso session があったら待ち時間がある
      await new Promise(resolve => {setTimeout(resolve, 1000 * 60)});
      throw "auth0 loginWithRedirect TIMEOUT";
      return;
    }

    
    await auth.handleRedirectCallback();
    window.history.replaceState({}, document.title, location.pathname);

    return auth;

  })(window.location, "/auth_config.json")


}
