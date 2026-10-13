import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot, UserPlus, Mail, Lock, User, AlertTriangle, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const STRENGTH_CONFIG = [
  { label: 'Too short',  color: 'var(--color-danger)',  pct: 20 },
  { label: 'Weak',       color: '#f97316',              pct: 40 },
  { label: 'Fair',       color: 'var(--color-warning)', pct: 60 },
  { label: 'Strong',     color: '#84cc16',              pct: 80 },
  { label: 'Very strong',color: 'var(--color-success)', pct: 100 },
];

const strengthIndex = (pwd) => {
  if (pwd.length === 0) return -1;
  if (pwd.length < 6)   return 0;
  let score = 1;
  if (pwd.length >= 10)            score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  return Math.min(score - 1, 4);
};

export default function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]           = useState({ name: '', email: '', password: '' });
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pwdIdx = strengthIndex(form.password);
  const strength = pwdIdx >= 0 ? STRENGTH_CONFIG[pwdIdx] : null;

  // ── Inline validation ─────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Full name must be at least 2 characters.';
    if (!form.email)                               e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email))    e.email = 'Enter a valid email address.';
    if (!form.password)                            e.password = 'Password is required.';
    else if (form.password.length < 6)             e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }

    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldErr = (field) => errors[field] ? (
    <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-danger)' }}>{errors[field]}</p>
  ) : null;

  const inputStyle = (field) => errors[field]
    ? { borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.08)' }
    : {};

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Background grid + glow */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.14) 0%, transparent 70%)',
      }} />

      <div className="relative w-full max-w-sm animate-fade-in">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Bot size={24} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            AgentSphere <span style={{ color: 'var(--color-accent)' }}>AI</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
            Autonomous Agentic AI & Intelligent Systems
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-7">
          <h2 className="text-base font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
            Create your workspace
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Deploy the AI operations engine in seconds.
          </p>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 mb-5 text-xs animate-fade-in"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--color-danger)' }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                     style={{ color: 'var(--color-text-muted)' }}>
                Full name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: errors.name ? 'var(--color-danger)' : 'var(--color-text-faint)' }} />
                <input name="name" type="text" autoComplete="name"
                       value={form.name} onChange={handleChange} placeholder="Jane Smith"
                       className="input pl-9" style={inputStyle('name')} />
              </div>
              {fieldErr('name')}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                     style={{ color: 'var(--color-text-muted)' }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: errors.email ? 'var(--color-danger)' : 'var(--color-text-faint)' }} />
                <input name="email" type="email" autoComplete="email"
                       value={form.email} onChange={handleChange} placeholder="operator@company.com"
                       className="input pl-9" style={inputStyle('email')} />
              </div>
              {fieldErr('email')}
            </div>

            {/* Password + strength */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                     style={{ color: 'var(--color-text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: errors.password ? 'var(--color-danger)' : 'var(--color-text-faint)' }} />
                <input name="password" type="password" autoComplete="new-password"
                       value={form.password} onChange={handleChange} placeholder="••••••••"
                       className="input pl-9" style={inputStyle('password')} />
              </div>
              {/* Strength meter */}
              {form.password.length > 0 && strength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                         style={{ width: `${strength.pct}%`, background: strength.color }} />
                  </div>
                  <p className="text-[10px]" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
              {fieldErr('password')}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
                    className="btn-glow w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold mt-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none"
                    style={{ background: 'var(--color-accent)', color: '#fff' }}>
              {isLoading
                ? <><Loader2 size={14} className="animate-spin" />Creating workspace…</>
                : <><UserPlus size={14} />Create workspace</>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline"
                  style={{ color: 'var(--color-accent)' }}>
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] mt-5" style={{ color: 'var(--color-text-faint)' }}>
          Secured with AES-256 · JWT-authenticated sessions
        </p>
      </div>
    </div>
  );
}
