import {
  el, card, kv, badge, table, fmtDate, fmtDateTime, toast, toastError, formModal,
  confirmDialog, toInputDateTime, toSqlDateTime, initials,
} from '../ui.js';
import { api, qs } from '../api.js';
import { store, can, listValues } from '../store.js';
import { navigate } from '../router.js';
import {
  listPage, pageHead, staffOptions, countryOptions, serviceOptions, sourceOptions,
  activityPanel, documentsPanel,
} from './common.js';

const leadFields = (lead = {}) => [
  { legend: 'Contact details', fields: [
    { name: 'full_name', label: 'Full name', required: true, value: lead.full_name },
    { name: 'phone', label: 'Phone number', value: lead.phone },
    { name: 'whatsapp', label: 'WhatsApp number', value: lead.whatsapp },
    { name: 'email', label: 'Email', type: 'email', value: lead.email },
    { name: 'address', label: 'Address', span: true, value: lead.address },
  ] },
  { legend: 'Enquiry', fields: [
    { name: 'source', label: 'Lead source', type: 'select', options: sourceOptions(), value: lead.source },
    { name: 'service_type', label: 'Interested service', type: 'select', options: serviceOptions(), value: lead.service_type },
    { name: 'country', label: 'Interested country', type: 'select', options: countryOptions(), value: lead.country },
    { name: 'priority', label: 'Priority', type: 'select', options: store.enums.lead_priorities, value: lead.priority || 'Warm', required: true },
    { name: 'status', label: 'Status', type: 'select', options: store.enums.lead_statuses, value: lead.status || 'New Lead', required: true },
    { name: 'assigned_to', label: 'Assigned staff', type: 'select', options: staffOptions(), value: lead.assigned_to ?? store.user.id },
  ] },
  { legend: 'Follow-up', fields: [
    { name: 'next_followup_at', label: 'Next follow-up date & time', type: 'datetime-local', value: toInputDateTime(lead.next_followup_at) },
    { name: 'initial_note', label: 'Note', type: 'textarea', span: true, value: lead.initial_note },
  ] },
];

function leadForm(lead, onDone) {
  const editing = Boolean(lead?.id);
  formModal({
    title: editing ? `Edit lead — ${lead.full_name}` : 'Add new lead',
    wide: true,
    fields: leadFields(lead || {}),
    submitLabel: editing ? 'Save changes' : 'Create lead',
    onSubmit: async (values) => {
      values.next_followup_at = toSqlDateTime(values.next_followup_at);
      const res = editing
        ? await api.put(`/api/leads/${lead.id}`, values)
        : await api.post('/api/leads', values);
      toast(editing ? 'Lead updated' : 'Lead created');
      onDone(res.data);
    },
  });
}

export default function leadsView() {
  return listPage({
    title: 'Leads',
    subtitle: 'Every enquiry, from first contact to conversion',
    endpoint: '/api/leads',
    route: 'leads',
    searchPlaceholder: 'Search name, phone, WhatsApp or email…',
    emptyText: 'No leads match these filters',
    emptyIcon: '◈',
    actions: [can('leads') ? el('button', {
      class: 'btn btn--primary', text: '+ Add lead',
      onClick: () => leadForm(null, (lead) => navigate(`/leads/${lead.id}`)),
    }) : null],
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: store.enums.lead_statuses },
      { name: 'priority', label: 'Priority', type: 'select', options: store.enums.lead_priorities },
      { name: 'source', label: 'Source', type: 'select', options: sourceOptions() },
      { name: 'country', label: 'Country', type: 'select', options: countryOptions() },
      { name: 'assigned_to', label: 'Staff', type: 'select', options: staffOptions() },
      { name: 'due', label: 'Follow-up', type: 'select', options: [
        { value: 'today', label: 'Due today' }, { value: 'overdue', label: 'Overdue' }] },
    ],
    onRowClick: (row) => navigate(`/leads/${row.id}`),
    columns: [
      { label: 'Lead', render: (r) => el('div', {}, [
        el('div', { class: 'cell-title', text: r.full_name }),
        el('div', { class: 'cell-sub', text: [r.phone, r.email].filter(Boolean).join(' · ') || '—' }),
      ]) },
      { label: 'Interest', render: (r) => el('div', {}, [
        el('div', { text: r.service_type || '—' }),
        el('div', { class: 'cell-sub', text: r.country || '' }),
      ]) },
      { label: 'Source', render: (r) => r.source || '—' },
      { label: 'Priority', render: (r) => badge(r.priority) },
      { label: 'Status', render: (r) => badge(r.status) },
      { label: 'Next follow-up', render: (r) => {
        if (!r.next_followup_at) return el('span', { class: 'faint', text: '—' });
        const overdue = new Date(String(r.next_followup_at).replace(' ', 'T')) < new Date();
        return el('span', { class: overdue ? 'badge badge--danger' : '', text: fmtDateTime(r.next_followup_at) });
      } },
      { label: 'Staff', render: (r) => r.assigned_name || '—' },
    ],
  });
}

export async function leadDetailView({ id }) {
  const [leadRes, followRes, meetRes] = await Promise.all([
    api.get(`/api/leads/${id}`),
    api.get(`/api/followups${qs({ entity_type: 'lead', entity_id: id, limit: 50 })}`),
    api.get(`/api/meetings${qs({ entity_type: 'lead', entity_id: id, limit: 50 })}`),
  ]);
  const lead = leadRes.data;
  const editable = can('leads');
  const refresh = () => { window.dispatchEvent(new HashChangeEvent('hashchange')); };

  const actions = [
    lead.phone ? el('a', { class: 'btn', href: `tel:${lead.phone}`, text: '📞 Call' }) : null,
    lead.whatsapp ? el('a', {
      class: 'btn', target: '_blank', rel: 'noopener',
      href: `https://wa.me/${String(lead.whatsapp).replace(/[^0-9]/g, '')}`, text: '💬 WhatsApp',
    }) : null,
    editable ? el('button', { class: 'btn', text: 'Add follow-up', onClick: () => followupForm(lead, refresh) }) : null,
    editable ? el('button', { class: 'btn', text: 'Schedule meeting', onClick: () => meetingForm(lead, refresh) }) : null,
    editable ? el('button', { class: 'btn', text: 'Edit', onClick: () => leadForm(lead, refresh) }) : null,
    editable && !lead.customer_id ? el('button', {
      class: 'btn btn--accent', text: '→ Convert to customer', onClick: () => convertForm(lead),
    }) : null,
    lead.customer_id ? el('a', { class: 'btn btn--accent', href: `#/customers/${lead.customer_id}`, text: 'Open customer profile' }) : null,
  ];

  const statusSelect = el('select', {},
    store.enums.lead_statuses.map((s) => el('option', { value: s, text: s, selected: s === lead.status })));
  statusSelect.addEventListener('change', async () => {
    try {
      await api.patch(`/api/leads/${lead.id}/status`, { status: statusSelect.value });
      toast(`Status set to ${statusSelect.value}`);
      refresh();
    } catch (err) { toastError(err); statusSelect.value = lead.status; }
  });

  const head = el('div', { class: 'detail-head' }, [
    el('div', { class: 'detail-head__avatar', text: initials(lead.full_name) }),
    el('div', { class: 'detail-head__main' }, [
      el('h1', { text: lead.full_name }),
      el('div', { class: 'detail-head__sub', text: [lead.phone, lead.email, lead.address].filter(Boolean).join(' · ') || 'No contact details recorded' }),
      el('div', { class: 'detail-head__badges' }, [
        badge(lead.status), badge(lead.priority),
        lead.source ? badge(lead.source, 'info') : null,
        lead.country ? badge(lead.country, 'purple') : null,
      ]),
    ]),
    el('div', { class: 'detail-head__actions' }, actions.filter(Boolean)),
  ]);

  const details = card('Lead details', kv([
    ['Service interested in', lead.service_type],
    ['Country', lead.country],
    ['Lead source', lead.source],
    ['Assigned staff', lead.assigned_name],
    ['Next follow-up', lead.next_followup_at ? fmtDateTime(lead.next_followup_at) : 'Not scheduled'],
    ['Created', `${fmtDateTime(lead.created_at)}${lead.created_by_name ? ` by ${lead.created_by_name}` : ''}`],
    ['WhatsApp', lead.whatsapp],
    ['Address', lead.address],
    ['Initial note', lead.initial_note],
    lead.converted_at ? ['Converted on', fmtDateTime(lead.converted_at)] : null,
  ]), {
    actions: editable ? el('div', { class: 'flex' }, [
      el('label', { class: 'small faint', text: 'Status' }), statusSelect,
    ]) : null,
  });

  const followupsCard = card('Follow-up history', table({
    columns: [
      { label: 'Due', render: (f) => fmtDateTime(f.due_at) },
      { label: 'Note', render: (f) => f.note || '—' },
      { label: 'Outcome', render: (f) => f.outcome || '—' },
      { label: 'Staff', render: (f) => f.assigned_name || '—' },
      { label: 'Status', render: (f) => badge(f.status) },
      { label: '', align: 'right', render: (f) => (f.status === 'Pending' && editable ? el('button', {
        class: 'btn btn--sm btn--accent', text: 'Complete',
        onClick: () => completeFollowup(f, refresh),
      }) : el('span', { class: 'faint', text: '' })) },
    ],
    rows: followRes.data,
    empty: 'No follow-ups scheduled for this lead',
    emptyIcon: '↻',
  }), { flush: true, actions: editable ? el('button', { class: 'btn btn--sm btn--primary', text: '+ Follow-up', onClick: () => followupForm(lead, refresh) }) : null });

  const meetingsCard = card('Meetings', table({
    columns: [
      { label: 'Title', render: (m) => m.title },
      { label: 'When', render: (m) => fmtDateTime(m.meeting_at) },
      { label: 'Type', render: (m) => m.meeting_type },
      { label: 'Staff', render: (m) => m.assigned_name || '—' },
      { label: 'Status', render: (m) => badge(m.status) },
    ],
    rows: meetRes.data,
    empty: 'No meetings scheduled',
    emptyIcon: '▤',
  }), { flush: true, actions: editable ? el('button', { class: 'btn btn--sm btn--primary', text: '+ Meeting', onClick: () => meetingForm(lead, refresh) }) : null });

  const docsRes = await api.get(`/api/documents${qs({ entity_type: 'lead', entity_id: id })}`);

  return el('div', { class: 'stack' }, [
    el('div', { class: 'flex' }, [
      el('a', { class: 'btn btn--sm btn--ghost', href: '#/leads', text: '← All leads' }),
      editable ? el('button', {
        class: 'btn btn--sm btn--ghost', text: 'Delete lead',
        onClick: async () => {
          if (!await confirmDialog(`Delete lead "${lead.full_name}"? This cannot be undone.`)) return;
          try { await api.del(`/api/leads/${lead.id}`); toast('Lead deleted'); navigate('/leads'); }
          catch (err) { toastError(err); }
        },
      }) : null,
    ]),
    head,
    details,
    el('div', { class: 'grid grid--2' }, [followupsCard, meetingsCard]),
    documentsPanel('lead', Number(id), docsRes.data, { canEdit: can('documents'), onChange: refresh }),
    activityPanel('lead', Number(id)),
  ]);
}

/* --------------------------- shared lead actions --------------------------- */

export function followupForm(entity, onDone, entityType = 'lead') {
  formModal({
    title: 'Schedule follow-up',
    fields: [{ legend: 'Follow-up details', fields: [
      { name: 'due_at', label: 'Date & time', type: 'datetime-local', required: true,
        value: toInputDateTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16)) },
      { name: 'assigned_to', label: 'Assigned to', type: 'select', options: staffOptions(),
        value: entity.assigned_to ?? store.user.id, required: true },
      { name: 'note', label: 'What needs to be done?', type: 'textarea', span: true,
        placeholder: 'e.g. Call and confirm passport delivery' },
    ] }],
    submitLabel: 'Schedule',
    onSubmit: async (values) => {
      await api.post('/api/followups', {
        ...values, entity_type: entityType, entity_id: entity.id,
        due_at: toSqlDateTime(values.due_at),
      });
      toast('Follow-up scheduled');
      onDone?.();
    },
  });
}

export function completeFollowup(followup, onDone) {
  formModal({
    title: 'Complete follow-up',
    fields: [{ legend: 'Outcome', fields: [
      { name: 'outcome', label: 'What happened?', type: 'textarea', span: true, required: true,
        placeholder: 'e.g. Spoke to client, documents will arrive Sunday' },
      { name: 'next_due_at', label: 'Schedule next follow-up (optional)', type: 'datetime-local' },
      { name: 'next_note', label: 'Next follow-up note', value: '' },
    ] }],
    submitLabel: 'Mark complete',
    onSubmit: async (values) => {
      await api.post(`/api/followups/${followup.id}/complete`, {
        outcome: values.outcome,
        next_due_at: toSqlDateTime(values.next_due_at),
        next_note: values.next_note,
      });
      toast('Follow-up completed');
      onDone?.();
    },
  });
}

export function meetingForm(entity, onDone, entityType = 'lead') {
  formModal({
    title: 'Schedule meeting',
    fields: [{ legend: 'Meeting details', fields: [
      { name: 'title', label: 'Meeting title', required: true,
        value: entity ? `Meeting — ${entity.full_name || entity.partner_name || ''}`.trim() : '' },
      { name: 'meeting_at', label: 'Date & time', type: 'datetime-local', required: true },
      { name: 'meeting_type', label: 'Meeting type', type: 'select', required: true,
        options: store.enums.meeting_types, value: 'Office Visit' },
      { name: 'assigned_to', label: 'Assigned to', type: 'select', options: staffOptions(),
        value: entity?.assigned_to ?? store.user.id, required: true },
      { name: 'remind_before_min', label: 'Remind before (minutes)', type: 'number', value: 30, min: 0 },
      { name: 'notes', label: 'Notes', type: 'textarea', span: true },
    ] }],
    submitLabel: 'Schedule meeting',
    onSubmit: async (values) => {
      await api.post('/api/meetings', {
        ...values,
        entity_type: entity ? entityType : null,
        entity_id: entity ? entity.id : null,
        meeting_at: toSqlDateTime(values.meeting_at),
      });
      toast('Meeting scheduled');
      onDone?.();
    },
  });
}

function convertForm(lead) {
  formModal({
    title: `Convert "${lead.full_name}" to a customer`,
    wide: true,
    fields: [
      el('p', { class: 'muted mt-0', text: 'Contact details carry over from the lead. Add the passport details now or later from the customer profile.' }),
      { legend: 'Customer profile', fields: [
        { name: 'given_name', label: 'Given name', required: true,
          value: lead.full_name.split(/\s+/).slice(0, -1).join(' ') || lead.full_name },
        { name: 'surname', label: 'Surname',
          value: lead.full_name.split(/\s+/).length > 1 ? lead.full_name.split(/\s+/).at(-1) : '' },
        { name: 'passport_no', label: 'Passport number' },
        { name: 'dob', label: 'Date of birth', type: 'date' },
        { name: 'nid', label: 'NID number' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
        { name: 'nationality', label: 'Nationality', value: 'Bangladeshi' },
        { name: 'service_type', label: 'Service type', type: 'select', options: serviceOptions(), value: lead.service_type },
        { name: 'country', label: 'Country', type: 'select', options: countryOptions(), value: lead.country },
        { name: 'partner_id', label: 'B2B partner (if applicable)', type: 'select',
          options: store.partners.map((p) => ({ value: p.id, label: p.partner_name })) },
      ] },
    ],
    submitLabel: 'Convert to customer',
    onSubmit: async (values) => {
      const res = await api.post(`/api/leads/${lead.id}/convert`, values);
      toast('Lead converted to customer');
      navigate(`/customers/${res.data.customer_id}`);
    },
  });
}
