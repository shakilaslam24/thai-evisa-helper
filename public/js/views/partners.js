import {
  el, card, kv, badge, table, statCard, fmtDate, fmtDateTime, money, toast, toastError,
  formModal, confirmDialog, initials,
} from '../ui.js';
import { api, qs } from '../api.js';
import { store, can } from '../store.js';
import { navigate } from '../router.js';
import { refreshPartners } from '../store.js';
import {
  listPage, countryOptions, serviceOptions, activityPanel, documentsPanel, staffOptions,
} from './common.js';
import { followupForm, meetingForm } from './leads.js';
import { invoiceForm } from './invoices.js';

const partnerFields = (p = {}) => [
  { legend: 'Partner', fields: [
    { name: 'partner_name', label: 'Partner name', required: true, value: p.partner_name },
    { name: 'company_name', label: 'Company name', value: p.company_name },
    { name: 'status', label: 'Status', type: 'select', required: true,
      options: store.enums.partner_statuses, value: p.status || 'Active' },
  ] },
  { legend: 'Contact', fields: [
    { name: 'personal_phone', label: 'Personal phone number', value: p.personal_phone },
    { name: 'company_phone', label: 'Company phone number', value: p.company_phone },
    { name: 'whatsapp', label: 'WhatsApp number', value: p.whatsapp },
    { name: 'email', label: 'Email', type: 'email', value: p.email },
    { name: 'personal_address', label: 'Personal address', span: true, value: p.personal_address },
    { name: 'company_address', label: 'Company address', span: true, value: p.company_address },
  ] },
  { legend: 'Documents & agreement', fields: [
    { name: 'trade_license', label: 'Trade license number', value: p.trade_license },
    { name: 'nid_passport', label: 'NID / Passport number', value: p.nid_passport },
    { name: 'commission_note', label: 'Commission / rate note', type: 'textarea', span: true, value: p.commission_note },
    { name: 'agreement_note', label: 'Special agreement note', type: 'textarea', span: true, value: p.agreement_note },
  ] },
];

export function partnerForm(partner, onDone) {
  const editing = Boolean(partner?.id);
  formModal({
    title: editing ? `Edit partner — ${partner.partner_name}` : 'Add B2B partner',
    wide: true,
    fields: partnerFields(partner || {}),
    submitLabel: editing ? 'Save changes' : 'Add partner',
    onSubmit: async (values) => {
      const res = editing
        ? await api.put(`/api/partners/${partner.id}`, values)
        : await api.post('/api/partners', values);
      await refreshPartners();
      toast(editing ? 'Partner updated' : 'Partner added');
      onDone(res.data);
    },
  });
}

export default function partnersView() {
  return listPage({
    title: 'B2B Partners',
    subtitle: 'Agents and sub-agents submitting files through DreamFly',
    endpoint: '/api/partners',
    route: 'partners',
    searchPlaceholder: 'Search partner, company, phone or email…',
    emptyText: 'No partners match these filters',
    emptyIcon: '⇄',
    actions: [can('partners') ? el('button', {
      class: 'btn btn--primary', text: '+ Add partner',
      onClick: () => partnerForm(null, (p) => navigate(`/partners/${p.id}`)),
    }) : null],
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: store.enums.partner_statuses },
    ],
    onRowClick: (row) => navigate(`/partners/${row.id}`),
    columns: [
      { label: 'Partner', render: (p) => el('div', {}, [
        el('div', { class: 'cell-title', text: p.partner_name }),
        el('div', { class: 'cell-sub', text: p.company_name || '—' }),
      ]) },
      { label: 'Contact', render: (p) => el('div', {}, [
        el('div', { text: p.personal_phone || p.company_phone || '—' }),
        el('div', { class: 'cell-sub', text: p.email || '' }),
      ]) },
      { label: 'Files', align: 'right', render: (p) => String(p.total_files) },
      { label: 'Approved', align: 'right', render: (p) => String(p.approved_files) },
      { label: 'Rejected', align: 'right', render: (p) => String(p.rejected_files) },
      { label: 'Outstanding', align: 'right', render: (p) => (p.outstanding_due > 0
        ? el('span', { class: 'badge badge--danger', text: money(p.outstanding_due, store.settings.invoice_currency) })
        : el('span', { class: 'faint', text: '—' })) },
      { label: 'Status', render: (p) => badge(p.status) },
    ],
  });
}

export async function partnerDetailView({ id }) {
  const [detail, filesRes, invoicesRes, paymentsRes, docsRes] = await Promise.all([
    api.get(`/api/partners/${id}`),
    api.get(`/api/partners/${id}/files`),
    api.get(`/api/partners/${id}/invoices`),
    api.get(`/api/partners/${id}/payments`),
    api.get(`/api/documents${qs({ entity_type: 'partner', entity_id: id })}`),
  ]);
  const p = detail.data;
  const s = detail.summary;
  const editable = can('partners');
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const currency = store.settings.invoice_currency || 'BDT';

  const head = el('div', { class: 'detail-head' }, [
    el('div', { class: 'detail-head__avatar', text: initials(p.partner_name) }),
    el('div', { class: 'detail-head__main' }, [
      el('h1', { text: p.partner_name }),
      el('div', { class: 'detail-head__sub', text: [p.company_name, p.personal_phone, p.email].filter(Boolean).join(' · ') || 'No contact details recorded' }),
      el('div', { class: 'detail-head__badges' }, [
        badge(p.status),
        badge(`${s.total_files} files`, 'info'),
        s.total_due > 0 ? badge(`Due ${money(s.total_due, currency)}`, 'danger') : badge('No dues', 'ok'),
      ]),
    ]),
    el('div', { class: 'detail-head__actions' }, [
      p.personal_phone ? el('a', { class: 'btn', href: `tel:${p.personal_phone}`, text: '📞 Call' }) : null,
      p.whatsapp ? el('a', {
        class: 'btn', target: '_blank', rel: 'noopener',
        href: `https://wa.me/${String(p.whatsapp).replace(/[^0-9]/g, '')}`, text: '💬 WhatsApp',
      }) : null,
      can('files') ? el('button', {
        class: 'btn btn--accent', text: '+ Add file under partner',
        onClick: () => partnerFileEntry(p, refresh),
      }) : null,
      can('invoices') ? el('button', {
        class: 'btn btn--accent', text: '+ Invoice',
        onClick: () => invoiceForm(null, refresh, { partner: p }),
      }) : null,
      editable ? el('button', { class: 'btn', text: 'Follow-up', onClick: () => followupForm(p, refresh, 'partner') }) : null,
      editable ? el('button', { class: 'btn', text: 'Edit', onClick: () => partnerForm(p, refresh) }) : null,
    ].filter(Boolean)),
  ]);

  const stats = el('div', { class: 'grid grid--stats' }, [
    statCard({ label: 'Total files', value: s.total_files }),
    statCard({ label: 'Under processing', value: s.under_processing }),
    statCard({ label: 'Approved', value: s.approved, tone: 'ok' }),
    statCard({ label: 'Rejected', value: s.rejected, tone: s.rejected ? 'alert' : undefined }),
    statCard({ label: 'Interview called', value: s.interview_called }),
    statCard({ label: 'Documents missing', value: s.missing_documents, tone: s.missing_documents ? 'alert' : undefined }),
    statCard({ label: 'Total billed', value: money(s.total_billed, currency) }),
    statCard({ label: 'Total paid', value: money(s.total_paid, currency), tone: 'ok' }),
    statCard({ label: 'Outstanding', value: money(s.total_due, currency), tone: s.total_due > 0 ? 'alert' : undefined }),
  ]);

  const profile = card('Partner profile', kv([
    ['Partner name', p.partner_name], ['Company name', p.company_name],
    ['Personal phone', p.personal_phone], ['Company phone', p.company_phone],
    ['WhatsApp', p.whatsapp], ['Email', p.email],
    ['Personal address', p.personal_address], ['Company address', p.company_address],
    ['Trade license', p.trade_license], ['NID / Passport', p.nid_passport],
    ['Commission / rate', p.commission_note], ['Special agreement', p.agreement_note],
    ['Status', badge(p.status)],
    ['Added', `${fmtDateTime(p.created_at)}${p.created_by_name ? ` by ${p.created_by_name}` : ''}`],
  ]));

  const filesCard = card(`Files submitted (${filesRes.data.length})`, table({
    columns: [
      { label: 'Reference', render: (f) => el('a', { href: `#/files/${f.id}`, class: 'cell-title', text: f.reference_no || `#${f.id}` }) },
      { label: 'Customer', render: (f) => el('div', {}, [
        el('div', { text: f.customer_name || '—' }),
        el('div', { class: 'cell-sub', text: f.passport_no || '' }),
      ]) },
      { label: 'Service', render: (f) => `${f.service_type || '—'} · ${f.country || '—'}` },
      { label: 'Status', render: (f) => badge(f.status) },
      { label: 'Payment', render: (f) => badge(f.payment_status) },
      { label: 'Submitted', render: (f) => fmtDate(f.submission_date) },
    ],
    rows: filesRes.data,
    empty: 'This partner has not submitted any files yet',
    emptyIcon: '🗂',
    onRowClick: (f) => navigate(`/files/${f.id}`),
  }), { flush: true, actions: can('files') ? el('button', {
    class: 'btn btn--sm btn--primary', text: '+ Add file',
    onClick: () => partnerFileEntry(p, refresh),
  }) : null });

  const invoicesCard = card('Invoice history', table({
    columns: [
      { label: 'Invoice', render: (i) => el('a', { href: `#/invoices/${i.id}`, class: 'cell-title', text: i.invoice_no }) },
      { label: 'Date', render: (i) => fmtDate(i.issue_date) },
      { label: 'Total', align: 'right', render: (i) => money(i.total, i.currency) },
      { label: 'Paid', align: 'right', render: (i) => money(i.paid, i.currency) },
      { label: 'Due', align: 'right', render: (i) => money(i.total - i.paid, i.currency) },
      { label: 'Status', render: (i) => badge(i.status) },
    ],
    rows: invoicesRes.data,
    empty: 'No invoices raised for this partner',
    emptyIcon: '🧾',
  }), { flush: true });

  const paymentsCard = card('Payment history', table({
    columns: [
      { label: 'Date', render: (p2) => fmtDate(p2.paid_at) },
      { label: 'Invoice', render: (p2) => p2.invoice_no },
      { label: 'Method', render: (p2) => p2.method },
      { label: 'Reference', render: (p2) => p2.reference || '—' },
      { label: 'Amount', align: 'right', render: (p2) => money(p2.amount, currency) },
      { label: 'Received by', render: (p2) => p2.received_by_name || '—' },
    ],
    rows: paymentsRes.data,
    empty: 'No payments received from this partner yet',
    emptyIcon: '৳',
  }), { flush: true });

  return el('div', { class: 'stack' }, [
    el('div', { class: 'flex' }, [
      el('a', { class: 'btn btn--sm btn--ghost', href: '#/partners', text: '← All partners' }),
      editable ? el('button', {
        class: 'btn btn--sm btn--ghost', text: 'Delete partner',
        onClick: async () => {
          if (!await confirmDialog(`Delete partner "${p.partner_name}"? Their files stay but lose the partner link.`)) return;
          try {
            await api.del(`/api/partners/${p.id}`);
            await refreshPartners();
            toast('Partner deleted'); navigate('/partners');
          } catch (err) { toastError(err); }
        },
      }) : null,
    ]),
    head,
    stats,
    profile,
    filesCard,
    el('div', { class: 'grid grid--2' }, [invoicesCard, paymentsCard]),
    documentsPanel('partner', Number(id), docsRes.data, { canEdit: can('documents'), onChange: refresh }),
    activityPanel('partner', Number(id)),
  ]);
}

/** Section 8.3 — quick file entry that creates the customer and file together. */
export function partnerFileEntry(partner, onDone) {
  formModal({
    title: `Add file under ${partner.partner_name}`,
    wide: true,
    fields: [
      el('p', { class: 'muted mt-0', text: 'A customer profile is created automatically. If the passport number already exists, the file is added to that existing customer.' }),
      { legend: 'Traveller details', fields: [
        { name: 'passport_no', label: 'Passport number', value: '' },
        { name: 'surname', label: 'Surname', value: '' },
        { name: 'given_name', label: 'Given name', required: true, value: '' },
        { name: 'dob', label: 'Date of birth', type: 'date' },
        { name: 'phone', label: 'Phone number' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', span: true },
      ] },
      { legend: 'File details', fields: [
        { name: 'country', label: 'Country', type: 'select', options: countryOptions() },
        { name: 'service_type', label: 'Service type', type: 'select', options: serviceOptions() },
        { name: 'status', label: 'Status', type: 'select', options: store.enums.file_statuses, value: 'Draft', required: true },
        { name: 'reference_no', label: 'Reference number', placeholder: 'Leave blank to auto-generate' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: true },
      ] },
    ],
    submitLabel: 'Save file',
    onSubmit: async (values) => {
      const res = await api.post('/api/files/partner-entry', { ...values, partner_id: partner.id });
      toast(`File ${res.data.reference_no} added`);
      onDone?.();
    },
  });
}
