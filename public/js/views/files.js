import {
  el, card, kv, badge, table, fmtDate, fmtDateTime, money, toast, toastError,
  formModal, confirmDialog, clear,
} from '../ui.js';
import { api, qs } from '../api.js';
import { store, can, canDelete, listValues } from '../store.js';
import { navigate } from '../router.js';
import {
  listPage, staffOptions, partnerOptions, countryOptions, serviceOptions,
  activityPanel, documentsPanel, customerPicker,
} from './common.js';
import { followupForm } from './leads.js';
import { invoiceForm } from './invoices.js';

export function fileForm(file, onDone, { customer, partner } = {}) {
  const editing = Boolean(file?.id);
  const picker = editing || customer ? null : customerPicker({ required: true });

  formModal({
    title: editing ? `Edit file — ${file.reference_no}` : 'Open new file',
    wide: true,
    fields: [
      picker,
      { legend: 'File details', fields: [
        { name: 'service_type', label: 'Visa / service type', type: 'select', options: serviceOptions(),
          value: file?.service_type ?? customer?.service_type },
        { name: 'country', label: 'Country', type: 'select', options: countryOptions(),
          value: file?.country ?? customer?.country },
        { name: 'file_type', label: 'File type', value: file?.file_type, placeholder: 'e.g. E-Visa, Sticker Visa' },
        { name: 'application_type', label: 'Application type', value: file?.application_type, placeholder: 'e.g. Individual, Family' },
        { name: 'partner_id', label: 'Linked B2B partner', type: 'select', options: partnerOptions(),
          value: file?.partner_id ?? partner?.id ?? customer?.partner_id },
        { name: 'assigned_to', label: 'Assigned staff', type: 'select', options: staffOptions(),
          value: file?.assigned_to ?? store.user.id },
        { name: 'status', label: 'Current status', type: 'select', options: store.enums.file_statuses,
          value: file?.status || 'Draft', required: true },
        { name: 'stage', label: 'Processing stage', value: file?.stage, placeholder: 'e.g. Awaiting embassy appointment' },
      ] },
      { legend: 'Key dates', fields: [
        { name: 'submission_date', label: 'Submission date', type: 'date', value: file?.submission_date },
        { name: 'embassy_date', label: 'Embassy / VFS date', type: 'date', value: file?.embassy_date },
        { name: 'interview_date', label: 'Interview date', type: 'date', value: file?.interview_date },
        { name: 'completion_date', label: 'Completion date', type: 'date', value: file?.completion_date },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: true, value: file?.remarks },
      ] },
    ].filter(Boolean),
    submitLabel: editing ? 'Save changes' : 'Open file',
    onSubmit: async (values) => {
      if (!editing) values.customer_id = customer?.id ?? values.customer_id;
      if (!editing && !values.customer_id) throw new Error('Please choose a customer for this file');
      const res = editing
        ? await api.put(`/api/files/${file.id}`, values)
        : await api.post('/api/files', values);
      toast(editing ? 'File updated' : `File ${res.data.reference_no} opened`);
      onDone(res.data);
    },
  });
}

export default function filesView() {
  return listPage({
    title: 'Files / Cases',
    subtitle: 'Track every application from draft to delivery',
    endpoint: '/api/files',
    route: 'files',
    searchPlaceholder: 'Search reference, customer name, passport or partner…',
    emptyText: 'No files match these filters',
    emptyIcon: '🗂',
    actions: [can('files') ? el('button', {
      class: 'btn btn--primary', text: '+ Open file',
      onClick: () => fileForm(null, (f) => navigate(`/files/${f.id}`)),
    }) : null],
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: store.enums.file_statuses },
      { name: 'country', label: 'Country', type: 'select', options: countryOptions() },
      { name: 'service_type', label: 'Service', type: 'select', options: serviceOptions() },
      { name: 'partner_id', label: 'B2B partner', type: 'select', options: partnerOptions() },
      { name: 'assigned_to', label: 'Staff', type: 'select', options: staffOptions() },
      { name: 'payment_status', label: 'Payment', type: 'select', options: store.enums.payment_statuses },
    ],
    onRowClick: (row) => navigate(`/files/${row.id}`),
    columns: [
      { label: 'Reference', render: (f) => el('div', {}, [
        el('div', { class: 'cell-title', text: f.reference_no || `#${f.id}` }),
        el('div', { class: 'cell-sub', text: fmtDate(f.created_at) }),
      ]) },
      { label: 'Customer', render: (f) => el('div', {}, [
        el('div', { text: f.customer_name || '—' }),
        el('div', { class: 'cell-sub', text: f.passport_no || '' }),
      ]) },
      { label: 'Service', render: (f) => el('div', {}, [
        el('div', { text: f.service_type || '—' }),
        el('div', { class: 'cell-sub', text: f.country || '' }),
      ]) },
      { label: 'Status', render: (f) => badge(f.status) },
      { label: 'Docs', align: 'right', render: (f) => (f.missing_documents > 0
        ? el('span', { class: 'badge badge--warn', text: `${f.missing_documents} missing` })
        : el('span', { class: 'badge badge--ok', text: 'Complete' })) },
      { label: 'Payment', render: (f) => badge(f.payment_status) },
      { label: 'Partner', render: (f) => f.partner_name || el('span', { class: 'faint', text: 'Direct' }) },
      { label: 'Staff', render: (f) => f.assigned_name || '—' },
    ],
  });
}

export async function fileDetailView({ id }) {
  const res = await api.get(`/api/files/${id}`);
  const f = res.data;
  const editable = can('files');
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  const CLOSED_STATUSES = ['Approved', 'Rejected', 'Delivered', 'Completed'];

  const statusSelect = el('select', {},
    store.enums.file_statuses.map((s) => el('option', { value: s, text: s, selected: s === f.status })));
  statusSelect.addEventListener('change', async () => {
    const next = statusSelect.value;
    // Moving a finished file back into progress is asked about first — a
    // mis-click here changes what the client sees on the tracking page.
    const reopening = CLOSED_STATUSES.includes(f.status) && !CLOSED_STATUSES.includes(next);
    if (reopening && !await confirmDialog(
      `This file is marked ${f.status}. Reopen it as "${next}"?\n\n`
      + 'The completion date will be cleared, and the client sees the new status '
      + 'on the tracking page.',
      { title: 'Reopen this file?' },
    )) { statusSelect.value = f.status; return; }
    try {
      await api.patch(`/api/files/${f.id}/status`, { status: next, reopen: reopening });
      toast(reopening ? `File reopened as ${next}` : `File status set to ${next}`);
      refresh();
    } catch (err) { toastError(err); statusSelect.value = f.status; }
  });

  const head = el('div', { class: 'detail-head' }, [
    el('div', { class: 'detail-head__avatar', text: '🗂' }),
    el('div', { class: 'detail-head__main' }, [
      el('h1', { text: f.reference_no || `File #${f.id}` }),
      el('div', { class: 'detail-head__sub' }, [
        f.customer_id ? el('a', { href: `#/customers/${f.customer_id}`, text: f.customer_name || 'Customer' }) : 'No customer',
        ` · ${f.passport_no || 'No passport'} · ${f.country || 'No country'}`,
      ]),
      el('div', { class: 'detail-head__badges' }, [
        badge(f.status), badge(f.payment_status),
        f.service_type ? badge(f.service_type, 'info') : null,
        f.partner_name ? badge(`B2B: ${f.partner_name}`) : null,
        f.missing_documents > 0 ? badge(`${f.missing_documents} documents missing`, 'warn') : null,
      ]),
    ]),
    el('div', { class: 'detail-head__actions' }, [
      editable ? el('div', { class: 'field' }, [el('label', { text: 'Change status' }), statusSelect]) : null,
      editable ? el('button', { class: 'btn', text: 'Follow-up', onClick: () => followupForm(f, refresh, 'case_file') }) : null,
      can('invoices') ? el('button', {
        class: 'btn btn--accent', text: '+ Invoice',
        onClick: () => invoiceForm(null, refresh, { file: f }),
      }) : null,
      // Clients check their own status with this link — no login needed.
      el('button', {
        class: 'btn', text: '🔗 Tracking link',
        title: 'Copy the public status-check link to send to the client',
        onClick: async (e) => {
          const url = `${window.location.origin}/track.html`;
          try {
            await navigator.clipboard.writeText(url);
            toast('Tracking link copied — the client needs their passport number and name');
          } catch {
            e.target.textContent = url;
            toast('Copy this link manually');
          }
        },
      }),
      editable ? el('button', { class: 'btn', text: 'Edit', onClick: () => fileForm(f, refresh) }) : null,
    ].filter(Boolean)),
  ]);

  const details = card('File details', kv([
    ['Customer', f.customer_id ? el('a', { href: `#/customers/${f.customer_id}`, text: f.customer_name }) : null],
    ['Passport number', f.passport_no],
    ['Phone', f.customer_phone], ['Email', f.customer_email],
    ['Country', f.country], ['Visa / service type', f.service_type],
    ['File type', f.file_type], ['Application type', f.application_type],
    ['Processing stage', f.stage],
    ['Submission date', f.submission_date ? fmtDate(f.submission_date) : null],
    ['Embassy / VFS date', f.embassy_date ? fmtDate(f.embassy_date) : null],
    ['Interview date', f.interview_date ? fmtDate(f.interview_date) : null],
    ['Completion date', f.completion_date ? fmtDate(f.completion_date) : null],
    ['Assigned staff', f.assigned_name],
    ['B2B partner', f.partner_id ? el('a', { href: `#/partners/${f.partner_id}`, text: f.partner_name }) : 'Direct client'],
    ['Created', `${fmtDateTime(f.created_at)}${f.created_by_name ? ` by ${f.created_by_name}` : ''}`],
    ['Remarks', f.remarks],
  ]));

  const checklistCard = card('Document checklist', checklist(f.id, res.checklist, editable, refresh), {
    actions: editable ? el('button', {
      class: 'btn btn--sm', text: '+ Add item',
      onClick: () => formModal({
        title: 'Add checklist item',
        fields: [{ legend: 'Required document', fields: [
          { name: 'name', label: 'Document name', required: true,
            type: 'select', options: listValues('document_category'), blank: '— choose or type below —' },
          { name: 'note', label: 'Note', value: '' },
        ] }],
        submitLabel: 'Add',
        onSubmit: async (values) => {
          await api.post(`/api/files/${f.id}/checklist`, values);
          toast('Checklist item added');
          refresh();
        },
      }),
    }) : null,
  });

  const invoicesCard = card('Invoices for this file', table({
    columns: [
      { label: 'Invoice', render: (i) => el('a', { href: `#/invoices/${i.id}`, class: 'cell-title', text: i.invoice_no }) },
      { label: 'Date', render: (i) => fmtDate(i.issue_date) },
      { label: 'Total', align: 'right', render: (i) => money(i.total, i.currency) },
      { label: 'Due', align: 'right', render: (i) => money(i.total - i.paid, i.currency) },
      { label: 'Status', render: (i) => badge(i.status) },
    ],
    rows: res.invoices,
    empty: 'No invoice raised for this file yet',
    emptyIcon: '🧾',
  }), { flush: true });

  return el('div', { class: 'stack' }, [
    el('div', { class: 'flex' }, [
      el('a', { class: 'btn btn--sm btn--ghost', href: '#/files', text: '← All files' }),
      canDelete() ? el('button', {
        class: 'btn btn--sm btn--ghost', text: 'Archive',
        onClick: async () => {
          if (!await confirmDialog(`Archive file ${f.reference_no}?\n\nIt stays in the database and an administrator can restore it — it just stops appearing in lists, counts and reports.`)) return;
          try { await api.del(`/api/files/${f.id}`); toast('File archived'); navigate('/files'); }
          catch (err) { toastError(err); }
        },
      }) : null,
    ]),
    head,
    details,
    el('div', { class: 'grid grid--2' }, [checklistCard, invoicesCard]),
    documentsPanel('case_file', Number(id), res.documents, { canEdit: can('documents'), onChange: refresh }),
    activityPanel('case_file', Number(id)),
  ]);
}

function checklist(fileId, items, editable, onChange) {
  if (!items.length) return el('div', { class: 'empty', text: 'No checklist items' });
  return el('div', {}, items.map((item) => {
    const select = el('select', { style: 'width:auto' },
      store.enums.checklist_statuses.map((s) => el('option', { value: s, text: s, selected: s === item.status })));
    select.disabled = !editable;
    select.addEventListener('change', async () => {
      try {
        await api.patch(`/api/files/${fileId}/checklist/${item.id}`, { status: select.value });
        toast(`${item.name}: ${select.value}`);
        onChange();
      } catch (err) { toastError(err); }
    });
    return el('div', { class: 'checkline' }, [
      el('span', { text: item.status === 'Received' ? '✅' : item.status === 'Missing' ? '⚠️' : '—' }),
      el('div', { class: 'checkline__name' }, [
        el('div', { text: item.name }),
        item.note ? el('div', { class: 'cell-sub', text: item.note }) : null,
      ]),
      select,
      editable ? el('button', {
        class: 'btn btn--sm btn--ghost', text: '✕', title: 'Remove',
        onClick: async () => {
          try { await api.del(`/api/files/${fileId}/checklist/${item.id}`); onChange(); }
          catch (err) { toastError(err); }
        },
      }) : null,
    ]);
  }));
}
