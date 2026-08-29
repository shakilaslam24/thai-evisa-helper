import { el, card, table, fmtDateTime, badge, toast, toastError, confirmDialog, clear } from '../ui.js';
import { api, qs } from '../api.js';
import { can, listValues } from '../store.js';
import { pageHead } from './common.js';

const ENTITY_ROUTE = { customer: 'customers', case_file: 'files', partner: 'partners', lead: 'leads' };
const ENTITY_LABEL = { customer: 'Customer', case_file: 'File', partner: 'Partner', lead: 'Lead' };

export default function documentsView() {
  const query = { entity_type: '', category: '', search: '' };
  const host = el('div');

  async function load() {
    clear(host).append(el('div', { class: 'spinner' }));
    try {
      const res = await api.get(`/api/documents${qs(query)}`);
      clear(host).append(table({
        columns: [
          { label: 'File name', render: (d) => el('div', {}, [
            el('div', { class: 'cell-title', text: d.original_name }),
            el('div', { class: 'cell-sub', text: `${(d.size_bytes / 1024).toFixed(0)} KB · ${d.mime_type || 'unknown type'}` }),
          ]) },
          { label: 'Category', render: (d) => badge(d.category, 'info') },
          { label: 'Attached to', render: (d) => el('a', {
            href: `#/${ENTITY_ROUTE[d.entity_type]}/${d.entity_id}`,
            text: `${ENTITY_LABEL[d.entity_type]} #${d.entity_id}`,
          }) },
          { label: 'Uploaded', render: (d) => fmtDateTime(d.created_at) },
          { label: 'By', render: (d) => d.uploaded_by_name || '—' },
          { label: '', align: 'right', render: (d) => el('div', { class: 'row-actions' }, [
            el('a', { class: 'btn btn--sm', href: `/api/documents/${d.id}/download?inline=1`, target: '_blank', text: 'View' }),
            el('a', { class: 'btn btn--sm', href: `/api/documents/${d.id}/download`, text: 'Download' }),
            can('documents') ? el('button', {
              class: 'btn btn--sm btn--danger', text: 'Delete',
              onClick: async () => {
                if (!await confirmDialog(`Delete "${d.original_name}"?`)) return;
                try { await api.del(`/api/documents/${d.id}`); toast('Document deleted'); load(); }
                catch (err) { toastError(err); }
              },
            }) : null,
          ]) },
        ],
        rows: res.data,
        empty: 'No documents match these filters',
        emptyIcon: '📎',
      }));
    } catch (err) {
      clear(host).append(el('div', { class: 'empty', text: err.message }));
    }
  }

  const searchInput = el('input', { type: 'search', placeholder: 'Search by file name…' });
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { query.search = searchInput.value.trim(); load(); }, 250);
  });

  const typeSelect = el('select', {}, [
    el('option', { value: '', text: 'All records' }),
    ...Object.entries(ENTITY_LABEL).map(([v, l]) => el('option', { value: v, text: l })),
  ]);
  typeSelect.addEventListener('change', () => { query.entity_type = typeSelect.value; load(); });

  const catSelect = el('select', {}, [
    el('option', { value: '', text: 'All categories' }),
    ...listValues('document_category').map((c) => el('option', { value: c, text: c })),
  ]);
  catSelect.addEventListener('change', () => { query.category = catSelect.value; load(); });

  load();

  return el('div', { class: 'stack' }, [
    pageHead('Documents', 'Every file uploaded against a lead, customer, case or partner'),
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'field', style: 'flex:1;min-width:200px' }, [searchInput]),
        el('div', { class: 'field' }, [el('label', { text: 'Attached to' }), typeSelect]),
        el('div', { class: 'field' }, [el('label', { text: 'Category' }), catSelect]),
      ]),
      el('div', { class: 'card__body card__body--flush' }, host),
    ]),
    el('p', { class: 'faint small', text: 'Upload documents from a customer, file or partner profile. Accepted: images, PDF, Word and Excel files up to 15 MB.' }),
  ]);
}
