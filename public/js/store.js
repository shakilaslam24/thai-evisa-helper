import { api } from './api.js';

/** Shared client state: signed-in user, dropdown lists, staff, company settings. */
export const store = {
  user: null,
  lookups: { country: [], service: [], lead_source: [], document_category: [] },
  enums: {},
  users: [],
  partners: [],
  settings: {},
  unread: 0,
};

export async function loadSession() {
  try {
    const res = await api.get('/api/auth/me');
    store.user = res.user;
    return res.user;
  } catch {
    store.user = null;
    return null;
  }
}

export async function loadReferenceData() {
  // A limited partner login is denied the staff list, so each call is tolerated
  // independently rather than failing the whole boot.
  const [lookups, users, settings] = await Promise.all([
    api.get('/api/settings/lookups'),
    api.get('/api/users').catch(() => ({ data: [] })),
    api.get('/api/settings'),
  ]);
  store.lookups = lookups.data;
  store.enums = lookups.enums;
  store.users = users.data;
  store.settings = settings.data;
  await refreshPartners();
}

export async function refreshPartners() {
  try {
    const res = await api.get('/api/partners?limit=200');
    store.partners = res.data;
  } catch {
    store.partners = [];
  }
}

export const staffUsers = () => store.users.filter((u) => u.active && u.role !== 'partner');
export const listValues = (type) => (store.lookups[type] || []).map((x) => x.value);

/** Module-level write permission, mirroring the server's matrix. */
const OPERATIONAL = ['admin', 'manager', 'staff', 'accounts'];

const WRITE_ACCESS = {
  leads: OPERATIONAL,
  followups: OPERATIONAL,
  meetings: OPERATIONAL,
  customers: OPERATIONAL,
  files: OPERATIONAL,
  partners: OPERATIONAL,
  documents: OPERATIONAL,
  invoices: OPERATIONAL,
  payments: OPERATIONAL,
  settings: ['admin'],
  users: ['admin'],
};

export function can(module) {
  const role = store.user?.role;
  if (!role) return false;
  if (role === 'admin') return true;
  return (WRITE_ACCESS[module] || []).includes(role);
}

export const isPartnerLogin = () => store.user?.role === 'partner';

/** Deleting a file, document or customer is reserved for administrators. */
export const canDelete = () => store.user?.role === 'admin';
