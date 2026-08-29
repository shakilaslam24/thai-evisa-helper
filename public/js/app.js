import { loadSession, loadReferenceData, store } from './store.js';
import { renderLogin } from './login.js';
import { buildShell, renderNav, refreshNotifications, applyTheme } from './shell.js';
import { route, setNotFound, startRouter } from './router.js';
import { el } from './ui.js';

import dashboardView from './views/dashboard.js';
import leadsView, { leadDetailView } from './views/leads.js';
import followupsView from './views/followups.js';
import meetingsView from './views/meetings.js';
import customersView, { customerDetailView } from './views/customers.js';
import filesView, { fileDetailView } from './views/files.js';
import partnersView, { partnerDetailView } from './views/partners.js';
import documentsView from './views/documents.js';
import invoicesView, { invoiceDetailView } from './views/invoices.js';
import paymentsView from './views/payments.js';
import reportsView from './views/reports.js';
import staffView from './views/staff.js';
import notificationsView from './views/notifications.js';
import settingsView from './views/settings.js';

const root = document.getElementById('root');

function registerRoutes() {
  route('dashboard', dashboardView);
  route('leads', (r) => (r.id ? leadDetailView(r) : leadsView(r)));
  route('followups', followupsView);
  route('meetings', meetingsView);
  route('customers', (r) => (r.id ? customerDetailView(r) : customersView(r)));
  route('files', (r) => (r.id ? fileDetailView(r) : filesView(r)));
  route('partners', (r) => (r.id ? partnerDetailView(r) : partnersView(r)));
  route('documents', documentsView);
  route('invoices', (r) => (r.id ? invoiceDetailView(r) : invoicesView(r)));
  route('payments', paymentsView);
  route('reports', reportsView);
  route('staff', staffView);
  route('notifications', notificationsView);
  route('settings', settingsView);
  setNotFound(() => el('div', { class: 'card' }, el('div', { class: 'card__body' }, [
    el('h2', { text: 'Page not found' }),
    el('p', { class: 'muted', text: 'That page does not exist. Use the menu to continue.' }),
    el('a', { class: 'btn btn--primary mt-1', href: '#/dashboard', text: 'Back to dashboard' }),
  ])));
}

async function startApp() {
  await loadReferenceData();
  const { shell, outlet } = buildShell();
  root.replaceChildren(shell);
  registerRoutes();
  startRouter(outlet, (parsed) => renderNav(parsed.name));
  refreshNotifications();
  // Poll quietly so reminders surface without the user reloading.
  setInterval(refreshNotifications, 60000);
}

async function boot() {
  applyTheme();
  const user = await loadSession();
  if (!user) {
    renderLogin(root, (signedIn) => { store.user = signedIn; startApp(); });
    return;
  }
  await startApp();
}

boot();
