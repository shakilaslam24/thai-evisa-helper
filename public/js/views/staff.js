import { el, card, table, statCard, clear, spinner, money, toastError } from '../ui.js';
import { api, qs } from '../api.js';
import { store } from '../store.js';
import { pageHead } from './common.js';

export default function staffView() {
  const state = { from: firstOfMonth(), to: today() };
  const host = el('div');
  const currency = store.settings.invoice_currency || 'BDT';

  async function load() {
    clear(host).append(spinner());
    try {
      const res = await api.get(`/api/reports/staff_performance${qs({ date_from: state.from, date_to: state.to })}`);
      const rows = res.data.raw || [];
      const totals = rows.reduce((acc, r) => ({
        leads: acc.leads + r.leads,
        converted: acc.converted + r.converted,
        followups: acc.followups + r.followups_done,
        meetings: acc.meetings + r.meetings,
        files: acc.files + r.files,
        revenue: acc.revenue + r.revenue,
        overdue: acc.overdue + r.overdue,
      }), { leads: 0, converted: 0, followups: 0, meetings: 0, files: 0, revenue: 0, overdue: 0 });

      clear(host).append(
        el('div', { class: 'grid grid--stats' }, [
          statCard({ label: 'Leads handled', value: totals.leads }),
          statCard({ label: 'Customers converted', value: totals.converted, tone: 'ok',
            meta: totals.leads ? `${((totals.converted / totals.leads) * 100).toFixed(1)}% conversion` : '' }),
          statCard({ label: 'Follow-ups completed', value: totals.followups }),
          statCard({ label: 'Overdue follow-ups', value: totals.overdue, tone: totals.overdue ? 'alert' : undefined }),
          statCard({ label: 'Meetings held', value: totals.meetings }),
          statCard({ label: 'Files created', value: totals.files }),
          statCard({ label: 'Revenue invoiced', value: money(totals.revenue, currency) }),
        ]),
        card('Performance by team member', table({
          columns: [
            { label: 'Staff', render: (r) => el('div', {}, [
              el('div', { class: 'cell-title', text: r.name }),
              el('div', { class: 'cell-sub', text: r.role }),
            ]) },
            { label: 'Leads', align: 'right', render: (r) => String(r.leads) },
            { label: 'Converted', align: 'right', render: (r) => String(r.converted) },
            { label: 'Conv. %', align: 'right', render: (r) => (r.leads ? `${((r.converted / r.leads) * 100).toFixed(1)}%` : '—') },
            { label: 'Follow-ups', align: 'right', render: (r) => String(r.followups_done) },
            { label: 'Overdue', align: 'right', render: (r) => (r.overdue
              ? el('span', { class: 'badge badge--danger', text: String(r.overdue) })
              : el('span', { class: 'faint', text: '0' })) },
            { label: 'Meetings', align: 'right', render: (r) => String(r.meetings) },
            { label: 'Files', align: 'right', render: (r) => String(r.files) },
            { label: 'Approved', align: 'right', render: (r) => String(r.approved) },
            { label: 'Rejected', align: 'right', render: (r) => String(r.rejected) },
            { label: 'Revenue', align: 'right', render: (r) => money(r.revenue, currency) },
          ],
          rows,
          empty: 'No staff activity in this period',
          emptyIcon: '★',
        }), {
          flush: true,
          actions: el('a', {
            class: 'btn btn--sm', text: '⬇ Export CSV',
            href: `/api/reports/staff_performance/csv${qs({ date_from: state.from, date_to: state.to })}`,
          }),
        }),
      );
    } catch (err) {
      clear(host).append(el('div', { class: 'card' }, el('div', { class: 'empty', text: err.message })));
      toastError(err);
    }
  }

  const fromInput = el('input', { type: 'date', value: state.from });
  const toInput = el('input', { type: 'date', value: state.to });
  fromInput.addEventListener('change', () => { state.from = fromInput.value; load(); });
  toInput.addEventListener('change', () => { state.to = toInput.value; load(); });

  load();

  return el('div', { class: 'stack' }, [
    pageHead('Staff Performance', 'Team activity and results over a chosen period'),
    el('div', { class: 'card no-print' }, el('div', { class: 'card__head' }, [
      el('div', { class: 'field' }, [el('label', { text: 'From' }), fromInput]),
      el('div', { class: 'field' }, [el('label', { text: 'To' }), toInput]),
    ])),
    host,
  ]);
}

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
