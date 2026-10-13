import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, LogIn, Mail, Lock, AlertTriangle, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  // ── Inline validation ─────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.email)                        e.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.password)                     e.password = 'Password is required.';
    else if (form.password.length < 6)      e.password = 'Password must be at least 6 characters.';
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
      const { data } = await api.post('/auth/login', form);
      login(data.data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
            Sign in to Agent Command Centre
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Autonomous Multi-Agent Orchestration Platform
          </p>

          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={() => {
              loginAsGuest();
              navigate('/dashboard', { replace: true });
            }}
            className="w-full mb-5 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#c7d2fe',
            }}
          >
            ⚡ 1-Click Launch Demo Workspace (Guest Operator)
          </button>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 mb-5 text-xs animate-fade-in"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--color-danger)' }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

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
                       value={form.email} onChange={handleChange} placeholder="operator@agentsphere.ai"
                       className="input pl-9"
                       style={errors.email ? { borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.08)' } : {}} />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-danger)' }}>{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                     style={{ color: 'var(--color-text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: errors.password ? 'var(--color-danger)' : 'var(--color-text-faint)' }} />
                <input name="password" type="password" autoComplete="current-password"
                       value={form.password} onChange={handleChange} placeholder="••••••••"
                       className="input pl-9"
                       style={errors.password ? { borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.08)' } : {}} />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-danger)' }}>{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
                    className="btn-glow w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold mt-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none"
                    style={{ background: 'var(--color-accent)', color: '#fff' }}>
              {isLoading
                ? <><Loader2 size={14} className="animate-spin" />Authenticating…</>
                : <><LogIn size={14} />Sign in</>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold hover:underline"
                  style={{ color: 'var(--color-accent)' }}>
              Create workspace
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] mt-5" style={{ color: 'var(--color-text-faint)' }}>
          Powered by Google Gemini 3.8 Flash · Supabase PostgreSQL
        </p>
      </div>
    </div>
  );
}
