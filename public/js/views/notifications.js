import { el, card, badge, fmtDateTime, relativeTime, toast, toastError, clear, spinner } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { pageHead } from './common.js';
import { refreshNotifications } from '../shell.js';

const TYPE_LABEL = {
  followup_due: 'Follow-up due', followup_overdue: 'Overdue follow-up',
  followup_assigned: 'Follow-up assigned', meeting_reminder: 'Meeting reminder',
  meeting_assigned: 'Meeting assigned', interview_reminder: 'Interview reminder',
  payment_due: 'Payment due', documents_missing: 'Documents missing',
  lead_assigned: 'Lead assigned', file_assigned: 'File assigned', file_status: 'File status',
};

export default function notificationsView() {
  const host = el('div');

  async function load() {
    clear(host).append(spinner());
    try {
      const res = await api.get('/api/notifications');
      store.unread = res.unread;
      refreshNotifications();
      clear(host);
      if (!res.data.length) {
        host.append(el('div', { class: 'empty' }, [
          el('div', { class: 'empty__icon', text: '🔔' }),
          el('div', { class: 'empty__title', text: 'Nothing needs your attention right now' }),
          el('div', { class: 'faint small', text: 'Reminders appear here as follow-ups, meetings, interviews and payments fall due.' }),
        ]));
        return;
      }
      for (const n of res.data) {
        host.append(el('div', {
          class: 'checkline',
          style: n.is_read ? 'opacity:.55' : '',
        }, [
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { class: 'flex', style: 'gap:8px' }, [
              badge(TYPE_LABEL[n.type] || n.type, n.type.includes('overdue') || n.type === 'payment_due' ? 'danger' : 'info'),
              n.link ? el('a', { class: 'cell-title', href: n.link, text: n.title }) : el('span', { class: 'cell-title', text: n.title }),
            ]),
            n.body ? el('div', { class: 'cell-sub', text: n.body }) : null,
            el('div', { class: 'cell-sub', text: `${fmtDateTime(n.created_at)} · ${relativeTime(n.created_at)}` }),
          ]),
          !n.is_read ? el('button', {
            class: 'btn btn--sm', text: 'Mark read',
            onClick: async () => {
              try { await api.post(`/api/notifications/${n.id}/read`); load(); } catch (err) { toastError(err); }
            },
          }) : null,
          el('button', {
            class: 'btn btn--sm btn--ghost', text: '✕', title: 'Dismiss',
            onClick: async () => {
              try { await api.del(`/api/notifications/${n.id}`); load(); } catch (err) { toastError(err); }
            },
          }),
        ]));
      }
    } catch (err) {
      clear(host).append(el('div', { class: 'empty', text: err.message }));
    }
  }

  load();

  return el('div', { class: 'stack' }, [
    pageHead('Notifications', 'Reminders raised by the system for you', [
      el('button', {
        class: 'btn', text: 'Mark all as read',
        onClick: async () => {
          try {
            await api.post('/api/notifications/read-all');
            toast('All notifications marked read');
            load();
          } catch (err) { toastError(err); }
        },
      }),
    ]),
    card(null, host),
  ]);
}
