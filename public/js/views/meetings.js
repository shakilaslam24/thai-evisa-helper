import { el, badge, fmtDateTime, toast, toastError, confirmDialog, formModal, toInputDateTime, toSqlDateTime } from '../ui.js';
import { api } from '../api.js';
import { store, can } from '../store.js';
import { parseHash } from '../router.js';
import { listPage, staffOptions } from './common.js';
import { meetingForm } from './leads.js';

const ENTITY_ROUTE = { lead: 'leads', customer: 'customers', partner: 'partners' };

export default function meetingsView() {
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const editable = can('meetings');
  const q = parseHash().query;

  return listPage({
    title: 'Meetings',
    subtitle: 'Office visits, calls and video meetings across the team',
    endpoint: '/api/meetings',
    route: 'meetings',
    emptyText: 'No meetings match these filters',
    emptyIcon: '▤',
    actions: [editable ? el('button', {
      class: 'btn btn--primary', text: '+ Schedule meeting',
      onClick: () => meetingForm(null, refresh),
    }) : null],
    extraTop: el('div', { class: 'flex' }, [
      chip('Today', 'today', q.when), chip('Upcoming', 'upcoming', q.when), chip('All', '', q.when),
    ]),
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: store.enums.meeting_statuses },
      { name: 'meeting_type', label: 'Type', type: 'select', options: store.enums.meeting_types },
      { name: 'assigned_to', label: 'Staff', type: 'select', options: staffOptions() },
      { name: 'date_from', label: 'From', type: 'date' },
      { name: 'date_to', label: 'To', type: 'date' },
    ],
    columns: [
      { label: 'When', render: (m) => el('div', {}, [
        el('div', { class: 'cell-title', text: fmtDateTime(m.meeting_at) }),
        el('div', { class: 'cell-sub', text: m.meeting_type }),
      ]) },
      { label: 'Meeting', render: (m) => el('div', {}, [
        el('div', { class: 'cell-title', text: m.title }),
        m.notes ? el('div', { class: 'cell-sub', text: m.notes }) : null,
      ]) },
      { label: 'With', render: (m) => (m.entity_name
        ? el('a', { href: `#/${ENTITY_ROUTE[m.entity_type]}/${m.entity_id}`, text: m.entity_name })
        : el('span', { class: 'faint', text: '—' })) },
      { label: 'Staff', render: (m) => m.assigned_name || '—' },
      { label: 'Status', render: (m) => badge(m.status) },
      { label: '', align: 'right', render: (m) => (editable ? el('div', { class: 'row-actions' }, [
        m.status === 'Scheduled' ? el('button', {
          class: 'btn btn--sm btn--accent', text: 'Done',
          onClick: () => setStatus(m, 'Completed', refresh),
        }) : null,
        el('button', { class: 'btn btn--sm', text: 'Edit', onClick: () => editMeeting(m, refresh) }),
        el('button', {
          class: 'btn btn--sm btn--danger', text: 'Delete',
          onClick: async () => {
            if (!await confirmDialog(`Delete meeting "${m.title}"?`)) return;
            try { await api.del(`/api/meetings/${m.id}`); toast('Meeting deleted'); refresh(); }
            catch (err) { toastError(err); }
          },
        }),
      ]) : null) },
    ],
  });
}

async function setStatus(meeting, status, onDone) {
  try {
    await api.patch(`/api/meetings/${meeting.id}/status`, { status });
    toast(`Meeting marked ${status.toLowerCase()}`);
    onDone();
  } catch (err) { toastError(err); }
}

function editMeeting(meeting, onDone) {
  formModal({
    title: `Edit — ${meeting.title}`,
    fields: [{ legend: 'Meeting details', fields: [
      { name: 'title', label: 'Title', required: true, value: meeting.title },
      { name: 'meeting_at', label: 'Date & time', type: 'datetime-local', required: true,
        value: toInputDateTime(meeting.meeting_at) },
      { name: 'meeting_type', label: 'Type', type: 'select', options: store.enums.meeting_types,
        value: meeting.meeting_type, required: true },
      { name: 'status', label: 'Status', type: 'select', options: store.enums.meeting_statuses,
        value: meeting.status, required: true },
      { name: 'assigned_to', label: 'Assigned to', type: 'select', options: staffOptions(),
        value: meeting.assigned_to },
      { name: 'remind_before_min', label: 'Remind before (minutes)', type: 'number',
        value: meeting.remind_before_min, min: 0 },
      { name: 'notes', label: 'Notes', type: 'textarea', span: true, value: meeting.notes },
    ] }],
    submitLabel: 'Save changes',
    onSubmit: async (values) => {
      await api.put(`/api/meetings/${meeting.id}`, { ...values, meeting_at: toSqlDateTime(values.meeting_at) });
      toast('Meeting updated');
      onDone();
    },
  });
}

function chip(label, value, active) {
  const q = { ...parseHash().query };
  if (value) q.when = value; else delete q.when;
  const search = new URLSearchParams(q).toString();
  return el('a', {
    class: `btn btn--sm${(active || '') === value ? ' btn--primary' : ''}`,
    href: `#/meetings${search ? `?${search}` : ''}`, text: label,
  });
}
