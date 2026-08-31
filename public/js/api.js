/** Thin fetch wrapper: JSON in, JSON out, cookie session, CSRF header. */
const HEADERS = { 'X-Requested-With': 'DreamFlyCRM' };

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(method, path, body, isForm = false) {
  const options = { method, headers: { ...HEADERS }, credentials: 'same-origin' };
  if (body !== undefined && body !== null) {
    if (isForm) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, options);
  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error || `Request failed (${res.status})`);
  }
  return payload;
}

/** Turns {a:1, b:null} into "?a=1", dropping empty values. */
export function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  del: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, true),
};
