import { el, clear, badge, fmtDate, fmtDateTime } from './ui.js';
import { api } from './api.js';

const root = document.getElementById('root');

/** Company details brand the page, and tell the client who to call. */
async function loadBranding() {
  try {
    const res = await api.get('/api/track/settings');
    const s = res.data;
    document.title = `Track Your Application — ${s.company_name}`;
    // The DreamFly lockup is the default; a logo set in Settings replaces it,
    // and the company name shows as text when no image is available.
    const logo = document.getElementById('logo');
    const heading = document.getElementById('companyName');
    if (s.company_logo_url) logo.src = s.company_logo_url;
    logo.alt = s.company_name;
    logo.addEventListener('error', () => {
      logo.hidden = true;
      heading.hidden = false;
      heading.textContent = s.company_name;
    });
    if (s.company_tagline) document.getElementById('companyTag').textContent = s.company_tagline;

    const contact = document.getElementById('contact');
    const bits = [];
    for (const phone of [s.company_phone, s.company_phone_alt, s.company_phone_alt2]) {
      if (phone) bits.push(el('a', { href: `tel:${phone.replace(/\s+/g, '')}`, text: phone }));
    }
    if (s.company_email) bits.push(el('a', { href: `mailto:${s.company_email}`, text: s.company_email }));
    if (bits.length) {
      contact.append('Need help? Call us: ');
      bits.forEach((b, i) => { if (i) contact.append(' · '); contact.append(b); });
    }
    if (s.company_address) {
      contact.append(el('div', { class: 'track-address', text: s.company_address }));
    }
    return s;
  } catch {
    return { enabled: true };
  }
}

function renderForm(message) {
  const error = el('div', { class: 'login-error', hidden: !message, text: message || '' });
  const passport = el('input', {
    name: 'passport_no', required: true, autocomplete: 'off', autocapitalize: 'characters',
    placeholder: 'e.g. BX0154892',
  });
  const name = el('input', {
    name: 'name', required: true, autocomplete: 'name', placeholder: 'e.g. Mahmudul Karim',
  });
  const submit = el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Check status' });

  const form = el('form', { class: 'stack' }, [
    error,
    el('div', { class: 'field' }, [el('label', { text: 'Passport number' }), passport]),
    el('div', { class: 'field' }, [
      el('label', { text: 'Your name' }), name,
      el('div', { class: 'field__hint', text: 'Full name, or just your surname' }),
    ]),
    submit,
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Checking…';
    try {
      const res = await api.post('/api/track', {
        passport_no: passport.value.trim(),
        name: name.value.trim(),
      });
      renderResult(res.data);
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Check status';
    }
  });

  clear(root).append(el('div', { class: 'track-card' }, [
    el('h2', { class: 'mt-0', text: 'Find your application' }),
    el('p', { class: 'muted small', style: 'margin:6px 0 18px',
      text: 'Enter your passport number and your name as written in your passport.' }),
    form,
  ]));
  passport.focus();
}

function progressBar(progress) {
  const steps = [];
  for (let i = 0; i < progress.total; i += 1) {
    const filled = i < progress.step;
    steps.push(el('div', {
      class: `track-step${filled ? (progress.step === 0 ? ' track-step--rejected' : ' track-step--done') : ''}`,
    }));
  }
  return el('div', { class: 'track-steps' }, steps);
}

function renderResult(data) {
  const cards = data.applications.map((app) => el('div', { class: 'track-app' }, [
    el('div', { class: 'flex-between' }, [
      el('div', {}, [
        el('div', { class: 'cell-title', style: 'font-size:15px', text: app.reference_no || 'Application' }),
        el('div', { class: 'cell-sub', text: [app.service_type, app.country].filter(Boolean).join(' · ') }),
      ]),
      badge(app.status),
    ]),

    app.status !== 'Rejected' ? progressBar(app.progress) : null,
    el('p', { class: 'track-msg', text: app.message }),

    (() => {
      const dates = [
        ['Submitted', app.submission_date],
        ['Embassy / VFS', app.embassy_date],
        ['Interview', app.interview_date],
        ['Completed', app.completion_date],
      ].filter(([, v]) => v);
      if (!dates.length) return null;
      return el('div', { class: 'kv', style: 'margin-top:14px' }, dates.map(([label, value]) =>
        el('div', { class: 'kv__item' }, [
          el('div', { class: 'kv__label', text: label }),
          el('div', { class: 'kv__value', text: fmtDate(value) }),
        ])));
    })(),

    app.documents_needed.length ? el('div', { class: 'track-needed' }, [
      el('strong', { text: 'Documents we still need from you:' }),
      el('ul', {}, app.documents_needed.map((name) => el('li', { text: name }))),
    ]) : null,

    el('div', { class: 'faint small', style: 'margin-top:12px',
      text: `Last updated ${fmtDateTime(app.last_updated)}` }),
  ]));

  clear(root).append(el('div', { class: 'track-card' }, [
    el('div', { class: 'flex-between', style: 'margin-bottom:14px' }, [
      el('div', {}, [
        el('h2', { class: 'mt-0', text: data.name }),
        el('div', { class: 'muted small', text: `${data.applications.length} application(s) found` }),
      ]),
      el('button', { class: 'btn btn--sm', text: 'Check another', onClick: () => renderForm() }),
    ]),
    ...cards,
  ]));
  window.scrollTo({ top: 0 });
}

const branding = await loadBranding();
if (branding.enabled === false) {
  clear(root).append(el('div', { class: 'track-card' }, [
    el('h2', { class: 'mt-0', text: 'Online tracking is unavailable' }),
    el('p', { class: 'muted', text: 'Please contact our office for an update on your application.' }),
  ]));
} else {
  renderForm();
}
