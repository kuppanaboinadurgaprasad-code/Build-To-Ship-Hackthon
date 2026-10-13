import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

const TOKEN_KEY = 'opssync_token';
const USER_KEY  = 'opssync_user';

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * AuthProvider wraps the entire app and exposes:
 *   - user          : decoded user object | null
 *   - token         : raw JWT string | null
 *   - isLoading     : true while restoring session from localStorage
 *   - login(data)   : persists token + user, updates Axios header
 *   - logout()      : clears state, storage, and Axios header
 *   - isAuthenticated: boolean shorthand
 */
export function AuthProvider({ children }) {
  const [token, setToken]       = useState(null);
  const [user, setUser]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Sync Axios default header so any pre-mount request is authenticated
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to restore session:', err);
      // Corrupted storage — clear everything
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  /**
   * Call this after a successful /auth/register or /auth/login response.
   *
   * @param {{ token: string, user: Object }} payload - Response `data` field.
   */
  const login = useCallback(({ token: newToken, user: newUser }) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // ── loginAsGuest (Demo Mode) ──────────────────────────────────────────────
  const loginAsGuest = useCallback(() => {
    const guestUser = {
      id: 'demo-operator-uuid',
      name: 'Autonomous AI Operator',
      email: 'operator@agentsphere.ai',
      role: 'System Architect',
    };
    const guestToken = 'demo_guest_token_agentsphere_ai';
    login({ token: guestToken, user: guestUser });
  }, [login]);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
    loginAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Convenience hook — throws if used outside <AuthProvider>.
 *
 * @returns {{ user, token, isLoading, isAuthenticated, login, logout }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}
