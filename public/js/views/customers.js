import {
  el, card, kv, badge, table, fmtDate, fmtDateTime, money, toast, toastError,
  formModal, confirmDialog, initials,
} from '../ui.js';
import { api, qs } from '../api.js';
import { store, can, canDelete } from '../store.js';
import { navigate } from '../router.js';
import {
  listPage, staffOptions, partnerOptions, countryOptions, serviceOptions,
  activityPanel, documentsPanel,
} from './common.js';
import { followupForm, meetingForm } from './leads.js';
import { fileForm } from './files.js';
import { invoiceForm } from './invoices.js';

const customerFields = (c = {}) => [
  { legend: 'Personal details', fields: [
    { name: 'given_name', label: 'Given name', required: true, value: c.given_name },
    { name: 'surname', label: 'Surname', value: c.surname },
    { name: 'dob', label: 'Date of birth', type: 'date', value: c.dob },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], value: c.gender },
    { name: 'nationality', label: 'Nationality', value: c.nationality || 'Bangladeshi' },
    { name: 'passport_no', label: 'Passport number', value: c.passport_no },
    { name: 'nid', label: 'NID number', value: c.nid },
  ] },
  { legend: 'Contact', fields: [
    { name: 'phone', label: 'Phone number', value: c.phone },
    { name: 'whatsapp', label: 'WhatsApp number', value: c.whatsapp },
    { name: 'email', label: 'Email', type: 'email', value: c.email },
    { name: 'address', label: 'Address', span: true, value: c.address },
  ] },
  { legend: 'Service', fields: [
    { name: 'service_type', label: 'Service type', type: 'select', options: serviceOptions(), value: c.service_type },
    { name: 'country', label: 'Country applied for', type: 'select', options: countryOptions(), value: c.country },
    { name: 'partner_id', label: 'Linked B2B partner', type: 'select', options: partnerOptions(), value: c.partner_id },
    { name: 'assigned_to', label: 'Assigned staff', type: 'select', options: staffOptions(), value: c.assigned_to ?? store.user.id },
    { name: 'notes', label: 'Special notes', type: 'textarea', span: true, value: c.notes },
  ] },
];

export function customerForm(customer, onDone) {
  const editing = Boolean(customer?.id);
  formModal({
    title: editing ? `Edit customer — ${customer.given_name}` : 'Add new customer',
    wide: true,
    fields: customerFields(customer || {}),
    submitLabel: editing ? 'Save changes' : 'Create customer',
    onSubmit: async (values) => {
      const res = editing
        ? await api.put(`/api/customers/${customer.id}`, values)
        : await api.post('/api/customers', values);
      toast(editing ? 'Customer updated' : 'Customer created');
      onDone(res.data);
    },
  });
}

export default function customersView() {
  return listPage({
    title: 'Customers',
    subtitle: 'Confirmed clients and their visa, tour and work package profiles',
    endpoint: '/api/customers',
    route: 'customers',
    searchPlaceholder: 'Search name, passport number, phone or email…',
    emptyText: 'No customers match these filters',
    emptyIcon: '☺',
    actions: [can('customers') ? el('button', {
      class: 'btn btn--primary', text: '+ Add customer',
      onClick: () => customerForm(null, (c) => navigate(`/customers/${c.id}`)),
    }) : null],
    filters: [
      { name: 'country', label: 'Country', type: 'select', options: countryOptions() },
      { name: 'service_type', label: 'Service', type: 'select', options: serviceOptions() },
      { name: 'partner_id', label: 'B2B partner', type: 'select', options: partnerOptions() },
      { name: 'assigned_to', label: 'Staff', type: 'select', options: staffOptions() },
      { name: 'date_from', label: 'Added from', type: 'date' },
      { name: 'date_to', label: 'Added to', type: 'date' },
    ],
    onRowClick: (row) => navigate(`/customers/${row.id}`),
    columns: [
      { label: 'Customer', render: (c) => el('div', {}, [
        el('div', { class: 'cell-title', text: c.full_name }),
        el('div', { class: 'cell-sub', text: [c.phone, c.email].filter(Boolean).join(' · ') || '—' }),
      ]) },
      { label: 'Passport', render: (c) => c.passport_no || '—' },
      { label: 'Service', render: (c) => el('div', {}, [
        el('div', { text: c.service_type || '—' }),
        el('div', { class: 'cell-sub', text: c.country || '' }),
      ]) },
      { label: 'Partner', render: (c) => c.partner_name || el('span', { class: 'faint', text: 'Direct' }) },
      { label: 'Files', align: 'right', render: (c) => String(c.file_count) },
      { label: 'Outstanding', align: 'right', render: (c) => (c.outstanding_due > 0
        ? el('span', { class: 'badge badge--danger', text: money(c.outstanding_due, store.settings.invoice_currency) })
        : el('span', { class: 'faint', text: '—' })) },
      { label: 'Staff', render: (c) => c.assigned_name || '—' },
    ],
  });
}

export async function customerDetailView({ id }) {
  const res = await api.get(`/api/customers/${id}`);
  const c = res.data;
  const editable = can('customers');
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const currency = store.settings.invoice_currency || 'BDT';

  const head = el('div', { class: 'detail-head' }, [
    el('div', { class: 'detail-head__avatar', text: initials(c.full_name) }),
    el('div', { class: 'detail-head__main' }, [
      el('h1', { text: c.full_name }),
      el('div', { class: 'detail-head__sub', text: [c.passport_no, c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details recorded' }),
      el('div', { class: 'detail-head__badges' }, [
        c.service_type ? badge(c.service_type, 'info') : null,
        c.country ? badge(c.country, 'purple') : null,
        c.partner_name ? badge(`B2B: ${c.partner_name}`) : null,
        c.outstanding_due > 0 ? badge(`Due ${money(c.outstanding_due, currency)}`, 'danger') : null,
      ]),
    ]),
    el('div', { class: 'detail-head__actions' }, [
      c.phone ? el('a', { class: 'btn', href: `tel:${c.phone}`, text: '📞 Call' }) : null,
      c.whatsapp ? el('a', {
        class: 'btn', target: '_blank', rel: 'noopener',
        href: `https://wa.me/${String(c.whatsapp).replace(/[^0-9]/g, '')}`, text: '💬 WhatsApp',
      }) : null,
      editable ? el('button', { class: 'btn', text: 'Follow-up', onClick: () => followupForm(c, refresh, 'customer') }) : null,
      editable ? el('button', { class: 'btn', text: 'Meeting', onClick: () => meetingForm({ ...c, full_name: c.full_name }, refresh, 'customer') }) : null,
      can('files') ? el('button', { class: 'btn btn--accent', text: '+ New file', onClick: () => fileForm(null, refresh, { customer: c }) }) : null,
      can('invoices') ? el('button', { class: 'btn btn--accent', text: '+ Invoice', onClick: () => invoiceForm(null, refresh, { customer: c }) }) : null,
      editable ? el('button', { class: 'btn', text: 'Edit', onClick: () => customerForm(c, refresh) }) : null,
    ].filter(Boolean)),
  ]);

  const profile = card('Customer profile', kv([
    ['Given name', c.given_name], ['Surname', c.surname],
    ['Date of birth', c.dob ? fmtDate(c.dob) : null],
    ['Gender', c.gender], ['Nationality', c.nationality],
    ['Passport number', c.passport_no], ['NID number', c.nid],
    ['Phone', c.phone], ['WhatsApp', c.whatsapp], ['Email', c.email],
    ['Address', c.address],
    ['Service type', c.service_type], ['Country applied for', c.country],
    ['B2B partner', c.partner_name || 'Direct client'],
    ['Assigned staff', c.assigned_name],
    ['Created', `${fmtDateTime(c.created_at)}${c.created_by_name ? ` by ${c.created_by_name}` : ''}`],
    ['Special notes', c.notes],
    res.lead ? ['Originated from lead', el('a', { href: `#/leads/${res.lead.id}`, text: `${res.lead.full_name} (${res.lead.source || 'no source'})` })] : null,
  ]));

  const filesCard = card('Files / cases', table({
    columns: [
      { label: 'Reference', render: (f) => el('a', { href: `#/files/${f.id}`, class: 'cell-title', text: f.reference_no || `#${f.id}` }) },
      { label: 'Service', render: (f) => `${f.service_type || '—'} · ${f.country || '—'}` },
      { label: 'Status', render: (f) => badge(f.status) },
      { label: 'Payment', render: (f) => badge(f.payment_status) },
      { label: 'Submitted', render: (f) => fmtDate(f.submission_date) },
      { label: 'Staff', render: (f) => f.assigned_name || '—' },
    ],
    rows: res.files,
    empty: 'No files opened for this customer yet',
    emptyIcon: '🗂',
    onRowClick: (f) => navigate(`/files/${f.id}`),
  }), { flush: true, actions: can('files') ? el('button', { class: 'btn btn--sm btn--primary', text: '+ New file', onClick: () => fileForm(null, refresh, { customer: c }) }) : null });

  const invoicesCard = card('Invoices', table({
    columns: [
      { label: 'Invoice', render: (i) => el('a', { href: `#/invoices/${i.id}`, class: 'cell-title', text: i.invoice_no }) },
      { label: 'Date', render: (i) => fmtDate(i.issue_date) },
      { label: 'Total', align: 'right', render: (i) => money(i.total, i.currency) },
      { label: 'Paid', align: 'right', render: (i) => money(i.paid, i.currency) },
      { label: 'Due', align: 'right', render: (i) => money(i.total - i.paid, i.currency) },
      { label: 'Status', render: (i) => badge(i.status) },
    ],
    rows: res.invoices,
    empty: 'No invoices raised for this customer',
    emptyIcon: '🧾',
  }), { flush: true, actions: can('invoices') ? el('button', { class: 'btn btn--sm btn--primary', text: '+ Invoice', onClick: () => invoiceForm(null, refresh, { customer: c }) }) : null });

  return el('div', { class: 'stack' }, [
    el('div', { class: 'flex' }, [
      el('a', { class: 'btn btn--sm btn--ghost', href: '#/customers', text: '← All customers' }),
      canDelete() ? el('button', {
        class: 'btn btn--sm btn--ghost', text: 'Delete customer',
        onClick: async () => {
          if (!await confirmDialog(`Delete ${c.full_name}? Their files and documents go with them.`)) return;
          try { await api.del(`/api/customers/${c.id}`); toast('Customer deleted'); navigate('/customers'); }
          catch (err) { toastError(err); }
        },
      }) : null,
    ]),
    head,
    profile,
    filesCard,
    invoicesCard,
    documentsPanel('customer', Number(id), res.documents, { canEdit: can('documents'), onChange: refresh }),
    activityPanel('customer', Number(id)),
  ]);
}
