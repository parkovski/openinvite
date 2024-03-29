<script>
  import {
    Page,
    Navbar,
    Block,
    Button,
    f7,
  } from 'framework7-svelte';
  import webSocketService from '../../services/websocket';
  import { onMount } from 'svelte';
  import { fetchText } from '../../js/fetch';

  console.log(f7);

  function getReadyState() {
    switch (webSocketService._webSocket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'open';
    case WebSocket.CLOSING: return 'closing';
    case WebSocket.CLOSED: return 'closed';
    default: return 'bad value';
    }
  }
  let readyState = getReadyState();

  let notificationPermission = Notification.permission;
  async function enableNotifications() {
    notificationPermission = await Notification.requestPermission();
  }

  function sendNotification() {
    new Notification('OpenInvite', {
      body: 'Test notification.'
    });
  }

  let pushEndpoint;
  let keyP256dh;
  let keyAuth;
  onMount(() => {
    navigator.serviceWorker.ready.then(registration => {
      registration.pushManager.getSubscription().then(subscription => {
        pushEndpoint = subscription.endpoint;
        keyP256dh = subscription.getKey('p256dh');
        keyAuth = subscription.getKey('auth');
      });
    });
  });

  function base64ArrayBuffer(arrayBuffer) {
    // Thanks to https://gist.github.com/jonleighton/958841
    // MIT licensed
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder

    var a, b, c, d
    var chunk

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
  }

  function urlBase64ToUint8Array(base64String) {
    // Thanks to https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function getPushEndpoint() {
    if (pushEndpoint) {
      return;
    }

    let registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_SERVER_KEY),
      });
    }
    pushEndpoint = subscription.endpoint;
    keyP256dh = subscription.getKey('p256dh');
    keyAuth = subscription.getKey('auth');

    await fetchText('/push-endpoint', {
      method: 'PUT',
      body: new URLSearchParams({
        endpoint: pushEndpoint,
        p256dh: base64ArrayBuffer(keyP256dh),
        auth: base64ArrayBuffer(keyAuth),
      }),
    })
  }

  function closeWebSocket() {
    webSocketService._webSocket.addEventListener('close', () => readyState = getReadyState());
    webSocketService._webSocket.close();
    readyState = getReadyState();
  }

  function restartWebSocket() {
    webSocketService.reconnect(true);
    readyState = getReadyState();
    webSocketService._webSocket.addEventListener('open', () => readyState = getReadyState());
  }
</script>

<Page>
  <Navbar title="Developer Tools" backLink="Back" />
  <Block>
    WebSocket status: {readyState}
    <div class="grid grid-cols-2 grid-gap">
      <Button onClick={closeWebSocket}>Close</Button>
      <Button onClick={restartWebSocket}>Restart</Button>
    </div>
  </Block>
  <Block>
    Notification permission: {notificationPermission}
    <div class="grid grid-cols-2 grid-gap">
      <Button onClick={enableNotifications}>Request</Button>
      <Button onClick={sendNotification}>Send notification</Button>
    </div>
  </Block>
  <Block>
    Push endpoint:
    <pre style="overflow-x: scroll; margin: 0">{pushEndpoint}</pre>
    <Button onClick={getPushEndpoint}>Generate endpoint</Button>
  </Block>
</Page>
