import { el, badge, fmtDateTime, toast, toastError, confirmDialog } from '../ui.js';
import { api } from '../api.js';
import { store, can } from '../store.js';
import { navigate, parseHash } from '../router.js';
import { listPage, staffOptions } from './common.js';
import { completeFollowup } from './leads.js';

const ENTITY_ROUTE = { lead: 'leads', customer: 'customers', case_file: 'files', partner: 'partners' };

export default function followupsView() {
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const editable = can('followups');
  const q = parseHash().query;

  return listPage({
    title: 'Follow-up',
    subtitle: 'Every scheduled call, message and reminder in one queue',
    endpoint: '/api/followups',
    route: 'followups',
    searchPlaceholder: 'Filter below to narrow the queue…',
    emptyText: 'Nothing due — the queue is clear',
    emptyIcon: '✅',
    extraTop: el('div', { class: 'flex' }, [
      quickChip('Due today', 'today', q.due),
      quickChip('Overdue', 'overdue', q.due),
      quickChip('Upcoming', 'upcoming', q.due),
      quickChip('All', '', q.due),
      el('span', { class: 'faint small', text: 'Only my items:' }),
      el('button', {
        class: `btn btn--sm${String(q.assigned_to) === String(store.user.id) ? ' btn--primary' : ''}`,
        text: store.user.name,
        onClick: () => navigate(`/followups?assigned_to=${store.user.id}${q.due ? `&due=${q.due}` : ''}`),
      }),
    ]),
    filters: [
      { name: 'status', label: 'State', type: 'select', options: ['Pending', 'Done', 'Cancelled'] },
      { name: 'assigned_to', label: 'Staff', type: 'select', options: staffOptions() },
      { name: 'entity_type', label: 'Attached to', type: 'select', options: [
        { value: 'lead', label: 'Lead' }, { value: 'customer', label: 'Customer' },
        { value: 'case_file', label: 'File' }, { value: 'partner', label: 'Partner' }] },
      { name: 'date_from', label: 'From', type: 'date' },
      { name: 'date_to', label: 'To', type: 'date' },
    ],
    columns: [
      { label: 'Due', render: (f) => {
        const overdue = f.status === 'Pending' && new Date(String(f.due_at).replace(' ', 'T')) < new Date();
        return el('div', {}, [
          el('div', { class: overdue ? 'badge badge--danger' : 'cell-title', text: fmtDateTime(f.due_at) }),
          overdue ? el('div', { class: 'cell-sub', text: 'Overdue' }) : null,
        ]);
      } },
      { label: 'Record', render: (f) => el('a', {
        href: `#/${ENTITY_ROUTE[f.entity_type]}/${f.entity_id}`,
        class: 'cell-title', text: f.entity_name || `${f.entity_type} #${f.entity_id}`,
      }) },
      { label: 'Note', render: (f) => f.note || '—' },
      { label: 'Outcome', render: (f) => f.outcome || '—' },
      { label: 'Staff', render: (f) => f.assigned_name || '—' },
      { label: 'State', render: (f) => badge(f.status) },
      { label: '', align: 'right', render: (f) => el('div', { class: 'row-actions' }, [
        f.entity_phone ? el('a', { class: 'btn btn--sm', href: `tel:${f.entity_phone}`, text: 'Call' }) : null,
        editable && f.status === 'Pending' ? el('button', {
          class: 'btn btn--sm btn--accent', text: 'Complete',
          onClick: () => completeFollowup(f, refresh),
        }) : null,
        editable && f.status === 'Pending' ? el('button', {
          class: 'btn btn--sm', text: 'Cancel',
          onClick: async () => {
            if (!await confirmDialog('Cancel this follow-up?')) return;
            try { await api.post(`/api/followups/${f.id}/cancel`); toast('Follow-up cancelled'); refresh(); }
            catch (err) { toastError(err); }
          },
        }) : null,
      ]) },
    ],
  });
}

function quickChip(label, value, active) {
  const q = { ...parseHash().query };
  if (value) q.due = value; else delete q.due;
  const search = new URLSearchParams(q).toString();
  return el('a', {
    class: `btn btn--sm${(active || '') === value ? ' btn--primary' : ''}`,
    href: `#/followups${search ? `?${search}` : ''}`, text: label,
  });
}
