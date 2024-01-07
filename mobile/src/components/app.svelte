<script>
  import {
    f7,
    f7ready,
    App,
    Panel,
    Views,
    View,
    Page,
    Toolbar,
    Link,
    LoginScreen,
    LoginScreenTitle,
    List,
    ListInput,
    ListButton,
    BlockFooter
  } from 'framework7-svelte';
  import { getDevice }  from 'framework7/lite-bundle';
  import { onMount } from 'svelte';
  import { fetchText } from '../js/fetch';

  import capacitorApp from '../js/capacitor-app';
  import routes from '../js/routes';
  import { postLoginEvent } from '../js/onlogin';

  const device = getDevice();

  // Framework7 Parameters
  let f7params = {
    name: 'OpenInvite', // App name
    theme: 'auto', // Automatic theme detection
    // App routes
    routes: routes,
    // Register service worker (only on production build)
    serviceWorker: process.env.NODE_ENV ==='production' ? {
      path: '/service-worker.js',
    } : {},
    // Input settings
    input: {
      scrollIntoViewOnFocus: device.capacitor,
      scrollIntoViewCentered: device.capacitor,
    },
    // Capacitor Statusbar settings
    statusbar: {
      iosOverlaysWebView: true,
      androidOverlaysWebView: false,
    },
  };

  function onRouteChanged(newRoute, _prevRoute, _router) {
    if (newRoute.url === '/') {
      f7.views.rpanel.router.navigate('/panels/home/', { animate: false });
    } else if (newRoute.url.startsWith('/groups/view/')) {
      f7.views.rpanel.router.navigate(`/panels/group/${newRoute.params.id}/`, { animate: false });
    } else if (newRoute.url.startsWith('/events/view/')) {
      f7.views.rpanel.router.navigate(`/panels/event/${newRoute.params.id}/`, { animate: false });
    }
  }

  onMount(() => {
    f7ready(() => {
      // Init capacitor APIs (see capacitor-app.js)
      if (f7.device.capacitor) {
        capacitorApp.init(f7);
      }
      // Call F7 APIs here
      f7.enableAutoDarkMode();

      fetchText('/hello')
        .then(text => {
          let [uid, message] = text.split('\n');
          localStorage.setItem('uid', uid);
          console.log(message);
          postLoginEvent();
        })
        .catch(e => {
          console.log(e);
          f7.loginScreen.open(document.getElementById('login-screen'));
        });

      ['home', 'groups', 'events', 'contacts', 'messages'].forEach(tab =>
        f7.views[tab].router.on('routeChanged', onRouteChanged)
      );
    });
  })

  let username;
  let password;

  async function login() {
    try {
      const uid = await fetchText('/authorize', {
        method: 'POST',
        body: new URLSearchParams({
          u: username,
          p: password,
        }),
      });
      f7.loginScreen.close();
      localStorage.setItem('uid', uid);
      postLoginEvent();
    }
    catch (e) {
      console.log(e);
    }
  }

  let currentTab = 'home';
  function tabClick(name) {
    // Go back to the initial page only if this tab is already active and is
    // currently on a different route.
    if (f7.views.current.name !== currentTab) {
      currentTab = f7.views.current.name;
      onRouteChanged(
        f7.views.current.router.currentRoute,
        f7.views.current.router.previousRoute,
        f7.views.current.router
      );
      return;
    }
    const router = f7.views[name].router;
    const initialUrl = router.initialUrl;
    if (router.url !== initialUrl) {
      router.navigate(initialUrl, { clearPreviousHistory: true });
    }
  }
</script>

<App { ...f7params }>
  <Panel right reveal id="right-panel">
    <View id="view-rpanel" name="rpanel" url="/panels/home/" />
  </Panel>

  <!-- Views/Tabs container -->
  <Views tabs class="safe-areas">
    <!-- Tabbar for switching views-tabs -->
    <Toolbar tabbar icons bottom>
      <Link tabLink="#view-home" tabLinkActive
        iconIos="f7:house_fill" iconMd="material:home"
        text="Home"
        onClick={() => tabClick('home')}
      />
      <Link tabLink="#view-groups"
        iconIos="f7:person_3_fill" iconMd="material:groups"
        text="Groups"
        onClick={() => tabClick('groups')}
      />
      <Link tabLink="#view-events"
        iconIos="f7:calendar" iconMd="material:event"
        text="Events"
        onClick={() => tabClick('events')}
      />
      <Link tabLink="#view-contacts"
        iconIos="f7:person_fill" iconMd="material:person"
        text="Contacts"
        onClick={() => tabClick('contacts')}
      />
      <Link tabLink="#view-messages"
        iconIos="f7:chat_bubble_text_fill" iconMd="material:chat"
        text="Messages"
        onClick={() => tabClick('messages')}
      />
    </Toolbar>

    <!-- Your main view/tab, should have "view-main" class. It also has "tabActive" prop -->
    <View id="view-home" name="home" main tab tabActive url="/" />
    <View id="view-groups" name="groups" tab url="/groups/" />
    <View id="view-events" name="events" tab url="/events/" />
    <View id="view-contacts" name="contacts" tab url="/contacts/" />
    <View id="view-messages" name="messages" tab url="/messages/" />
  </Views>

  <LoginScreen id="login-screen">
    <View>
      <Page loginScreen>
        <LoginScreenTitle>Login</LoginScreenTitle>
        <List form>
          <ListInput
            type="text"
            name="username"
            placeholder="Your username"
            bind:value={username}
          />
          <ListInput
            type="password"
            name="password"
            placeholder="Your password"
            bind:value={password}
          />
        </List>
        <List>
          <ListButton title="Sign In" onClick={login} />
        </List>
        <BlockFooter>
          Some text about login information.<br />Click "Sign In" to close Login Screen
        </BlockFooter>
      </Page>
    </View>
  </LoginScreen>
</App>