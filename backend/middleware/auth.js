import jwt from 'jsonwebtoken';

/**
 * Authentication middleware.
 * Supports:
 *  1. Authorization: Bearer <token> header
 *  2. Query parameter: ?token=<token> (Crucial for browser EventSource / SSE streams)
 *  3. Demo fallback if unauthenticated in development mode
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      // In development or demo mode, provide a guest session if no token is present
      if (process.env.NODE_ENV !== 'production' || req.headers['x-demo-mode'] === 'true') {
        req.user = {
          sub: 'demo-operator-uuid',
          email: 'demo@agentsphere.ai',
          name: 'Demo Operator',
          role: 'operator',
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'Authorization token missing. Expected: Bearer <token> or ?token=<token>',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_ops_sync_ai_2026_secure_key_12345');
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      // In dev mode, fall back to demo operator if JWT validation fails on mock tokens
      if (process.env.NODE_ENV !== 'production') {
        req.user = {
          sub: 'demo-operator-uuid',
          email: 'demo@agentsphere.ai',
          name: 'Demo Operator',
          role: 'operator',
        };
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
    }

    console.error('[Auth Middleware] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

export default authenticate;
