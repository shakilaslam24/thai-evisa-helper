import { el, badge, fmtDate, money, statCard, toast, toastError, confirmDialog } from '../ui.js';
import { api } from '../api.js';
import { store, can } from '../store.js';
import { navigate } from '../router.js';
import { listPage, partnerOptions } from './common.js';

export default function paymentsView() {
  const currency = store.settings.invoice_currency || 'BDT';
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  return listPage({
    title: 'Payments',
    subtitle: 'Every amount received against an invoice',
    endpoint: '/api/payments',
    route: 'payments',
    searchPlaceholder: 'Search invoice number, customer, partner or reference…',
    emptyText: 'No payments match these filters',
    emptyIcon: '৳',
    actions: [can('payments') ? el('a', {
      class: 'btn btn--primary', href: '#/invoices?due=1',
      text: '+ Record a payment',
      title: 'Opens the list of unpaid invoices — record the payment on the bill it belongs to',
    }) : null],
    filters: [
      { name: 'method', label: 'Method', type: 'select', options: store.enums.payment_methods },
      { name: 'partner_id', label: 'B2B partner', type: 'select', options: partnerOptions() },
      { name: 'date_from', label: 'From', type: 'date' },
      { name: 'date_to', label: 'To', type: 'date' },
    ],
    summary: (res) => el('div', { class: 'grid grid--stats' }, [
      statCard({ label: 'Payments listed', value: res.total }),
      statCard({ label: 'Total collected', value: money(res.totals.collected, currency), tone: 'ok' }),
    ]),
    columns: [
      { label: 'Date', render: (p) => fmtDate(p.paid_at) },
      { label: 'Invoice', render: (p) => el('a', { href: `#/invoices/${p.invoice_id}`, class: 'cell-title', text: p.invoice_no }) },
      { label: 'Received from', render: (p) => p.partner_name || p.customer_name || '—' },
      { label: 'Method', render: (p) => badge(p.method, 'info') },
      { label: 'Reference', render: (p) => p.reference || '—' },
      { label: 'Amount', align: 'right', render: (p) => el('strong', { class: 'mono', text: money(p.amount, p.currency || currency) }) },
      { label: 'Received by', render: (p) => p.received_by_name || '—' },
      { label: '', align: 'right', render: (p) => (can('payments') ? el('button', {
        class: 'btn btn--sm btn--danger', text: 'Remove',
        onClick: async () => {
          if (!await confirmDialog(`Remove the ${money(p.amount, p.currency || currency)} payment on ${p.invoice_no}?`)) return;
          try { await api.del(`/api/payments/${p.id}`); toast('Payment removed'); refresh(); }
          catch (err) { toastError(err); }
        },
      }) : null) },
    ],
  });
}
