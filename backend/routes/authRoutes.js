import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import validate from '../middleware/validate.js';

const router = express.Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must not exceed 80 characters.')
    .trim(),

  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required.' })
    .min(6, 'Password must be at least 6 characters.')
    .max(128, 'Password must not exceed 128 characters.'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Issues a signed JWT for the given user record.
 * @param {{ id: string, email: string, name: string }} user
 * @returns {string}
 */
const issueToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ─── POST /register ───────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check for existing user
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('[Register] Supabase lookup error:', lookupError);
      return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 2. Hash password
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ name, email, password: passwordHash })
      .select('id, name, email, created_at')
      .single();

    if (insertError) {
      console.error('[Register] Supabase insert error:', insertError);
      return res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
    }

    // 4. Issue JWT
    const token = issueToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          createdAt: newUser.created_at,
        },
      },
    });
  } catch (err) {
    console.error('[Register] Unexpected error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch user by email
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('id, name, email, password, created_at')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('[Login] Supabase lookup error:', lookupError);
      return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
    }

    // 2. Generic "invalid credentials" to prevent user enumeration
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password || user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // 4. Issue JWT
    const token = issueToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error('[Login] Unexpected error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
