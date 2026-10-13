import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Activity, LogOut, Cpu, Bot, CheckCircle2, Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ activeView, setActiveView, onQuickDemo }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : 'AS';

  return (
    <header
      className="sticky top-0 z-50 glass"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <nav className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView && setActiveView('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            >
              <Cpu size={16} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight block leading-tight text-white">
                AgentSphere <span style={{ color: 'var(--color-accent)' }}>AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                Autonomous Intelligent Systems
              </span>
            </div>
          </button>
        </div>

        {/* Quick Competition Presets (Direct in Header) */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => onQuickDemo && onQuickDemo('ev_standard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8',
            }}
          >
            <Zap size={13} className="text-amber-400" />
            <span>EV Research Demo</span>
          </button>

          <button
            onClick={() => onQuickDemo && onQuickDemo('ev_fallback')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
            }}
          >
            <Shield size={13} />
            <span>Source Recovery Demo</span>
          </button>
        </div>

        {/* Right Cluster */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Model Indicator */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: 'var(--color-success)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: 'var(--color-success)' }}
            />
            <span>Gemini 3.8 Flash · Active</span>
          </div>

          {/* User profile */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'var(--color-accent-glow)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight text-white">
                {user?.name || 'Operator'}
              </p>
              <p className="text-[10px] leading-tight text-slate-400">
                {user?.role || 'Autonomous Lead'}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-danger)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
