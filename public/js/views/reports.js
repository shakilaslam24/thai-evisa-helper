import { el, card, table, clear, toastError, spinner } from '../ui.js';
import { api, qs } from '../api.js';
import { pageHead } from './common.js';
import { navigate, parseHash } from '../router.js';

const REPORTS = [
  ['daily_leads', 'Daily lead report', 'Leads captured each day with conversion outcomes'],
  ['lead_conversion', 'Monthly lead conversion', 'How many leads turned into customers each month'],
  ['lead_source', 'Lead source performance', 'Which channels bring leads that actually convert'],
  ['followup_pending', 'Follow-up pending', 'Everything still open, overdue first'],
  ['active_files', 'Active file report', 'Every file currently in progress'],
  ['country_wise', 'Country-wise report', 'Volume and success rate by destination'],
  ['approved_vs_rejected', 'Approved vs rejected', 'Monthly decision outcomes'],
  ['partner_wise', 'Partner-wise file report', 'File volume and billing per B2B partner'],
  ['invoice_report', 'Invoice report', 'All invoices raised in a period'],
  ['payment_due', 'Payment due report', 'Outstanding balances by invoice'],
  ['collection', 'Payment collection report', 'Money actually received per day'],
  ['staff_performance', 'Staff performance', 'Team activity and results'],
];

export default async function reportsView() {
  // The server decides which reports this role may run, so a staff member is
  // never offered one that will come back refused.
  const allowed = await api.get('/api/reports')
    .then((r) => new Set(r.data.map((x) => x.key)))
    .catch(() => new Set(REPORTS.map(([k]) => k)));
  const available = REPORTS.filter(([key]) => allowed.has(key));

  const q = parseHash().query;
  const state = {
    key: allowed.has(q.report) ? q.report : (available[0]?.[0] || 'daily_leads'),
    from: q.date_from || firstOfMonth(),
    to: q.date_to || today(),
  };
  const host = el('div');

  async function load() {
    clear(host).append(spinner());
    try {
      const res = await api.get(`/api/reports/${state.key}${qs({ date_from: state.from, date_to: state.to })}`);
      const r = res.data;
      clear(host).append(card(r.title, table({
        columns: r.columns.map((label, i) => ({
          label,
          align: i > 0 && r.rows.some((row) => typeof row[i] === 'number') ? 'right' : undefined,
          render: (row) => (row[i] === null || row[i] === undefined ? '—' : String(row[i])),
        })),
        rows: r.rows,
        empty: 'No data for this period',
        emptyIcon: '📊',
      }), {
        flush: true,
        actions: [
          el('span', { class: 'faint small', text: r.range ? `${r.range.from} → ${r.range.to}` : '' }),
          // Say plainly when the screen is showing part of the answer, so a
          // visible total is never mistaken for the whole picture.
          r.truncated ? el('span', {
            class: 'badge badge--warn',
            title: 'Narrow the date range, or use Export CSV for the complete list',
            text: `Showing first ${r.truncated.shown} of ${r.truncated.total} rows`,
          }) : null,
          el('a', {
            class: 'btn btn--sm', text: '⬇ Export CSV',
            href: `/api/reports/${state.key}/csv${qs({ date_from: state.from, date_to: state.to })}`,
          }),
          el('button', { class: 'btn btn--sm', text: '🖨 Print', onClick: () => window.print() }),
        ],
      }));
    } catch (err) {
      clear(host).append(el('div', { class: 'card' }, el('div', { class: 'empty', text: err.message })));
      toastError(err);
    }
  }

  const sync = () => {
    navigate(`/reports${qs({ report: state.key, date_from: state.from, date_to: state.to })}`, { replace: true });
    load();
  };

  const reportSelect = el('select', {},
    available.map(([key, label]) => el('option', { value: key, text: label, selected: key === state.key })));
  reportSelect.addEventListener('change', () => { state.key = reportSelect.value; sync(); });

  const fromInput = el('input', { type: 'date', value: state.from });
  const toInput = el('input', { type: 'date', value: state.to });
  fromInput.addEventListener('change', () => { state.from = fromInput.value; sync(); });
  toInput.addEventListener('change', () => { state.to = toInput.value; sync(); });

  const quickRanges = el('div', { class: 'flex' }, [
    ['This month', firstOfMonth(), today()],
    ['Last 30 days', daysAgo(30), today()],
    ['Last 90 days', daysAgo(90), today()],
    ['This year', `${new Date().getFullYear()}-01-01`, today()],
  ].map(([label, from, to]) => el('button', {
    class: 'btn btn--sm', text: label,
    onClick: () => {
      state.from = from; state.to = to;
      fromInput.value = from; toInput.value = to;
      sync();
    },
  })));

  const picker = el('div', { class: 'card no-print' }, el('div', { class: 'card__head' }, [
    el('div', { class: 'field', style: 'flex:1;min-width:230px' }, [
      el('label', { text: 'Report' }), reportSelect,
    ]),
    el('div', { class: 'field' }, [el('label', { text: 'From' }), fromInput]),
    el('div', { class: 'field' }, [el('label', { text: 'To' }), toInput]),
    quickRanges,
  ]));

  const description = available.find(([k]) => k === state.key)?.[2] || '';

  load();

  return el('div', { class: 'stack' }, [
    pageHead('Reports & Analytics', description),
    picker,
    host,
  ]);
}

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
