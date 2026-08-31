import { el, card, table, fmtDateTime, badge, toast, toastError, confirmDialog, clear } from '../ui.js';
import { api, qs } from '../api.js';
import { store, can, canDelete, listValues } from '../store.js';
import { pageHead, staffOptions } from './common.js';
import { navigate, parseHash } from '../router.js';

const ENTITY_ROUTE = { customer: 'customers', case_file: 'files', partner: 'partners', lead: 'leads' };
const ENTITY_LABEL = { customer: 'Customer', case_file: 'File', partner: 'Partner', lead: 'Lead' };

export default function documentsView() {
  const initial = parseHash().query;
  const query = {
    entity_type: initial.entity_type || '',
    category: initial.category || '',
    uploaded_by: initial.uploaded_by || '',
    search: initial.search || '',
  };
  const host = el('div');

  const sync = () => {
    const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    navigate(`/documents${qs(clean)}`, { replace: true });
  };

  async function load() {
    clear(host).append(el('div', { class: 'spinner' }));
    try {
      const res = await api.get(`/api/documents${qs(query)}`);
      clear(host).append(table({
        columns: [
          // Whose document this is matters more than what the file is called.
          {
            label: 'Belongs to',
            render: (d) => el('div', {}, [
              el('a', {
                class: 'cell-title',
                href: `#/${ENTITY_ROUTE[d.entity_type]}/${d.entity_id}`,
                text: d.owner_name || `${ENTITY_LABEL[d.entity_type]} #${d.entity_id}`,
              }),
              el('div', { class: 'cell-sub', text: [d.owner_passport, d.reference_no].filter(Boolean).join(' · ')
                || ENTITY_LABEL[d.entity_type] }),
            ]),
          },
          {
            label: 'File name',
            render: (d) => el('div', {}, [
              el('div', { text: d.original_name }),
              el('div', { class: 'cell-sub', text: `${(d.size_bytes / 1024).toFixed(0)} KB` }),
            ]),
          },
          { label: 'Category', render: (d) => badge(d.category, 'info') },
          {
            label: 'Uploaded by',
            render: (d) => el('div', {}, [
              el('div', { text: d.uploaded_by_name || '—' }),
              el('div', { class: 'cell-sub', text: fmtDateTime(d.created_at) }),
            ]),
          },
          {
            label: '',
            align: 'right',
            render: (d) => el('div', { class: 'row-actions' }, [
              el('a', { class: 'btn btn--sm', href: `/api/documents/${d.id}/download?inline=1`, target: '_blank', text: 'View' }),
              el('a', { class: 'btn btn--sm', href: `/api/documents/${d.id}/download`, text: 'Download' }),
              canDelete() ? el('button', {
                class: 'btn btn--sm btn--danger', text: 'Delete',
                onClick: async () => {
                  if (!await confirmDialog(`Delete "${d.original_name}"?`)) return;
                  try { await api.del(`/api/documents/${d.id}`); toast('Document deleted'); load(); }
                  catch (err) { toastError(err); }
                },
              }) : null,
            ]),
          },
        ],
        rows: res.data,
        empty: 'No documents match these filters',
        emptyIcon: '📎',
      }));
    } catch (err) {
      clear(host).append(el('div', { class: 'empty', text: err.message }));
    }
  }

  const searchInput = el('input', {
    type: 'search', value: query.search,
    placeholder: 'Search by name, passport number, file reference or file name…',
  });
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { query.search = searchInput.value.trim(); sync(); load(); }, 250);
  });

  const select = (name, blank, options) => {
    const node = el('select', {}, [
      el('option', { value: '', text: blank }),
      ...options.map((o) => el('option', {
        value: o.value, text: o.label, selected: String(o.value) === String(query[name]),
      })),
    ]);
    node.addEventListener('change', () => { query[name] = node.value; sync(); load(); });
    return node;
  };

  const typeSelect = select('entity_type', 'All records',
    Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label })));
  const catSelect = select('category', 'All categories',
    listValues('document_category').map((c) => ({ value: c, label: c })));
  const uploaderSelect = select('uploaded_by', 'Anyone', staffOptions());

  const mineButton = el('button', {
    class: `btn btn--sm${String(query.uploaded_by) === String(store.user.id) ? ' btn--primary' : ''}`,
    text: 'Only my uploads',
    onClick: () => {
      query.uploaded_by = String(query.uploaded_by) === String(store.user.id) ? '' : String(store.user.id);
      uploaderSelect.value = query.uploaded_by;
      mineButton.classList.toggle('btn--primary', Boolean(query.uploaded_by));
      sync();
      load();
    },
  });

  load();

  return el('div', { class: 'stack' }, [
    pageHead('Documents', 'Every file uploaded against a lead, customer, case or partner'),
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'field', style: 'flex:1;min-width:220px' }, [searchInput]),
        el('div', { class: 'field' }, [el('label', { text: 'Attached to' }), typeSelect]),
        el('div', { class: 'field' }, [el('label', { text: 'Category' }), catSelect]),
        el('div', { class: 'field' }, [el('label', { text: 'Uploaded by' }), uploaderSelect]),
        mineButton,
      ]),
      el('div', { class: 'card__body card__body--flush' }, host),
    ]),
    el('p', { class: 'faint small', text: 'Upload documents from a customer, file or partner profile. Accepted: images, PDF, Word and Excel files up to 15 MB.' }),
  ]);
}
