import {
  el, card, table, badge, tabs, toast, toastError, formModal, confirmDialog,
  clear, spinner, formValues, field,
} from '../ui.js';
import { api } from '../api.js';
import { store, loadReferenceData, can } from '../store.js';
import { pageHead, partnerOptions } from './common.js';
import { parseHash, navigate } from '../router.js';

const TABS = [
  ['company', 'Company details'],
  ['invoice', 'Invoice template'],
  ['lists', 'Countries, services & lists'],
  ['users', 'Users & roles'],
  ['notifications', 'Notification settings'],
];

export default function settingsView() {
  const active = parseHash().query.tab || 'company';
  const host = el('div');

  const render = async () => {
    clear(host).append(spinner());
    const builders = {
      company: companyPanel, invoice: invoicePanel, lists: listsPanel,
      users: usersPanel, notifications: notificationsPanel,
    };
    const node = await builders[active]();
    clear(host).append(node);
  };
  render();

  return el('div', { class: 'stack' }, [
    pageHead('Settings', 'Company profile, dropdown lists, users and notification rules'),
    tabs(TABS, active, (key) => navigate(`/settings?tab=${key}`)),
    host,
  ]);
}

function settingsForm(fields, { title, description }) {
  const form = el('form', { class: 'stack' }, [
    description ? el('p', { class: 'muted mt-0', text: description }) : null,
    el('div', { class: 'form-grid' }, fields.map(field)),
  ]);
  const save = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Save settings' });
  form.append(el('div', {}, save));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    save.disabled = true; save.textContent = 'Saving…';
    try {
      const res = await api.put('/api/settings', formValues(form));
      store.settings = res.data;
      toast('Settings saved');
    } catch (err) { toastError(err); } finally {
      save.disabled = false; save.textContent = 'Save settings';
    }
  });
  return card(title, form);
}

async function companyPanel() {
  const s = store.settings;
  return settingsForm([
    { name: 'company_name', label: 'Company name', value: s.company_name, required: true },
    { name: 'company_tagline', label: 'Tagline', value: s.company_tagline },
    { name: 'company_phone', label: 'Phone number', value: s.company_phone },
    { name: 'company_phone_alt', label: 'Alternate phone number', value: s.company_phone_alt },
    { name: 'company_email', label: 'Email address', type: 'email', value: s.company_email },
    { name: 'company_website', label: 'Website', value: s.company_website },
    { name: 'company_address', label: 'Office address', type: 'textarea', span: true, value: s.company_address },
    { name: 'company_logo_url', label: 'Logo URL', span: true, value: s.company_logo_url,
      hint: 'Optional. Used on printed invoices when set.' },
  ], { title: 'Company details', description: 'These details appear on invoices and printed documents.' });
}

async function invoicePanel() {
  const s = store.settings;
  return settingsForm([
    { name: 'invoice_prefix', label: 'Invoice number prefix', value: s.invoice_prefix,
      hint: 'Numbers are generated as PREFIX-YEAR-0001' },
    { name: 'file_prefix', label: 'File reference prefix', value: s.file_prefix,
      hint: 'File references become PREFIX-YEAR-0001, e.g. DF-2026-0007' },
    { name: 'invoice_currency', label: 'Default currency', value: s.invoice_currency },
    { name: 'invoice_terms', label: 'Payment terms', type: 'textarea', span: true, value: s.invoice_terms },
    { name: 'invoice_footer', label: 'Invoice footer note', type: 'textarea', span: true, value: s.invoice_footer },
  ], {
    title: 'Invoice & reference numbering',
    description: 'Numbering and the wording shown on every invoice you print or export.',
  });
}

const LIST_TYPES = [
  ['country', 'Countries', 'Shown wherever a destination is chosen'],
  ['service', 'Service categories', 'Tourist visa, tour package, work package…'],
  ['lead_source', 'Lead sources', 'Where your enquiries come from'],
  ['document_category', 'Document categories', 'Used when uploading a document'],
  ['payment_method', 'Payment methods', 'Cash, bKash, Nagad, bank transfer…'],
  ['meeting_type', 'Meeting types', 'Office visit, phone call, video call…'],
  ['checklist_item', 'Default document checklist', 'Added to every new file automatically'],
  ['lead_status', 'Lead statuses', 'Built-in stages cannot be removed — add your own'],
  ['file_status', 'File statuses', 'Built-in stages cannot be removed — add your own'],
];

async function listsPanel() {
  const host = el('div', { class: 'grid grid--2' });

  const render = () => {
    clear(host);
    for (const [type, label, hint] of LIST_TYPES) {
      const items = store.lookups[type] || [];
      const list = el('div', {}, items.map((item) => el('div', { class: 'checkline' }, [
        el('div', { class: 'checkline__name' }, [
          el('div', { text: item.value }),
          item.locked ? el('div', { class: 'cell-sub', text: 'Built-in' }) : null,
        ]),
        item.locked
          // Built-in values drive the dashboard and reports, so they stay put.
          ? el('span', { class: 'faint', title: 'Built-in value — reports depend on it', text: '🔒' })
          : el('button', {
            class: 'btn btn--sm btn--ghost', text: '✕', title: 'Remove from list',
            onClick: async () => {
              if (!await confirmDialog(`Remove "${item.value}" from ${label}? Records already using it keep the value.`)) return;
              try {
                await api.del(`/api/settings/lookups/${item.id}`);
                await loadReferenceData();
                toast('Removed');
                render();
              } catch (err) { toastError(err); }
            },
          }),
      ])));
      if (!items.length) list.append(el('div', { class: 'empty', text: 'This list is empty' }));

      // A long list (countries especially) would otherwise dominate the page.
      const scroller = el('div', {
        style: 'max-height:340px;overflow-y:auto;margin:0 -4px;padding:0 4px',
      }, list);

      host.append(card(`${label} (${items.length})`, [
        hint ? el('p', { class: 'faint small mt-0', text: hint }) : null,
        scroller,
      ], {
        actions: el('button', {
          class: 'btn btn--sm btn--primary', text: '+ Add',
          onClick: () => formModal({
            title: `Add to ${label}`,
            fields: [{ name: 'value', label: label.replace(/s$/, ''), required: true }],
            submitLabel: 'Add',
            onSubmit: async (values) => {
              await api.post('/api/settings/lookups', { type, value: values.value });
              await loadReferenceData();
              toast('Added');
              render();
            },
          }),
        }),
      }));
    }
  };
  render();
  return host;
}

async function usersPanel() {
  const host = el('div');

  const render = async () => {
    clear(host).append(spinner());
    const res = await api.get('/api/users');
    clear(host).append(card('Users & roles', table({
      columns: [
        { label: 'Name', render: (u) => el('div', {}, [
          el('div', { class: 'cell-title', text: u.name }),
          el('div', { class: 'cell-sub', text: u.email }),
        ]) },
        { label: 'Role', render: (u) => badge(roleLabel(u.role), u.role === 'admin' ? 'purple' : 'info') },
        { label: 'Phone', render: (u) => u.phone || '—' },
        { label: 'Linked partner', render: (u) => u.partner_name || '—' },
        { label: 'Status', render: (u) => badge(u.active ? 'Active' : 'Inactive') },
        { label: '', align: 'right', render: (u) => el('div', { class: 'row-actions' }, [
          el('button', { class: 'btn btn--sm', text: 'Edit', onClick: () => userForm(u, render) }),
          el('button', {
            class: 'btn btn--sm', text: 'Reset password',
            onClick: () => formModal({
              title: `Reset password — ${u.name}`,
              fields: [{ name: 'password', label: 'New password', type: 'password', required: true,
                hint: 'At least 8 characters. The user is signed out of all devices.' }],
              submitLabel: 'Reset password',
              onSubmit: async (values) => {
                await api.post(`/api/users/${u.id}/reset-password`, values);
                toast('Password reset');
              },
            }),
          }),
        ]) },
      ],
      rows: res.data,
      empty: 'No users yet',
      emptyIcon: '👥',
    }), {
      flush: true,
      actions: el('button', {
        class: 'btn btn--sm btn--primary', text: '+ Add user',
        onClick: () => userForm(null, render),
      }),
    }));
  };
  await render();

  return el('div', { class: 'stack' }, [
    host,
    card('What each role can do', el('div', { class: 'stack small' }, [
      roleRow('Admin', 'Full access to everything, including users and settings.'),
      roleRow('Manager', 'Leads, customers, B2B partners, files, follow-up, invoices and reports.'),
      roleRow('Staff / Executive', 'Add leads, update follow-up, create customer profiles, update file status and add notes.'),
      roleRow('Accounts / Finance', 'Invoices, payments, due reports and financial summaries.'),
      roleRow('B2B Partner', 'Limited login — sees only the files and invoices under their own partner account.'),
    ])),
  ]);
}

const roleRow = (name, description) => el('div', {}, [
  el('strong', { text: name }), ' — ', el('span', { class: 'muted', text: description }),
]);

const roleLabel = (role) => ({
  admin: 'Admin', manager: 'Manager', staff: 'Staff', accounts: 'Accounts', partner: 'B2B Partner',
}[role] || role);

function userForm(user, onDone) {
  const editing = Boolean(user?.id);
  formModal({
    title: editing ? `Edit user — ${user.name}` : 'Add user',
    fields: [{ legend: 'Account', fields: [
      { name: 'name', label: 'Full name', required: true, value: user?.name },
      { name: 'email', label: 'Email address', type: 'email', required: true, value: user?.email },
      { name: 'phone', label: 'Phone number', value: user?.phone },
      { name: 'role', label: 'Role', type: 'select', required: true,
        options: [
          { value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' },
          { value: 'staff', label: 'Staff / Executive' }, { value: 'accounts', label: 'Accounts / Finance' },
          { value: 'partner', label: 'B2B Partner (limited)' },
        ], value: user?.role || 'staff' },
      { name: 'partner_id', label: 'Linked B2B partner', type: 'select', options: partnerOptions(),
        value: user?.partner_id, hint: 'Required only for a B2B partner login' },
      !editing ? { name: 'password', label: 'Password', type: 'password', required: true,
        hint: 'At least 8 characters' } : null,
      editing ? { name: 'active', label: 'Account status', type: 'select', required: true,
        options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }],
        value: user.active ? '1' : '0' } : null,
    ].filter(Boolean) }],
    submitLabel: editing ? 'Save changes' : 'Create user',
    onSubmit: async (values) => {
      if (editing) values.active = values.active === '1';
      const res = editing
        ? await api.put(`/api/users/${user.id}`, values)
        : await api.post('/api/users', values);
      toast(editing ? 'User updated' : 'User created');
      onDone(res.data);
    },
  });
}

async function notificationsPanel() {
  const s = store.settings;
  const toggle = (name, label, hint) => ({
    name, label, type: 'select', required: true,
    options: [{ value: '1', label: 'On' }, { value: '0', label: 'Off' }],
    value: s[name] === '0' ? '0' : '1', hint,
  });
  return settingsForm([
    toggle('notify_followup_due', 'Follow-up due & overdue alerts', 'Notifies the assigned staff member'),
    toggle('notify_meeting_reminder', 'Meeting reminders', 'Fires at each meeting’s own reminder window'),
    toggle('notify_interview_reminder', 'Interview date reminders', 'Three days ahead of an interview'),
    toggle('notify_payment_due', 'Payment due alerts', 'Notifies admin, managers and accounts'),
    toggle('notify_missing_documents', 'Missing document alerts', 'For files that are ready or already submitted'),
    { name: 'public_tracking', label: 'Public application tracking', type: 'select', required: true,
      options: [{ value: '1', label: 'On' }, { value: '0', label: 'Off' }],
      value: s.public_tracking === '0' ? '0' : '1',
      hint: 'Lets clients check their own status at /track.html using passport number and date of birth' },
  ], {
    title: 'Notification settings',
    description: 'The system checks for these conditions every minute and raises in-app notifications.',
  });
}
