import { el } from './ui.js';
import { api } from './api.js';

/** Renders the sign-in screen; resolves with the authenticated user. */
export function renderLogin(root, onSuccess) {
  const error = el('div', { class: 'login-error', hidden: true });
  const email = el('input', { type: 'email', name: 'email', required: true, autocomplete: 'username', placeholder: 'you@company.com' });
  const password = el('input', { type: 'password', name: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••••' });
  const submit = el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Sign in' });

  const form = el('form', { class: 'stack' }, [
    error,
    el('div', { class: 'field' }, [el('label', { for: 'email', text: 'Email address' }), email]),
    el('div', { class: 'field' }, [el('label', { for: 'password', text: 'Password' }), password]),
    submit,
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      const res = await api.post('/api/auth/login', {
        email: email.value.trim(), password: password.value,
      });
      onSuccess(res.user);
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Sign in';
      password.select();
    }
  });

  root.replaceChildren(el('div', { class: 'login-page' }, el('div', { class: 'login-card' }, [
    el('div', { class: 'login-card__brand' }, [
      el('div', { class: 'sidebar__logo', text: 'DF' }),
      el('div', {}, [
        el('h1', { text: 'DreamFly Consultancy' }),
        el('div', { class: 'muted small', text: 'CRM & Operations Management' }),
      ]),
    ]),
    form,
    el('p', { class: 'faint small mt-2', text: 'Contact your administrator if you need an account or a password reset.' }),
  ])));
  email.focus();
}
