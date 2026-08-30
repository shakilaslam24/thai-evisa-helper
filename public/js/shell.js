import { el, clear, initials, toast, toastError, modal, closeModal, formModal, field, relativeTime } from './ui.js';
import { api } from './api.js';
import { store, isPartnerLogin, can } from './store.js';
import { navigate } from './router.js';

const NAV = [
  { group: 'Overview' },
  { key: 'dashboard', label: 'Dashboard', icon: '▦' },
  { group: 'Sales pipeline' },
  { key: 'leads', label: 'Leads', icon: '◈', modules: ['leads'] },
  { key: 'followups', label: 'Follow-up', icon: '↻', modules: ['followups'], badge: 'followups' },
  { key: 'meetings', label: 'Meetings', icon: '▤', modules: ['meetings'] },
  { group: 'Operations' },
  { key: 'customers', label: 'Customers', icon: '☺' },
  { key: 'files', label: 'Files / Cases', icon: '🗂' },
  { key: 'partners', label: 'B2B Partners', icon: '⇄' },
  { key: 'documents', label: 'Documents', icon: '📎' },
  { group: 'Finance' },
  { key: 'invoices', label: 'Invoices', icon: '🧾' },
  { key: 'payments', label: 'Payments', icon: '৳' },
  { group: 'Insight' },
  { key: 'reports', label: 'Reports', icon: '📊', hideFor: ['partner'] },
  { key: 'staff', label: 'Staff Performance', icon: '★', roles: ['admin', 'manager'] },
  { key: 'notifications', label: 'Notifications', icon: '🔔', badge: 'unread' },
  { key: 'settings', label: 'Settings', icon: '⚙', roles: ['admin'] },
];

let refs = {};
let searchTimer = null;

/**
 * The sidebar sits on brand navy, so the white lockup is used. A logo set in
 * Settings replaces it, which keeps the system usable by another company.
 */
function brandLockup() {
  const custom = store.settings.company_logo_url;
  if (custom) {
    return [
      el('div', { class: 'sidebar__logo' }, el('img', { src: custom, alt: '' })),
      el('div', {}, [
        el('div', { class: 'sidebar__name', text: store.settings.company_name || 'DreamFly' }),
        el('div', { class: 'sidebar__tag', text: 'Consultancy CRM' }),
      ]),
    ];
  }
  return [el('img', {
    class: 'sidebar__lockup', src: '/assets/brand/logo-wide-light.png',
    alt: store.settings.company_name || 'DreamFly Consultancy',
  })];
}

export function buildShell() {
  const outlet = el('main', { class: 'content', id: 'outlet' });

  const nav = el('nav', { class: 'sidebar__nav' });
  const sidebar = el('aside', { class: 'sidebar', id: 'sidebar' }, [
    el('div', { class: 'sidebar__brand' }, brandLockup()),
    nav,
    el('div', { class: 'sidebar__foot', text: `Signed in as ${store.user.role}` }),
  ]);

  const searchInput = el('input', {
    type: 'search', placeholder: 'Search name, passport, phone, file, invoice…',
    'aria-label': 'Global search', autocomplete: 'off',
    onInput: (e) => scheduleSearch(e.target.value),
    onFocus: (e) => { if (e.target.value.length >= 2) scheduleSearch(e.target.value); },
  });
  const searchResults = el('div', { class: 'search__results', hidden: true });

  const notifyBtn = el('button', {
    class: 'iconbtn', 'aria-label': 'Notifications', title: 'Notifications',
    onClick: openNotifications,
  }, [el('span', { text: '🔔' })]);

  const userBtn = el('button', { class: 'usermenu', onClick: openUserMenu }, [
    el('span', { class: 'avatar', text: initials(store.user.name) }),
    el('span', { class: 'usermenu__text' }, [
      el('div', { class: 'usermenu__name', text: store.user.name }),
      el('div', { class: 'usermenu__role', text: store.user.role }),
    ]),
  ]);

  const scrim = el('div', { class: 'scrim', hidden: true, onClick: () => toggleSidebar(false) });

  const topbar = el('header', { class: 'topbar' }, [
    el('button', {
      class: 'iconbtn topbar__menu', 'aria-label': 'Open menu', html: '&#9776;',
      onClick: () => toggleSidebar(),
    }),
    el('div', { class: 'search' }, [
      el('span', { class: 'search__icon', text: '⌕' }), searchInput, searchResults,
    ]),
    el('div', { class: 'topbar__spacer' }),
    notifyBtn,
    userBtn,
  ]);

  const shell = el('div', { class: 'app' }, [
    sidebar, scrim,
    el('div', { class: 'main' }, [topbar, outlet]),
  ]);

  refs = { nav, outlet, sidebar, scrim, searchInput, searchResults, notifyBtn };
  renderNav();
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) hideSearchResults();
    if (!e.target.closest('.dropdown, .iconbtn, .usermenu')) closeDropdown();
  });
  return { shell, outlet };
}

function visibleNav() {
  return NAV.filter((item) => {
    if (item.group) return true;
    if (item.roles && !item.roles.includes(store.user.role)) return false;
    if (item.hideFor && item.hideFor.includes(store.user.role)) return false;
    if (isPartnerLogin() && !['dashboard', 'files', 'invoices', 'notifications'].includes(item.key)) return false;
    return true;
  });
}

export function renderNav(activeKey) {
  const active = activeKey || (window.location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard');
  clear(refs.nav);
  let pendingGroup = null;
  for (const item of visibleNav()) {
    if (item.group) { pendingGroup = item.group; continue; }
    if (pendingGroup) {
      refs.nav.append(el('div', { class: 'sidebar__group', text: pendingGroup }));
      pendingGroup = null;
    }
    const link = el('a', {
      class: `navlink${item.key === active ? ' navlink--active' : ''}`,
      href: `#/${item.key}`,
      onClick: () => toggleSidebar(false),
    }, [
      el('span', { class: 'navlink__icon', text: item.icon }),
      el('span', { text: item.label }),
    ]);
    if (item.badge === 'unread' && store.unread > 0) {
      link.append(el('span', { class: 'navlink__badge', text: String(store.unread) }));
    }
    refs.nav.append(link);
  }
}

function toggleSidebar(force) {
  const open = force ?? !refs.sidebar.classList.contains('sidebar--open');
  refs.sidebar.classList.toggle('sidebar--open', open);
  refs.scrim.hidden = !open;
}

/* ------------------------------ global search ------------------------------ */

function scheduleSearch(term) {
  clearTimeout(searchTimer);
  if (term.trim().length < 2) return hideSearchResults();
  searchTimer = setTimeout(() => runSearch(term.trim()), 220);
}

async function runSearch(term) {
  try {
    const res = await api.get(`/api/dashboard/search?q=${encodeURIComponent(term)}`);
    const box = refs.searchResults;
    clear(box);
    if (!res.data.length) {
      box.append(el('div', { class: 'search__empty', text: `No match for “${term}”` }));
    } else {
      for (const r of res.data) {
        box.append(el('a', { class: 'search__item', href: r.link, onClick: hideSearchResults }, [
          el('div', {}, [
            el('span', { class: 'badge', text: r.type }), ' ',
            el('span', { class: 'cell-title', text: r.title }),
          ]),
          el('div', { class: 'cell-sub', text: r.subtitle || '' }),
        ]));
      }
    }
    box.hidden = false;
  } catch (err) { toastError(err); }
}

function hideSearchResults() { if (refs.searchResults) refs.searchResults.hidden = true; }

/* ------------------------------ notifications ------------------------------ */

let dropdown = null;
function closeDropdown() { dropdown?.remove(); dropdown = null; }

async function openNotifications() {
  if (dropdown) return closeDropdown();
  const box = el('div', { class: 'dropdown' }, [
    el('div', { class: 'dropdown__head' }, [
      el('span', { text: 'Notifications' }),
      el('button', {
        class: 'btn btn--sm btn--ghost', text: 'Mark all read',
        onClick: async () => {
          await api.post('/api/notifications/read-all');
          closeDropdown(); await refreshNotifications(); toast('All notifications marked read');
        },
      }),
    ]),
    el('div', { class: 'dropdown__body' }, el('div', { class: 'spinner' })),
  ]);
  document.body.append(box);
  dropdown = box;

  try {
    const res = await api.get('/api/notifications');
    store.unread = res.unread;
    renderNav();
    updateNotifyBadge();
    const body = box.querySelector('.dropdown__body');
    clear(body);
    if (!res.data.length) {
      body.append(el('div', { class: 'empty', text: 'Nothing needs your attention' }));
    }
    for (const n of res.data.slice(0, 25)) {
      body.append(el('a', {
        class: 'dropdown__item', href: n.link || '#/notifications',
        style: n.is_read ? 'opacity:.6' : '',
        onClick: async () => {
          if (!n.is_read) await api.post(`/api/notifications/${n.id}/read`).catch(() => {});
          closeDropdown(); refreshNotifications();
        },
      }, [
        el('div', { class: 'cell-title', text: n.title }),
        n.body ? el('div', { class: 'cell-sub', text: n.body }) : null,
        el('div', { class: 'cell-sub', text: relativeTime(n.created_at) }),
      ]));
    }
    body.append(el('a', { class: 'dropdown__item', href: '#/notifications', text: 'View all →',
      onClick: closeDropdown }));
  } catch (err) { toastError(err); closeDropdown(); }
}

function updateNotifyBadge() {
  const btn = refs.notifyBtn;
  if (!btn) return;
  btn.querySelector('.iconbtn__dot')?.remove();
  if (store.unread > 0) {
    btn.append(el('span', { class: 'iconbtn__dot', text: store.unread > 99 ? '99+' : String(store.unread) }));
  }
}

const BASE_TITLE = 'DreamFly Consultancy CRM';
let lastSeenId = 0;
let primedFromServer = false;

/** Unread count in the browser tab, so it is visible from another tab. */
function updateTabTitle() {
  document.title = store.unread > 0 ? `(${store.unread}) ${BASE_TITLE}` : BASE_TITLE;
}

export function desktopAlertsEnabled() {
  try {
    return localStorage.getItem('dreamfly-desktop-alerts') === '1'
      && 'Notification' in window && Notification.permission === 'granted';
  } catch { return false; }
}

/** Asks the browser for permission, which it only grants on a real click. */
export async function enableDesktopAlerts() {
  if (!('Notification' in window)) {
    toast('This browser cannot show desktop alerts', 'err');
    return false;
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') {
    toast('Desktop alerts were blocked in the browser settings', 'err');
    return false;
  }
  try { localStorage.setItem('dreamfly-desktop-alerts', '1'); } catch { /* private mode */ }
  new Notification('DreamFly CRM', { body: 'Desktop alerts are on. You will be told about due follow-ups and payments.' });
  return true;
}

export function disableDesktopAlerts() {
  try { localStorage.setItem('dreamfly-desktop-alerts', '0'); } catch { /* ignore */ }
}

function popDesktopAlerts(items) {
  if (!desktopAlertsEnabled()) return;
  // Never bury the screen: show the newest few, then a summary line.
  for (const n of items.slice(0, 3)) {
    const note = new Notification(n.title, { body: n.body || '', tag: `dreamfly-${n.id}` });
    note.onclick = () => {
      window.focus();
      if (n.link) window.location.hash = n.link.replace(/^#/, '');
      note.close();
    };
  }
  if (items.length > 3) {
    new Notification(`${items.length - 3} more reminders`, {
      body: 'Open the notifications page to see them all.', tag: 'dreamfly-more',
    });
  }
}

export async function refreshNotifications() {
  try {
    const res = await api.get('/api/notifications?unread=1');
    store.unread = res.unread;
    updateNotifyBadge();
    updateTabTitle();
    renderNav();

    const fresh = res.data.filter((n) => n.id > lastSeenId);
    if (res.data.length) lastSeenId = Math.max(lastSeenId, ...res.data.map((n) => n.id));
    // The first poll after a page load is the existing backlog, not news —
    // alerting on it would fire every time someone opens the app.
    if (primedFromServer && fresh.length) popDesktopAlerts(fresh);
    primedFromServer = true;
  } catch { /* a failed poll should never interrupt the user */ }
}

/* -------------------------------- user menu -------------------------------- */

function openUserMenu() {
  if (dropdown) return closeDropdown();
  const box = el('div', { class: 'dropdown dropdown--narrow' }, [
    el('div', { class: 'dropdown__head' }, el('span', { text: store.user.email })),
    el('div', { class: 'dropdown__body' }, [
      el('button', { class: 'dropdown__item', text: 'Change password', onClick: () => { closeDropdown(); changePassword(); } }),
      el('button', { class: 'dropdown__item', text: `Theme: ${themeLabel()}`, onClick: (e) => { cycleTheme(); e.target.textContent = `Theme: ${themeLabel()}`; } }),
      el('button', {
        class: 'dropdown__item',
        text: `Desktop alerts: ${desktopAlertsEnabled() ? 'on' : 'off'}`,
        onClick: async (e) => {
          if (desktopAlertsEnabled()) { disableDesktopAlerts(); toast('Desktop alerts turned off'); }
          else if (await enableDesktopAlerts()) toast('Desktop alerts turned on');
          e.target.textContent = `Desktop alerts: ${desktopAlertsEnabled() ? 'on' : 'off'}`;
        },
      }),
      can('settings') ? el('a', { class: 'dropdown__item', href: '#/settings', text: 'Settings', onClick: closeDropdown }) : null,
      el('button', { class: 'dropdown__item', text: 'Sign out', onClick: signOut }),
    ]),
  ]);
  document.body.append(box);
  dropdown = box;
}

function themeLabel() { return localStorage.getItem('dreamfly-theme') || 'system'; }

function cycleTheme() {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(themeLabel()) + 1) % order.length];
  try { localStorage.setItem('dreamfly-theme', next); } catch { /* private mode */ }
  applyTheme();
}

export function applyTheme() {
  let value = 'system';
  try { value = localStorage.getItem('dreamfly-theme') || 'system'; } catch { /* ignore */ }
  if (value === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', value);
}

function changePassword() {
  formModal({
    title: 'Change password',
    fields: [{ legend: 'Your password', fields: [
      { name: 'current_password', label: 'Current password', type: 'password', required: true },
      { name: 'new_password', label: 'New password', type: 'password', required: true, hint: 'At least 8 characters' },
    ] }],
    submitLabel: 'Update password',
    onSubmit: async (values) => {
      await api.post('/api/auth/change-password', values);
      toast('Password updated');
    },
  });
}

async function signOut() {
  closeDropdown();
  try { await api.post('/api/auth/logout'); } catch { /* sign out locally regardless */ }
  window.location.hash = '';
  window.location.reload();
}
