/** Small DOM toolkit: element building, formatting, tables, modals, toasts. */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const frag = (children) => {
  const f = document.createDocumentFragment();
  for (const c of [].concat(children)) if (c) f.append(c);
  return f;
};

export function clear(node) { while (node.firstChild) node.firstChild.remove(); return node; }

/* ------------------------------ formatting ------------------------------ */

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return 'just now';
  if (Math.abs(mins) < 60) return mins > 0 ? `${mins}m ago` : `in ${-mins}m`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return hours > 0 ? `${hours}h ago` : `in ${-hours}h`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return days > 0 ? `${days}d ago` : `in ${-days}d`;
  return fmtDate(value);
}

export const money = (amount, currency = 'BDT') =>
  `${currency} ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const initials = (name) => String(name || '?').trim().split(/\s+/)
  .slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Converts a datetime-local value to the "YYYY-MM-DD HH:MM" the API stores. */
export const toSqlDateTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : null);
export const toInputDateTime = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');

/* -------------------------------- badges -------------------------------- */

const BADGE_TONES = {
  // leads
  'New Lead': 'info', Contacted: 'info', 'Follow-up Running': 'warn', Interested: 'purple',
  'Meeting Fixed': 'purple', Converted: 'ok', 'Not Interested': 'danger', Closed: '',
  Hot: 'danger', Warm: 'warn', Cold: 'info',
  // files
  Draft: '', 'Documents Pending': 'warn', 'Ready for Submission': 'info', Submitted: 'info',
  'Under Processing': 'purple', 'Additional Documents Required': 'warn',
  'Interview Called': 'purple', Approved: 'ok', Rejected: 'danger', Delivered: 'ok',
  Completed: 'ok', Hold: 'warn',
  // money
  Unpaid: 'danger', 'Partial Paid': 'warn', Paid: 'ok', Cancelled: '',
  // partners / meetings / checklist
  Active: 'ok', Inactive: '', Suspended: 'danger',
  Scheduled: 'info', Rescheduled: 'warn',
  Missing: 'danger', Received: 'ok', 'Not Required': '',
  Pending: 'warn', Done: 'ok', Overdue: 'danger',
};

export function badge(value, tone) {
  if (!value) return el('span', { class: 'faint', text: '—' });
  const t = tone ?? BADGE_TONES[value] ?? '';
  return el('span', { class: `badge${t ? ` badge--${t}` : ''}`, text: value });
}

/* -------------------------------- toasts -------------------------------- */

let toastHost = null;
export function toast(message, kind = 'ok') {
  if (!toastHost) {
    toastHost = el('div', { class: 'toasts' });
    document.body.append(toastHost);
  }
  const node = el('div', { class: `toast toast--${kind}`, text: message });
  toastHost.append(node);
  setTimeout(() => node.remove(), kind === 'err' ? 6000 : 3500);
}

export const toastError = (err) =>
  toast(err?.message || 'Something went wrong', 'err');

/* -------------------------------- modal -------------------------------- */

let openModal = null;

export function modal({ title, body, footer, wide = false, onClose }) {
  closeModal();
  const dialog = el('div', { class: `modal${wide ? ' modal--wide' : ''}`, role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'modal__head' }, [
      el('h2', { text: title }),
      el('button', { class: 'iconbtn', 'aria-label': 'Close', onClick: () => closeModal(), html: '&times;' }),
    ]),
    el('div', { class: 'modal__body' }, body),
    footer ? el('div', { class: 'modal__foot' }, footer) : null,
  ]);
  const backdrop = el('div', {
    class: 'modal-backdrop',
    onClick: (e) => { if (e.target === backdrop) closeModal(); },
  }, dialog);

  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  openModal = { backdrop, onClose };
  const focusable = dialog.querySelector('input,select,textarea,button');
  focusable?.focus();
  return { close: closeModal, dialog };
}

export function closeModal() {
  if (!openModal) return;
  const { backdrop, onClose } = openModal;
  openModal = null;
  backdrop.remove();
  document.body.style.overflow = '';
  onClose?.();
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

export function confirmDialog(message, { title = 'Please confirm', danger = true } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    modal({
      title,
      body: el('p', { text: message, class: 'mt-0' }),
      footer: [
        el('button', { class: 'btn', text: 'Cancel', onClick: () => { done(false); closeModal(); } }),
        el('button', {
          class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, text: 'Yes, continue',
          onClick: () => { done(true); closeModal(); },
        }),
      ],
      onClose: () => done(false),
    });
  });
}

/* -------------------------------- forms -------------------------------- */

/**
 * Declarative field builder.
 * field({ name, label, type, value, options, required, span, hint })
 */
export function field(spec) {
  const { name, label, type = 'text', value, options, required, span, hint, rows, placeholder, min, step } = spec;
  let input;
  if (type === 'select') {
    input = el('select', { name, required });
    const opts = (options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    if (!required || spec.blank) {
      input.append(el('option', { value: '', text: spec.blank || '— select —' }));
    }
    for (const o of opts) {
      input.append(el('option', { value: o.value, text: o.label, selected: String(o.value) === String(value ?? '') }));
    }
    if (value !== undefined && value !== null && value !== ''
        && !opts.some((o) => String(o.value) === String(value))) {
      // Keep a saved value visible even if it has since been removed from the list.
      input.append(el('option', { value, text: `${value} (retired)`, selected: true }));
    }
  } else if (type === 'textarea') {
    input = el('textarea', { name, required, rows: rows || 3, placeholder });
    input.value = value ?? '';
  } else {
    input = el('input', { name, type, required, placeholder, min, step });
    input.value = value ?? '';
  }
  return el('div', { class: `field${span ? ' span-2' : ''}` }, [
    label ? el('label', { for: name, text: label + (required ? ' *' : '') }) : null,
    input,
    hint ? el('div', { class: 'field__hint', text: hint }) : null,
  ]);
}

export function formValues(form) {
  const out = {};
  for (const [key, value] of new FormData(form).entries()) {
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

/**
 * Builds a modal form. `fields` is an array of field specs or fieldset groups
 * ({ legend, fields }). onSubmit receives the collected values.
 */
let formSeq = 0;

export function formModal({ title, fields, submitLabel = 'Save', wide, onSubmit, extra }) {
  // The submit button lives in the modal footer, outside the <form>, so it is
  // wired back to it with the `form` attribute.
  const formId = `dfform-${++formSeq}`;
  const form = el('form', { id: formId, class: 'stack' });
  for (const group of fields) {
    if (group && group.legend) {
      form.append(el('fieldset', { class: 'section' }, [
        el('legend', { text: group.legend }),
        el('div', { class: 'form-grid' }, group.fields.filter(Boolean).map(field)),
      ]));
    } else if (group instanceof Node) {
      form.append(group);
    } else if (group) {
      form.append(el('div', { class: 'form-grid' }, [field(group)]));
    }
  }
  if (extra) form.append(extra);

  const submit = el('button', { class: 'btn btn--primary', type: 'submit', form: formId, text: submitLabel });
  const handle = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    submit.textContent = 'Saving…';
    try {
      await onSubmit(formValues(form), form);
      closeModal();
    } catch (err) {
      toastError(err);
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  };
  form.addEventListener('submit', handle);

  return modal({
    title, wide, body: form,
    footer: [
      el('button', { class: 'btn', type: 'button', text: 'Cancel', onClick: () => closeModal() }),
      submit,
    ],
  });
}

/* -------------------------------- tables -------------------------------- */

/**
 * table({ columns:[{key,label,render,align,width}], rows, empty, onRowClick })
 */
export function table({ columns, rows, empty = 'Nothing to show yet', emptyIcon = '📭', onRowClick }) {
  if (!rows || !rows.length) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', text: emptyIcon }),
      el('div', { class: 'empty__title', text: empty }),
    ]);
  }
  const head = el('tr', {}, columns.map((c) =>
    el('th', { class: c.align === 'right' ? 'num' : null, style: c.width ? `width:${c.width}` : null, text: c.label })));

  const body = el('tbody', {}, rows.map((row) => {
    const tr = el('tr', {
      style: onRowClick ? 'cursor:pointer' : null,
      onClick: onRowClick ? (e) => {
        if (e.target.closest('button, a, input, select')) return;
        onRowClick(row);
      } : null,
    }, columns.map((c) => {
      const content = c.render ? c.render(row) : row[c.key];
      return el('td', { class: c.align === 'right' ? 'num' : null },
        content instanceof Node ? content : (content ?? '—'));
    }));
    return tr;
  }));

  return el('div', { class: 'table-wrap' }, el('table', { class: 'data' }, [el('thead', {}, head), body]));
}

export function pagination({ page, limit, total, onChange }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  if (total <= limit) return null;
  return el('div', { class: 'pagination' }, [
    el('span', { text: `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` }),
    el('button', { class: 'btn btn--sm', text: '‹ Prev', disabled: page <= 1, onClick: () => onChange(page - 1) }),
    el('span', { text: `Page ${page} / ${pages}` }),
    el('button', { class: 'btn btn--sm', text: 'Next ›', disabled: page >= pages, onClick: () => onChange(page + 1) }),
  ]);
}

export const spinner = () => el('div', { class: 'spinner' });

export function card(title, bodyChildren, { actions, flush } = {}) {
  return el('div', { class: 'card' }, [
    title ? el('div', { class: 'card__head' }, [
      el('h2', { text: title }), el('div', { class: 'spacer' }),
      ...[].concat(actions || []).filter(Boolean),
    ]) : null,
    el('div', { class: `card__body${flush ? ' card__body--flush' : ''}` }, bodyChildren),
  ]);
}

export function kv(pairs) {
  return el('div', { class: 'kv' }, pairs.filter(Boolean).map(([label, value]) =>
    el('div', { class: 'kv__item' }, [
      el('div', { class: 'kv__label', text: label }),
      el('div', { class: 'kv__value' }, value instanceof Node ? value : (value || '—')),
    ])));
}

export function statCard({ label, value, meta, link, tone }) {
  const children = [
    el('div', { class: 'stat__label', text: label }),
    el('div', { class: 'stat__value', text: value }),
    meta ? el('div', { class: 'stat__meta', text: meta }) : null,
  ];
  const cls = `stat${tone ? ` stat--${tone}` : ''}`;
  return link ? el('a', { class: cls, href: link }, children) : el('div', { class: cls }, children);
}

export function tabs(items, active, onSelect) {
  return el('div', { class: 'tabs' }, items.map(([key, label]) =>
    el('button', {
      class: `tab${key === active ? ' tab--active' : ''}`, text: label,
      onClick: () => onSelect(key),
    })));
}

/**
 * Simple grouped bar chart with no external library. Bar heights are computed in
 * pixels because a percentage height inside a flex item does not resolve reliably.
 */
export function barChart(series, { labels, colors = ['', 'alt'], height = 150 } = {}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const plotHeight = height - 24;
  const columns = labels.map((label, i) => el('div', { class: 'chart__col' }, [
    el('div', { class: 'chart__bars' }, series.map((s, si) => {
      const value = s.values[i] || 0;
      const bar = el('div', {
        class: `chart__bar${colors[si] ? ` chart__bar--${colors[si]}` : ''}`,
        title: `${s.name}: ${value.toLocaleString()}`,
      });
      bar.style.height = `${value > 0 ? Math.max((value / max) * plotHeight, 4) : 2}px`;
      return bar;
    })),
    el('div', { class: 'chart__label', text: label }),
  ]));
  const chart = el('div', { class: 'chart' }, columns);
  chart.style.height = `${height}px`;
  return el('div', {}, [
    chart,
    el('div', { class: 'legend mt-1' }, series.map((s, i) => el('span', {}, [
      el('span', {
        class: 'legend__dot',
        style: `background:${colors[i] === 'alt' ? 'var(--accent-500)' : 'var(--brand-500)'}`,
      }),
      `${s.name} (${s.values.reduce((a, b) => a + b, 0).toLocaleString()})`,
    ]))),
  ]);
}

/** "2026-08" → "Aug 26", for compact chart axes. */
export function monthLabel(ym) {
  const [year, month] = String(ym).split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(month) - 1] || month} ${String(year).slice(2)}`;
}

export function timeline(entries) {
  if (!entries.length) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty__icon', text: '🕓' }),
      el('div', { class: 'empty__title', text: 'No activity recorded yet' }),
    ]);
  }
  return el('div', { class: 'timeline' }, entries.map((a) => el('div', { class: 'timeline__item' }, [
    el('div', { class: 'timeline__action', text: a.action }),
    a.detail ? el('div', { class: 'timeline__detail', text: a.detail }) : null,
    el('div', { class: 'timeline__meta', text: `${a.user_name || 'System'} · ${fmtDateTime(a.created_at)}` }),
  ])));
}
