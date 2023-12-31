import { StatusError } from './error.js';

declare var process: any;

export async function fetchAny(resource: string, options?: RequestInit): Promise<Response> {
  if (!options) {
    options = { credentials: 'include' };
  } else if (!options.credentials) {
    options.credentials = 'include';
  }

  let url;
  if (process.env.NODE_ENV === 'production') {
    url = `https://api.oi.parkovski.com${resource}`;
  } else if (window.location.hostname === 'localhost') {
    url = `http://localhost:3000${resource}`;
  } else {
    url = `https://api.oi.parkovski.com${resource}`;
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new StatusError(response.status, text);
  }
  return response;
}

export async function fetchText(resource: string, options?: RequestInit): Promise<string> {
  return (await fetchAny(resource, options)).text();
}

export async function fetchJson(resource: string, options?: RequestInit): Promise<any> {
  return (await fetchAny(resource, options)).json();
}
