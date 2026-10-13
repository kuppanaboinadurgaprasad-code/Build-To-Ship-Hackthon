import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ProtectedRoute
 *
 * Wraps private pages. While the auth session is being restored from
 * localStorage (`isLoading`), renders a full-screen spinner so the page
 * doesn't flash to /login on hard refresh.
 *
 * Once resolved:
 *   - Authenticated → renders children.
 *   - Unauthenticated → redirects to /login, preserving the intended URL
 *     in `location.state.from` so post-login navigation works.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--color-bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          {/* Spinning accent ring */}
          <span
            className="block w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow"
            style={{ borderTopColor: 'var(--color-accent)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Restoring session…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
