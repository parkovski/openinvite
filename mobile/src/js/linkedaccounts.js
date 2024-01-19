export function importGooglePlatform(onLogin) {
  if (document.getElementById('google-platform-script')) {
    return;
  }

  const googlePlatformScript = document.createElement('script');
  googlePlatformScript.id = 'google-platform-script';
  googlePlatformScript.src = 'https://accounts.google.com/gsi/client';
  googlePlatformScript.async = true;
  googlePlatformScript.defer = true;
  googlePlatformScript.onload = function() {
    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: onLogin,
    });
    google.accounts.id.renderButton(
      document.getElementById('google_btn'), { theme: 'filled_blue' }
    );
  };
  document.body.appendChild(googlePlatformScript);
}

export function importApplePlatform() {
  if (document.getElementById('apple-auth-script')) {
    return;
  }

  // Note: This requires some meta tags set, see
  // https://developer.apple.com/documentation/sign_in_with_apple/displaying_sign_in_with_apple_buttons_on_the_web
  let metaTag = document.createElement('meta');
  metaTag.name = 'appleid-signin-client-id';
  metaTag.content = 'PUT_APPLE_CLIENT_ID_HERE';
  document.head.appendChild(metaTag);

  metaTag = document.createElement('meta');
  metaTag.name = 'appleid-signin-scope'
  metaTag.content = 'PUT_APPLE_SCOPE_HERE';
  document.head.appendChild(metaTag);

  metaTag = document.createElement('meta');
  metaTag.name = 'appleid-signin-redirect-uri';
  metaTag.content = 'PUT_APPLE_REDIRECT_URI_HERE';
  document.head.appendChild(metaTag);

  metaTag = document.createElement('meta');
  metaTag.name = 'appleid-signin-state';
  metaTag.content = 'PUT_APPLE_STATE_HERE';

  const appleIdButton = document.getElementById('appleid-signin');
  // Make it the same size as the Google button.
  appleIdButton.style.width = '193px';
  appleIdButton.style.height = '44px';
  appleIdButton.style.cursor = 'pointer';
  if (document.documentElement.classList.contains('dark')) {
    appleIdButton.setAttribute('data-color', 'white');
  } else {
    appleIdButton.setAttribute('data-color', 'black');
  }
  const appleAuthScript = document.createElement('script');
  appleAuthScript.id = 'apple-auth-script';
  appleAuthScript.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
  appleAuthScript.async = true;
  appleAuthScript.defer = true;
  appleAuthScript.onload = function() {
  };
  document.body.appendChild(appleAuthScript);
}

export function createMicrosoftButton() {
  if (document.getElementById('msft-button-img')) {
    return;
  }
  const wrapper = document.getElementById('msft-button');
  const button = document.createElement('img');
  button.id = 'msft-button-img';
  button.alt = 'Sign in with Microsoft';
  if (document.documentElement.classList.contains('dark')) {
    button.src = '/icons/ms-symbollockup_signin_light.svg';
  } else {
    button.src = '/icons/ms-symbollockup_signin_dark.svg';
  }
  button.style.width = '193px';
  button.style.height = '41px';
  wrapper.appendChild(button);
}