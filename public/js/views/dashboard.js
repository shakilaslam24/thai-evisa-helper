import { el, card, statCard, badge, fmtDateTime, fmtDate, money, barChart, timeline, monthLabel } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { pageHead } from './common.js';
import { navigate, parseHash } from '../router.js';

export default async function dashboardView() {
  const scope = parseHash().query.scope || 'all';
  const res = await api.get(`/api/dashboard${scope === 'mine' ? '?scope=mine' : ''}`);
  const s = res.stats;
  const currency = store.settings.invoice_currency || 'BDT';

  // The toggle only appears for roles the server actually grants company scope.
  const scopeToggle = res.canSeeCompany ? el('div', { class: 'flex' }, [
    el('button', {
      class: `btn btn--sm${scope === 'all' ? ' btn--primary' : ''}`, text: 'Whole company',
      onClick: () => navigate('/dashboard'),
    }),
    el('button', {
      class: `btn btn--sm${scope === 'mine' ? ' btn--primary' : ''}`, text: 'My work',
      onClick: () => navigate('/dashboard?scope=mine'),
    }),
  ]) : null;

  const pipelineStats = [
    { label: 'Total leads', value: s.total_leads, meta: `${s.leads_today} added today`, link: '#/leads' },
    { label: "Today's follow-up", value: s.followups_today, meta: 'Due today', link: '#/followups?due=today', tone: s.followups_today ? 'ok' : undefined },
    { label: 'Overdue follow-up', value: s.followups_overdue, meta: 'Needs attention', link: '#/followups?due=overdue', tone: s.followups_overdue ? 'alert' : undefined },
    { label: "Today's meetings", value: s.meetings_today, meta: `${s.meetings_upcoming} upcoming`, link: '#/meetings?when=today' },
    { label: 'Total customers', value: s.total_customers, link: '#/customers' },
    { label: 'Active files', value: s.active_files, meta: `${s.total_files} total`, link: '#/files?active=1' },
  ];

  const fileStats = [
    { label: 'Under processing', value: s.files_processing, link: '#/files?status=Under%20Processing' },
    { label: 'Interview pending', value: s.files_interview_pending, link: '#/files?status=Interview%20Called' },
    { label: 'Documents pending', value: s.files_documents_pending, link: '#/files?status=Documents%20Pending' },
    { label: 'Approved', value: s.files_approved, tone: 'ok', link: '#/files?status=Approved' },
    { label: 'Rejected', value: s.files_rejected, tone: 'alert', link: '#/files?status=Rejected' },
    { label: 'Completed', value: s.files_completed, link: '#/files?status=Completed' },
  ];

  const moneyStats = [
    { label: 'B2B partners', value: s.total_partners, meta: `${s.active_partners} active`, link: '#/partners' },
    { label: 'Invoices', value: s.total_invoices, meta: `${s.unpaid_invoices} unpaid`, link: '#/invoices' },
    { label: 'Pending payments', value: money(s.pending_payments, currency), tone: s.pending_payments > 0 ? 'alert' : undefined, link: '#/invoices?due=1' },
    { label: 'This month billed', value: money(s.month_billed, currency), meta: `${s.month_invoices} invoices` },
    { label: 'This month collected', value: money(s.month_collected, currency), tone: 'ok', link: '#/payments' },
  ];

  const salesChart = res.monthlySales.length
    ? barChart(
      [
        { name: 'Billed', values: res.monthlySales.map((m) => m.billed) },
        { name: 'Collected', values: res.monthlySales.map((m) => m.collected) },
      ],
      { labels: res.monthlySales.map((m) => monthLabel(m.month)), colors: ['', 'alt'] },
    )
    : el('div', { class: 'empty', text: 'No invoices raised yet' });

  const leadChart = res.leadTrend.length
    ? barChart(
      [
        { name: 'Leads', values: res.leadTrend.map((m) => m.leads) },
        { name: 'Converted', values: res.leadTrend.map((m) => m.converted) },
      ],
      { labels: res.leadTrend.map((m) => monthLabel(m.month)), colors: ['', 'alt'] },
    )
    : el('div', { class: 'empty', text: 'No leads recorded yet' });

  const followupList = res.todayFollowups.length
    ? el('div', {}, res.todayFollowups.map((f) => el('div', { class: 'checkline' }, [
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'cell-title', text: f.entity_name || 'Record' }),
        el('div', { class: 'cell-sub', text: `${fmtDateTime(f.due_at)}${f.note ? ` · ${f.note}` : ''}` }),
      ]),
      new Date(String(f.due_at).replace(' ', 'T')) < new Date() ? badge('Overdue') : badge('Today', 'info'),
      f.entity_phone ? el('a', { class: 'btn btn--sm', href: `tel:${f.entity_phone}`, text: 'Call' }) : null,
    ])))
    : el('div', { class: 'empty', text: 'No follow-ups due — you are all caught up' });

  const meetingList = res.todayMeetings.length
    ? el('div', {}, res.todayMeetings.map((m) => el('div', { class: 'checkline' }, [
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'cell-title', text: m.title }),
        el('div', { class: 'cell-sub', text: `${fmtDateTime(m.meeting_at)} · ${m.meeting_type}${m.entity_name ? ` · ${m.entity_name}` : ''}` }),
      ]),
      badge(m.status),
    ])))
    : el('div', { class: 'empty', text: 'No meetings scheduled for today' });

  const interviewList = res.upcomingInterviews.length
    ? el('div', {}, res.upcomingInterviews.map((f) => el('div', { class: 'checkline' }, [
      el('div', { style: 'flex:1;min-width:0' }, [
        el('a', { class: 'cell-title', href: `#/files/${f.id}`, text: f.reference_no || `File #${f.id}` }),
        el('div', { class: 'cell-sub', text: `${f.customer_name || ''} · ${f.country || ''}` }),
      ]),
      el('span', { class: 'small nowrap', text: fmtDate(f.interview_date) }),
    ])))
    : el('div', { class: 'empty', text: 'No interviews scheduled' });

  const statusBreakdown = res.filesByStatus.length
    ? el('div', {}, res.filesByStatus.map((row) => {
      const total = res.filesByStatus.reduce((sum, r) => sum + r.n, 0);
      return el('div', { style: 'margin-bottom:11px' }, [
        el('div', { class: 'flex-between small' }, [badge(row.status), el('strong', { text: String(row.n) })]),
        (() => {
          const bar = el('div', { class: 'progress mt-1' }, el('div', { class: 'progress__fill' }));
          bar.firstChild.style.width = `${(row.n / total) * 100}%`;
          return bar;
        })(),
      ]);
    }))
    : el('div', { class: 'empty', text: 'No files created yet' });

  const greeting = new Date().getHours() < 12 ? 'Good morning'
    : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return el('div', { class: 'stack' }, [
    pageHead(`${greeting}, ${store.user.name.split(' ')[0]}`,
      `${store.settings.company_name || 'DreamFly Consultancy'} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
      [scopeToggle]),

    el('div', { class: 'grid grid--stats' }, pipelineStats.map(statCard)),

    el('div', { class: 'grid grid--2' }, [
      card("Today's follow-up list", followupList, {
        actions: el('a', { class: 'btn btn--sm', href: '#/followups', text: 'View all' }),
      }),
      card("Today's meetings", meetingList, {
        actions: el('a', { class: 'btn btn--sm', href: '#/meetings', text: 'View all' }),
      }),
    ]),

    card('File & case status', el('div', { class: 'grid grid--stats' }, fileStats.map(statCard)), { flush: false }),

    el('div', { class: 'grid grid--stats' }, moneyStats.map(statCard)),

    el('div', { class: 'grid grid--2' }, [
      card('Monthly sales summary', salesChart),
      card('Lead & conversion trend', leadChart),
    ]),

    el('div', { class: 'grid grid--3' }, [
      card('Files by status', statusBreakdown),
      card('Upcoming interviews', interviewList),
      card('Recent activity', timeline(res.recentActivity)),
    ]),
  ]);
}
