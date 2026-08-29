/** Hash router: "#/leads/12" → { name:'leads', id:'12' }. */
const routes = new Map();
let notFoundView = null;
let current = null;

export function route(name, handler) { routes.set(name, handler); }
export function setNotFound(handler) { notFoundView = handler; }

export function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
  return { name: segments[0] || 'dashboard', id: segments[1] || null, segments, query };
}

export function navigate(path, { replace = false } = {}) {
  const hash = path.startsWith('#') ? path : `#${path}`;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export const currentRoute = () => current;

export async function renderRoute(outlet) {
  const parsed = parseHash();
  current = parsed;
  const handler = routes.get(parsed.name) || notFoundView;
  outlet.replaceChildren();
  const loading = document.createElement('div');
  loading.className = 'spinner';
  outlet.append(loading);
  try {
    const view = await handler(parsed);
    outlet.replaceChildren();
    if (view) outlet.append(view);
    // A fresh view should start at the top, not wherever the last page was scrolled.
    window.scrollTo({ top: 0 });
  } catch (err) {
    outlet.replaceChildren();
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = `<div class="card__body"><h2>Could not load this page</h2>
      <p class="muted"></p></div>`;
    box.querySelector('p').textContent = err?.message || String(err);
    outlet.append(box);
  }
}

export function startRouter(outlet, onChange) {
  const run = () => { renderRoute(outlet); onChange?.(parseHash()); };
  window.addEventListener('hashchange', run);
  run();
}
