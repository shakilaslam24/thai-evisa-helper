import { el, table, pagination, card, toastError, field, clear } from '../ui.js';
import { api, qs } from '../api.js';
import { store, staffUsers, listValues } from '../store.js';
import { navigate, parseHash } from '../router.js';

export function pageHead(title, subtitle, actions = []) {
  return el('div', { class: 'page-head' }, [
    el('div', { class: 'page-head__text' }, [
      el('h1', { text: title }),
      subtitle ? el('p', { text: subtitle }) : null,
    ]),
    el('div', { class: 'page-head__actions' }, actions.filter(Boolean)),
  ]);
}

export const staffOptions = () => staffUsers().map((u) => ({ value: u.id, label: u.name }));
export const partnerOptions = () => store.partners.map((p) => ({
  value: p.id, label: p.company_name ? `${p.partner_name} — ${p.company_name}` : p.partner_name,
}));
export const countryOptions = () => listValues('country');
export const serviceOptions = () => listValues('service');
export const sourceOptions = () => listValues('lead_source');

/**
 * Builds a filterable, paginated list backed by one API endpoint. Filter state
 * lives in the URL hash so a filtered view can be bookmarked and shared.
 */
export function listPage({
  endpoint, route: routeName, columns, filters = [], searchPlaceholder = 'Search…',
  emptyText, emptyIcon, onRowClick, summary, title, subtitle, actions = [], extraTop,
}) {
  const query = { ...parseHash().query };
  const state = { page: Number(query.page) || 1, limit: 25 };

  const tableHost = el('div');
  const pagerHost = el('div');
  const summaryHost = el('div');

  const applyToUrl = () => {
    const clean = {};
    for (const [k, v] of Object.entries(query)) if (v) clean[k] = v;
    if (state.page > 1) clean.page = state.page;
    navigate(`/${routeName}${qs(clean)}`, { replace: true });
  };

  async function load() {
    clear(tableHost).append(el('div', { class: 'spinner' }));
    try {
      const res = await api.get(`${endpoint}${qs({ ...query, page: state.page, limit: state.limit })}`);
      clear(tableHost).append(table({
        columns, rows: res.data, empty: emptyText, emptyIcon, onRowClick,
      }));
      clear(pagerHost);
      const pager = pagination({
        page: res.page, limit: res.limit, total: res.total,
        onChange: (p) => { state.page = p; applyToUrl(); load(); },
      });
      if (pager) pagerHost.append(pager);
      clear(summaryHost);
      if (summary) {
        const node = summary(res);
        if (node) summaryHost.append(node);
      }
    } catch (err) {
      clear(tableHost).append(el('div', { class: 'empty', text: err.message }));
      toastError(err);
    }
  }

  const searchInput = el('input', {
    type: 'search', placeholder: searchPlaceholder, value: query.search || '',
  });
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query.search = searchInput.value.trim();
      state.page = 1; applyToUrl(); load();
    }, 250);
  });

  const filterNodes = filters.map((f) => {
    const node = field({ ...f, value: query[f.name] ?? '', blank: f.blank || 'All' });
    node.querySelector('select,input').addEventListener('change', (e) => {
      query[f.name] = e.target.value;
      state.page = 1; applyToUrl(); load();
    });
    return node;
  });

  const resetBtn = el('button', {
    class: 'btn btn--sm', text: 'Clear filters',
    onClick: () => {
      for (const key of Object.keys(query)) delete query[key];
      state.page = 1;
      searchInput.value = '';
      for (const n of filterNodes) n.querySelector('select,input').value = '';
      applyToUrl(); load();
    },
  });

  const filterBar = el('div', { class: 'card__head' }, [
    el('div', { class: 'field', style: 'flex:1;min-width:200px' }, [searchInput]),
    ...filterNodes,
    resetBtn,
  ]);

  load();

  return el('div', { class: 'stack' }, [
    pageHead(title, subtitle, actions),
    extraTop || null,
    summaryHost,
    el('div', { class: 'card' }, [
      filterBar,
      el('div', { class: 'card__body card__body--flush' }, tableHost),
      pagerHost,
    ]),
  ]);
}

/** Renders a record's activity timeline with an inline "add note" box. */
export function activityPanel(entityType, entityId, { onAdded } = {}) {
  const host = el('div');
  const noteInput = el('textarea', { rows: 2, placeholder: 'Add a call note, update or reminder detail…' });
  const addBtn = el('button', {
    class: 'btn btn--primary btn--sm', text: 'Add note',
    onClick: async () => {
      const note = noteInput.value.trim();
      if (!note) return;
      addBtn.disabled = true;
      try {
        await api.post('/api/activities', { entity_type: entityType, entity_id: entityId, note });
        noteInput.value = '';
        await refresh();
        onAdded?.();
      } catch (err) { toastError(err); } finally { addBtn.disabled = false; }
    },
  });

  async function refresh() {
    clear(host).append(el('div', { class: 'spinner' }));
    try {
      const res = await api.get(`/api/activities${qs({ entity_type: entityType, entity_id: entityId, limit: 60 })}`);
      const { timeline } = await import('../ui.js');
      clear(host).append(timeline(res.data));
    } catch (err) {
      clear(host).append(el('div', { class: 'empty', text: err.message }));
    }
  }
  refresh();

  return card('Notes & activity timeline', [
    el('div', { class: 'stack' }, [
      el('div', { class: 'field' }, [noteInput]),
      el('div', {}, addBtn),
      host,
    ]),
  ]);
}

/** Reusable "upload document" panel for customers, files and partners. */
export function documentsPanel(entityType, entityId, documents, { canEdit, onChange }) {
  const host = el('div');

  function render(list) {
    clear(host);
    if (!list.length) {
      host.append(el('div', { class: 'empty' }, [
        el('div', { class: 'empty__icon', text: '📎' }),
        el('div', { class: 'empty__title', text: 'No documents uploaded yet' }),
      ]));
      return;
    }
    for (const doc of list) {
      host.append(el('div', { class: 'doc-item' }, [
        el('div', { class: 'doc-icon', text: doc.mime_type?.startsWith('image/') ? '🖼' : '📄' }),
        el('div', { style: 'flex:1;min-width:0' }, [
          el('div', { class: 'cell-title', text: doc.original_name }),
          el('div', { class: 'cell-sub', text: `${doc.category} · ${(doc.size_bytes / 1024).toFixed(0)} KB${doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}` }),
        ]),
        el('a', { class: 'btn btn--sm', href: `/api/documents/${doc.id}/download?inline=1`, target: '_blank', text: 'View' }),
        el('a', { class: 'btn btn--sm', href: `/api/documents/${doc.id}/download`, text: 'Download' }),
        canEdit ? el('button', {
          class: 'btn btn--sm btn--danger', text: 'Delete',
          onClick: async () => {
            const { confirmDialog, toast } = await import('../ui.js');
            if (!await confirmDialog(`Delete "${doc.original_name}"? This cannot be undone.`)) return;
            try {
              await api.del(`/api/documents/${doc.id}`);
              toast('Document deleted');
              onChange?.();
            } catch (err) { toastError(err); }
          },
        }) : null,
      ]));
    }
  }
  render(documents || []);

  const fileInput = el('input', { type: 'file', name: 'files', multiple: true });
  const categorySelect = el('select', { name: 'category' },
    listValues('document_category').map((c) => el('option', { value: c, text: c })));
  const uploadBtn = el('button', {
    class: 'btn btn--primary', text: 'Upload',
    onClick: async () => {
      if (!fileInput.files.length) return;
      const form = new FormData();
      form.append('entity_type', entityType);
      form.append('entity_id', entityId);
      form.append('category', categorySelect.value);
      for (const f of fileInput.files) form.append('files', f);
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading…';
      try {
        await api.upload('/api/documents', form);
        const { toast } = await import('../ui.js');
        toast('Document uploaded');
        fileInput.value = '';
        onChange?.();
      } catch (err) { toastError(err); } finally {
        uploadBtn.disabled = false; uploadBtn.textContent = 'Upload';
      }
    },
  });

  return card('Documents', [
    canEdit ? el('div', { class: 'flex mt-0', style: 'margin-bottom:12px' }, [
      el('div', { class: 'field', style: 'flex:1;min-width:180px' }, [
        el('label', { text: 'Category' }), categorySelect,
      ]),
      el('div', { class: 'field', style: 'flex:2;min-width:200px' }, [
        el('label', { text: 'Choose file(s)' }), fileInput,
      ]),
      uploadBtn,
    ]) : null,
    host,
  ]);
}

/**
 * Type-ahead customer chooser. Keeps the chosen id in a hidden input so it
 * submits with the form, and reports the full record through onSelect for
 * callers that need more than the id.
 */
export function customerPicker({
  name = 'customer_id', label = 'Customer', required = false,
  selected = null, hint = 'Search by name or passport number', onSelect,
} = {}) {
  const hidden = el('input', { type: 'hidden', name, value: selected?.id ?? '' });
  const search = el('input', {
    type: 'search', autocomplete: 'off',
    placeholder: 'Type a name or passport number…',
    value: selected ? (selected.full_name || `${selected.given_name} ${selected.surname || ''}`.trim()) : '',
  });
  const results = el('div', { class: 'search__results', hidden: true });
  const hintNode = el('div', { class: 'field__hint', text: hint });

  const choose = (customer) => {
    hidden.value = customer.id;
    search.value = customer.full_name;
    results.hidden = true;
    hintNode.textContent = [customer.passport_no, customer.phone].filter(Boolean).join(' · ')
      || 'No passport or phone on file';
    onSelect?.(customer);
  };

  let timer;
  search.addEventListener('input', () => {
    // Typing again clears the previous choice, so a stale id cannot be submitted.
    hidden.value = '';
    hintNode.textContent = hint;
    onSelect?.(null);
    clearTimeout(timer);
    const term = search.value.trim();
    if (term.length < 2) { results.hidden = true; return; }
    timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/customers${qs({ search: term, limit: 8 })}`);
        clear(results);
        if (!res.data.length) {
          results.append(el('div', { class: 'search__empty', text: `No customer matches “${term}”` }));
        }
        for (const c of res.data) {
          results.append(el('button', {
            type: 'button', class: 'search__item',
            style: 'width:100%;text-align:left;border:0;background:none;cursor:pointer',
            onClick: () => choose(c),
          }, [
            el('div', { class: 'cell-title', text: c.full_name }),
            el('div', { class: 'cell-sub', text: [c.passport_no, c.phone].filter(Boolean).join(' · ') || '—' }),
          ]));
        }
        results.hidden = false;
      } catch { results.hidden = true; }
    }, 250);
  });
  search.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 180));

  const node = el('div', { class: 'field span-2' }, [
    el('label', { text: label + (required ? ' *' : '') }),
    el('div', { class: 'search', style: 'max-width:none' }, [search, results]),
    hidden,
    hintNode,
  ]);
  node.selectedId = () => hidden.value;
  return node;
}
