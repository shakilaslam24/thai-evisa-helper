import {
  el, card, badge, table, fmtDate, fmtDateTime, money, toast, toastError, formModal,
  confirmDialog, modal, closeModal, clear, statCard, field,
} from '../ui.js';
import { api, qs } from '../api.js';
import { store, can } from '../store.js';
import { navigate } from '../router.js';
import { listPage, partnerOptions } from './common.js';

/* ------------------------------ invoice form ------------------------------ */

function itemRow(item = {}, onChange) {
  const description = el('input', { placeholder: 'Service description', value: item.description || '' });
  const quantity = el('input', { type: 'number', step: '0.01', min: '0', value: item.quantity ?? 1, style: 'max-width:90px' });
  const price = el('input', { type: 'number', step: '0.01', min: '0', value: item.unit_price ?? '', style: 'max-width:130px' });
  const amount = el('div', { class: 'mono nowrap', style: 'min-width:90px;text-align:right' });

  const recalc = () => {
    const total = (Number(quantity.value) || 0) * (Number(price.value) || 0);
    amount.textContent = total.toFixed(2);
    onChange();
  };
  [quantity, price].forEach((i) => i.addEventListener('input', recalc));
  description.addEventListener('input', onChange);

  const row = el('div', { class: 'flex', style: 'align-items:flex-end;gap:8px;margin-bottom:8px' }, [
    el('div', { class: 'field', style: 'flex:1;min-width:160px' }, [description]),
    el('div', { class: 'field' }, [quantity]),
    el('div', { class: 'field' }, [price]),
    amount,
    el('button', {
      class: 'btn btn--sm btn--ghost', type: 'button', text: '✕', title: 'Remove line',
      onClick: () => { row.remove(); onChange(); },
    }),
  ]);
  row._read = () => ({
    description: description.value.trim(),
    quantity: Number(quantity.value) || 0,
    unit_price: Number(price.value) || 0,
  });
  recalc();
  return row;
}

export function invoiceForm(invoice, onDone, { customer, partner, file } = {}) {
  const editing = Boolean(invoice?.id);
  const itemsHost = el('div');
  const discountInput = el('input', { type: 'number', step: '0.01', min: '0', name: 'discount', value: invoice?.discount ?? 0 });
  const taxInput = el('input', { type: 'number', step: '0.01', min: '0', name: 'tax', value: invoice?.tax ?? 0 });
  const totalsBox = el('div', { class: 'invoice-totals' });

  const readItems = () => Array.from(itemsHost.children).map((r) => r._read()).filter((i) => i.description);

  function recalcTotals() {
    const items = readItems();
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discount = Number(discountInput.value) || 0;
    const tax = Number(taxInput.value) || 0;
    const currency = store.settings.invoice_currency || 'BDT';
    clear(totalsBox).append(
      row('Subtotal', money(subtotal, currency)),
      row('Discount', `− ${money(discount, currency)}`),
      row('Tax / VAT', money(tax, currency)),
      row('Total', money(Math.max(subtotal - discount + tax, 0), currency), true),
    );
  }
  const row = (label, value, grand) => el('div', {
    class: `invoice-totals__row${grand ? ' invoice-totals__row--grand' : ''}`,
  }, [el('span', { text: label }), el('span', { class: 'mono', text: value })]);

  const addLine = (item) => { itemsHost.append(itemRow(item, recalcTotals)); recalcTotals(); };
  ((invoice?.items?.length ? invoice.items : [{}])).forEach(addLine);
  [discountInput, taxInput].forEach((i) => i.addEventListener('input', recalcTotals));

  const billTo = customer || invoice?.customer_id
    ? { type: 'customer', id: customer?.id ?? invoice?.customer_id, label: customer?.full_name ?? invoice?.customer_name }
    : partner || invoice?.partner_id
      ? { type: 'partner', id: partner?.id ?? invoice?.partner_id, label: partner?.partner_name ?? invoice?.partner_name }
      : file?.customer_id
        ? { type: 'customer', id: file.customer_id, label: file.customer_name }
        : null;

  const partnerSelect = field({
    name: 'partner_id', label: 'Bill to B2B partner', type: 'select',
    options: partnerOptions(), value: billTo?.type === 'partner' ? billTo.id : '',
    blank: '— none (direct customer) —',
  });

  const extra = el('div', { class: 'stack' }, [
    el('fieldset', { class: 'section' }, [
      el('legend', { text: 'Line items' }),
      el('div', { class: 'flex small faint', style: 'gap:8px' }, [
        el('div', { style: 'flex:1;min-width:160px', text: 'Description' }),
        el('div', { style: 'width:90px', text: 'Qty' }),
        el('div', { style: 'width:130px', text: 'Unit price' }),
        el('div', { style: 'min-width:90px;text-align:right', text: 'Amount' }),
        el('div', { style: 'width:34px' }),
      ]),
      itemsHost,
      el('button', { class: 'btn btn--sm', type: 'button', text: '+ Add line', onClick: () => addLine({}) }),
    ]),
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field' }, [el('label', { text: 'Discount' }), discountInput]),
      el('div', { class: 'field' }, [el('label', { text: 'Tax / VAT' }), taxInput]),
    ]),
    totalsBox,
  ]);

  formModal({
    title: editing ? `Edit invoice ${invoice.invoice_no}` : 'Create invoice',
    wide: true,
    fields: [
      billTo?.type === 'customer'
        ? el('p', { class: 'muted mt-0' }, [`Billing customer: `, el('strong', { text: billTo.label || `#${billTo.id}` })])
        : null,
      { legend: 'Invoice', fields: [
        { name: 'issue_date', label: 'Invoice date', type: 'date', required: true,
          value: invoice?.issue_date || new Date().toISOString().slice(0, 10) },
        { name: 'due_date', label: 'Payment due date', type: 'date', value: invoice?.due_date },
        { name: 'currency', label: 'Currency', value: invoice?.currency || store.settings.invoice_currency || 'BDT' },
      ] },
      billTo?.type === 'customer' ? null : partnerSelect,
      { name: 'notes', label: 'Notes shown on the invoice', type: 'textarea', value: invoice?.notes },
    ].filter(Boolean),
    extra,
    submitLabel: editing ? 'Save invoice' : 'Create invoice',
    onSubmit: async (values) => {
      const items = readItems();
      if (!items.length) throw new Error('Add at least one line item');
      const payload = {
        ...values,
        items,
        customer_id: billTo?.type === 'customer' ? billTo.id : null,
        partner_id: billTo?.type === 'customer' ? null : (values.partner_id || null),
        case_file_id: file?.id ?? invoice?.case_file_id ?? null,
      };
      if (!payload.customer_id && !payload.partner_id) {
        throw new Error('Choose a customer or a B2B partner to bill');
      }
      const res = editing
        ? await api.put(`/api/invoices/${invoice.id}`, payload)
        : await api.post('/api/invoices', payload);
      toast(editing ? 'Invoice updated' : `Invoice ${res.data.invoice_no} created`);
      onDone(res.data);
    },
  });
}

/* -------------------------------- list view -------------------------------- */

export default function invoicesView() {
  const currency = store.settings.invoice_currency || 'BDT';
  return listPage({
    title: 'Invoices',
    subtitle: 'Bills raised to direct customers and B2B partners',
    endpoint: '/api/invoices',
    route: 'invoices',
    searchPlaceholder: 'Search invoice number, customer or partner…',
    emptyText: 'No invoices match these filters',
    emptyIcon: '🧾',
    actions: [can('invoices') ? el('button', {
      class: 'btn btn--primary', text: '+ Create invoice',
      onClick: () => invoiceForm(null, (i) => navigate(`/invoices/${i.id}`)),
    }) : null],
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: ['Unpaid', 'Partial Paid', 'Paid', 'Cancelled'] },
      { name: 'partner_id', label: 'B2B partner', type: 'select', options: partnerOptions() },
      { name: 'date_from', label: 'From', type: 'date' },
      { name: 'date_to', label: 'To', type: 'date' },
    ],
    summary: (res) => el('div', { class: 'grid grid--stats' }, [
      statCard({ label: 'Invoices listed', value: res.total }),
      statCard({ label: 'Total billed', value: money(res.totals.billed, currency) }),
      statCard({ label: 'Collected', value: money(res.totals.collected, currency), tone: 'ok' }),
      statCard({ label: 'Outstanding', value: money(res.totals.due, currency), tone: res.totals.due > 0 ? 'alert' : undefined }),
    ]),
    onRowClick: (row) => navigate(`/invoices/${row.id}`),
    columns: [
      { label: 'Invoice', render: (i) => el('div', {}, [
        el('div', { class: 'cell-title', text: i.invoice_no }),
        el('div', { class: 'cell-sub', text: fmtDate(i.issue_date) }),
      ]) },
      { label: 'Billed to', render: (i) => el('div', {}, [
        el('div', { text: i.partner_name || i.customer_name || '—' }),
        el('div', { class: 'cell-sub', text: i.partner_name ? 'B2B partner' : 'Direct customer' }),
      ]) },
      { label: 'File', render: (i) => i.reference_no || '—' },
      { label: 'Total', align: 'right', render: (i) => money(i.total, i.currency) },
      { label: 'Paid', align: 'right', render: (i) => money(i.paid, i.currency) },
      { label: 'Due', align: 'right', render: (i) => (i.due_amount > 0
        ? el('span', { class: 'badge badge--danger', text: money(i.due_amount, i.currency) })
        : el('span', { class: 'faint', text: '—' })) },
      { label: 'Status', render: (i) => badge(i.status) },
    ],
  });
}

/* ------------------------------- detail view ------------------------------- */

export async function invoiceDetailView({ id }) {
  const res = await api.get(`/api/invoices/${id}`);
  const inv = res.data;
  const company = res.company;
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const due = inv.total - inv.paid;

  const billedTo = inv.partner_id
    ? { name: inv.partner_company || inv.partner_name, extra: [inv.partner_name, inv.partner_address, inv.partner_phone, inv.partner_email] }
    : { name: inv.customer_name, extra: [inv.customer_address, inv.customer_phone, inv.customer_email] };

  const sheet = el('div', { class: 'invoice-sheet' }, [
    el('div', { class: 'invoice-sheet__head' }, [
      (() => {
        // The lockup already carries the company name, so printing it again as
        // a heading just repeats itself. Only fall back to text if no logo shows.
        const logo = el('img', {
          class: 'invoice-sheet__logo',
          src: company.company_logo_url || '/assets/brand/logo-wide-dark.png',
          alt: company.company_name || 'DreamFly Consultancy',
        });
        const name = el('div', {
          class: 'invoice-sheet__title', hidden: true,
          text: company.company_name || 'DreamFly Consultancy',
        });
        logo.addEventListener('error', () => { logo.hidden = true; name.hidden = false; });
        return el('div', {}, [
          logo,
          name,
          el('div', { class: 'muted small' }, [
            company.company_tagline || '', el('br'),
            company.company_address || '', el('br'),
            [company.company_phone, company.company_phone_alt].filter(Boolean).join(' · '), el('br'),
            [company.company_email, company.company_website].filter(Boolean).join(' · '),
          ]),
        ]);
      })(),
      el('div', { style: 'text-align:right' }, [
        el('div', { style: 'font-size:22px;font-weight:750;letter-spacing:.08em', text: 'INVOICE' }),
        el('div', { class: 'mono', style: 'font-size:15px;margin-top:4px', text: inv.invoice_no }),
        el('div', { class: 'muted small mt-1' }, [
          `Date: ${fmtDate(inv.issue_date)}`, el('br'),
          inv.due_date ? `Payment due: ${fmtDate(inv.due_date)}` : '',
        ]),
        el('div', { class: 'mt-1' }, badge(inv.status)),
      ]),
    ]),

    el('div', { class: 'invoice-sheet__parties' }, [
      el('div', {}, [
        el('div', { class: 'kv__label', text: 'Billed to' }),
        el('div', { style: 'font-weight:650;margin-top:4px', text: billedTo.name || '—' }),
        el('div', { class: 'muted small' }, billedTo.extra.filter(Boolean).flatMap((x) => [x, el('br')])),
      ]),
      inv.reference_no ? el('div', {}, [
        el('div', { class: 'kv__label', text: 'File reference' }),
        el('div', { style: 'font-weight:650;margin-top:4px', text: inv.reference_no }),
      ]) : null,
    ]),

    el('table', {}, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: '#' }), el('th', { text: 'Description' }),
        el('th', { style: 'text-align:right', text: 'Qty' }),
        el('th', { style: 'text-align:right', text: 'Unit price' }),
        el('th', { style: 'text-align:right', text: 'Amount' }),
      ])),
      el('tbody', {}, res.items.map((it, i) => el('tr', {}, [
        el('td', { text: String(i + 1) }),
        el('td', { text: it.description }),
        el('td', { class: 'mono', style: 'text-align:right', text: String(it.quantity) }),
        el('td', { class: 'mono', style: 'text-align:right', text: Number(it.unit_price).toFixed(2) }),
        el('td', { class: 'mono', style: 'text-align:right', text: Number(it.amount).toFixed(2) }),
      ]))),
    ]),

    el('div', { class: 'invoice-totals' }, [
      totalRow('Subtotal', money(inv.subtotal, inv.currency)),
      inv.discount ? totalRow('Discount', `− ${money(inv.discount, inv.currency)}`) : null,
      inv.tax ? totalRow('Tax / VAT', money(inv.tax, inv.currency)) : null,
      totalRow('Total', money(inv.total, inv.currency), true),
      totalRow('Paid', money(inv.paid, inv.currency)),
      totalRow('Balance due', money(due, inv.currency)),
    ].filter(Boolean)),

    inv.notes ? el('div', { class: 'mt-2' }, [
      el('div', { class: 'kv__label', text: 'Notes' }),
      el('div', { class: 'small', text: inv.notes }),
    ]) : null,

    el('div', { class: 'mt-2 muted small', style: 'border-top:1px solid var(--border);padding-top:14px' }, [
      company.invoice_terms || '', el('br'), company.invoice_footer || '',
    ]),
  ]);

  const paymentsCard = card('Payments received', table({
    columns: [
      { label: 'Date', render: (p) => fmtDate(p.paid_at) },
      { label: 'Method', render: (p) => p.method },
      { label: 'Reference', render: (p) => p.reference || '—' },
      { label: 'Note', render: (p) => p.note || '—' },
      { label: 'Received by', render: (p) => p.received_by_name || '—' },
      { label: 'Amount', align: 'right', render: (p) => money(p.amount, inv.currency) },
      { label: '', align: 'right', render: (p) => (can('payments') ? el('button', {
        class: 'btn btn--sm btn--danger', text: 'Remove',
        onClick: async () => {
          if (!await confirmDialog('Remove this payment record?')) return;
          try { await api.del(`/api/payments/${p.id}`); toast('Payment removed'); refresh(); }
          catch (err) { toastError(err); }
        },
      }) : null) },
    ],
    rows: res.payments,
    empty: 'No payment received yet',
    emptyIcon: '৳',
  }), { flush: true, actions: can('payments') && due > 0.001 ? el('button', {
    class: 'btn btn--sm btn--accent', text: '+ Record payment',
    onClick: () => paymentForm(inv, refresh),
  }) : null });

  return el('div', { class: 'stack' }, [
    el('div', { class: 'flex no-print' }, [
      el('a', { class: 'btn btn--sm btn--ghost', href: '#/invoices', text: '← All invoices' }),
      el('div', { style: 'flex:1' }),
      el('button', { class: 'btn btn--sm', text: '🖨 Print', onClick: () => window.print() }),
      el('button', {
        class: 'btn btn--sm', text: '⬇ Download PDF',
        title: 'Opens the print dialog — choose "Save as PDF"',
        onClick: () => window.print(),
      }),
      can('payments') && due > 0.001 ? el('button', {
        class: 'btn btn--sm btn--accent', text: '৳ Record payment',
        onClick: () => paymentForm(inv, refresh),
      }) : null,
      can('invoices') && inv.status !== 'Cancelled' ? el('button', {
        class: 'btn btn--sm', text: 'Edit',
        onClick: async () => {
          const full = await api.get(`/api/invoices/${inv.id}`);
          invoiceForm({ ...full.data, items: full.items }, refresh);
        },
      }) : null,
      can('invoices') && inv.status !== 'Cancelled' && inv.paid === 0 ? el('button', {
        class: 'btn btn--sm btn--danger', text: 'Cancel invoice',
        onClick: async () => {
          if (!await confirmDialog(`Cancel invoice ${inv.invoice_no}?`)) return;
          try { await api.post(`/api/invoices/${inv.id}/cancel`); toast('Invoice cancelled'); refresh(); }
          catch (err) { toastError(err); }
        },
      }) : null,
    ].filter(Boolean)),
    sheet,
    paymentsCard,
  ]);
}

function totalRow(label, value, grand) {
  return el('div', { class: `invoice-totals__row${grand ? ' invoice-totals__row--grand' : ''}` }, [
    el('span', { text: label }), el('span', { class: 'mono', text: value }),
  ]);
}

export function paymentForm(invoice, onDone) {
  const outstanding = Math.round((invoice.total - invoice.paid) * 100) / 100;
  formModal({
    title: `Record payment — ${invoice.invoice_no}`,
    fields: [
      el('p', { class: 'muted mt-0', text: `Outstanding balance: ${money(outstanding, invoice.currency)}` }),
      { legend: 'Payment', fields: [
        { name: 'amount', label: 'Amount received', type: 'number', step: '0.01', min: '0.01',
          required: true, value: outstanding },
        { name: 'method', label: 'Payment method', type: 'select', required: true,
          options: store.enums.payment_methods, value: 'Cash' },
        { name: 'paid_at', label: 'Payment date', type: 'date', required: true,
          value: new Date().toISOString().slice(0, 10) },
        { name: 'reference', label: 'Transaction reference' },
        { name: 'note', label: 'Note', type: 'textarea', span: true },
      ] },
    ],
    submitLabel: 'Save payment',
    onSubmit: async (values) => {
      await api.post('/api/payments', { ...values, invoice_id: invoice.id });
      toast('Payment recorded');
      onDone();
    },
  });
}
