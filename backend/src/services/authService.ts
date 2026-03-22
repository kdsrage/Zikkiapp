import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { JWTPayload, User } from '../types';
import { createError } from '../middleware/errorHandler';

export async function register(email: string, password: string): Promise<{ token: string; userId: string }> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw createError('E-Mail bereits registriert', 409);
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email.toLowerCase(), password_hash]
  );

  const userId = result.rows[0].id;

  // Create empty profile
  await pool.query(
    'INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );

  const token = generateToken(userId, email.toLowerCase());
  return { token, userId };
}

export async function login(email: string, password: string): Promise<{ token: string; userId: string }> {
  const result = await pool.query<User>(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw createError('Ungültige E-Mail oder Passwort', 401);
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw createError('Ungültige E-Mail oder Passwort', 401);
  }

  await pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);

  const token = generateToken(user.id, user.email);
  return { token, userId: user.id };
}

export function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const payload: JWTPayload = { userId, email };
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}
