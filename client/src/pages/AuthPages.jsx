
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Field, useToast } from '../components/ui';

// Password validation
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    errors.push('At least one special character');
  }

  return errors;
}

// Reusable authentication layout
function Shell({ eyebrow, title, sub, children, footer, onSubmit }) {
  return (
    <div className="auth">
      <div className="auth-layout">

        {/* Left branding section */}
        <section className="auth-brand-panel">
          <div className="auth-brand">
            <div className="auth-brand-mark">M</div>
            <span>Mailroom</span>
          </div>

          <div className="auth-brand-content">
            <span className="auth-brand-label">
              YOUR EMAIL WORKSPACE
            </span>

            <h2>Every email. One organised place.</h2>

            <p>
              Create professional email templates, manage your
              placeholders and send emails from one simple workspace.
            </p>

            <div className="auth-feature">
              <span className="auth-feature-icon">✓</span>
              <span>Manage all your email templates</span>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">✓</span>
              <span>Personalise emails with dynamic placeholders</span>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">✓</span>
              <span>Track email sending activity</span>
            </div>
          </div>

          <div className="auth-brand-bottom">
            <div className="auth-brand-line" />
            <span>One workspace. Complete email control.</span>
          </div>
        </section>

        {/* Right authentication section */}
        <section className="auth-content">
          <div className="auth-mobile-brand">
            <div className="auth-brand-mark">M</div>
            <span>Mailroom</span>
          </div>

          <form
            className="auth-card"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <div className="auth-eyebrow">{eyebrow}</div>

            <h1>{title}</h1>
            <p className="auth-subtitle">{sub}</p>

            {children}

            {footer && (
              <div className="auth-footer">
                {footer}
              </div>
            )}
          </form>

          <p className="auth-copyright">
            © {new Date().getFullYear()} Mailroom. All rights reserved.
          </p>
        </section>

      </div>
    </div>
  );
}

// Reusable form handling
function useForm(initial, action, done) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setV((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  const submit = async () => {
    if (busy) return;

    setErr('');
    setBusy(true);

    try {
      const result = await action(v);
      done(result, v);
    } catch (e) {
      setErr(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return {
    v,
    set,
    err,
    busy,
    submit,
  };
}

// First-time administrator setup
export function Setup({ onDone }) {
  const nav = useNavigate();

  const f = useForm(
    {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },

    (v) => {
      const errors = validatePassword(v.password);

      if (errors.length > 0) {
        throw new Error(
          'Password requirements: ' + errors.join(', ')
        );
      }

      if (v.password !== v.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      return api('/auth/setup', {
        method: 'POST',
        body: v,
      });
    },

    () => {
      onDone();
      nav('/login');
    }
  );

  return (
    <Shell
      eyebrow="FIRST-TIME SETUP"
      title="Create your account"
      sub="Set up your administrator account to get started with Mailroom."
      onSubmit={f.submit}
      footer={
        <span>
          <strong>Administrator setup</strong>
          <span className="auth-footer-note">
            {' '}· Registration closes after the first account is created.
          </span>
        </span>
      }
    >
      <Field label="Full name">
        <input
          type="text"
          placeholder="Enter your full name"
          autoComplete="name"
          value={f.v.fullName}
          onChange={f.set('fullName')}
          required
        />
      </Field>

      <Field label="Email address">
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={f.v.email}
          onChange={f.set('email')}
          required
        />
      </Field>

      <Field
        label="Password"
        hint="8+ characters, uppercase, lowercase, number and special character"
      >
        <input
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          value={f.v.password}
          onChange={f.set('password')}
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm password">
        <input
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={f.v.confirmPassword}
          onChange={f.set('confirmPassword')}
          required
        />
      </Field>

      {f.err && (
        <p className="error auth-error">
          {f.err}
        </p>
      )}

      <button
        className="btn auth-submit"
        type="submit"
        disabled={f.busy}
      >
        {f.busy ? 'Creating account...' : 'Create administrator account'}
      </button>
    </Shell>
  );
}

// Administrator login
export function Login({ onLogin }) {
  const f = useForm(
    {
      email: '',
      password: '',
    },

    (v) =>
      api('/auth/login', {
        method: 'POST',
        body: v,
      }),

    (r) => onLogin(r.data)
  );

  return (
    <Shell
      eyebrow="ADMINISTRATOR LOGIN"
      title="Welcome back"
      sub="Sign in to continue to your Mailroom workspace."
      onSubmit={f.submit}
      footer={
        <span>
          <strong>Secure administrator access</strong>
          <span className="auth-footer-note">
            {' '}· Your account is protected.
          </span>
        </span>
      }
    >
      <Field label="Email address">
        <input
          type="email"
          placeholder="Enter your email"
          autoComplete="username"
          value={f.v.email}
          onChange={f.set('email')}
          required
        />
      </Field>

      <Field label="Password">
        <input
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={f.v.password}
          onChange={f.set('password')}
          required
        />
      </Field>

      <div className="auth-forgot">
        <Link to="/forgot-password" className="link">
          Forgot password?
        </Link>
      </div>

      {f.err && (
        <p className="error auth-error">
          {f.err}
        </p>
      )}

      <button
        className="btn auth-submit"
        type="submit"
        disabled={f.busy}
      >
        {f.busy ? 'Signing in...' : 'Sign in to Mailroom'}
      </button>
    </Shell>
  );
}

// Forgot password
export function Forgot() {
  const toast = useToast();

  const f = useForm(
    { email: '' },

    (v) =>
      api('/auth/forgot-password', {
        method: 'POST',
        body: v,
      }),

    (r) => toast(r.message)
  );

  return (
    <Shell
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      sub="Enter your administrator email address and we'll send you a password reset link."
      onSubmit={f.submit}
      footer={
        <Link to="/login" className="auth-back-link">
          ← Back to sign in
        </Link>
      }
    >
      <Field label="Email address">
        <input
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          value={f.v.email}
          onChange={f.set('email')}
          required
        />
      </Field>

      {f.err && (
        <p className="error auth-error">
          {f.err}
        </p>
      )}

      <button
        className="btn auth-submit"
        type="submit"
        disabled={f.busy}
      >
        {f.busy ? 'Sending...' : 'Send reset link'}
      </button>
    </Shell>
  );
}

// Reset password
export function Reset() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();

  const f = useForm(
    {
      password: '',
      confirm: '',
    },

    (v) => {
      const errors = validatePassword(v.password);

      if (errors.length > 0) {
        throw new Error(
          'Password requirements: ' + errors.join(', ')
        );
      }

      if (v.password !== v.confirm) {
        throw new Error('Passwords do not match');
      }

      return api('/auth/reset-password', {
        method: 'POST',
        body: {
          token: sp.get('token'),
          password: v.password,
        },
      });
    },

    (r) => {
      toast(r.message);
      nav('/login');
    }
  );

  return (
    <Shell
      eyebrow="ACCOUNT RECOVERY"
      title="Choose a new password"
      sub="Create a new password for your Mailroom administrator account."
      onSubmit={f.submit}
      footer={
        <Link to="/login" className="auth-back-link">
          ← Back to sign in
        </Link>
      }
    >
      <Field
        label="New password"
        hint="8+ characters, uppercase, lowercase, number and special character"
      >
        <input
          type="password"
          placeholder="Enter your new password"
          autoComplete="new-password"
          value={f.v.password}
          onChange={f.set('password')}
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm new password">
        <input
          type="password"
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          value={f.v.confirm}
          onChange={f.set('confirm')}
          required
        />
      </Field>

      {f.err && (
        <p className="error auth-error">
          {f.err}
        </p>
      )}

      <button
        className="btn auth-submit"
        type="submit"
        disabled={f.busy}
      >
        {f.busy ? 'Updating password...' : 'Update password'}
      </button>
    </Shell>
  );
}
