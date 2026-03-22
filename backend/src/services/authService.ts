import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { JWTPayload, User } from '../types';
import { createError } from '../middleware/errorHandler';

export async function register(username: string, password: string): Promise<{ token: string; userId: string }> {
  const usernameLower = username.toLowerCase().trim();

  const existing = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [usernameLower]
  );
  if (existing.rows.length > 0) {
    throw createError('Benutzername bereits vergeben', 409);
  }

  const password_hash = await bcrypt.hash(password, 12);
  // Store email as username@zikki.app internally
  const email = `${usernameLower}@zikki.app`;
  const result = await pool.query(
    'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [email, usernameLower, password_hash]
  );

  const userId = result.rows[0].id;

  await pool.query(
    'INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, username]
  );

  const token = generateToken(userId, email);
  return { token, userId };
}

export async function login(username: string, password: string): Promise<{ token: string; userId: string }> {
  const usernameLower = username.toLowerCase().trim();

  // Support login by username or by email (legacy)
  const result = await pool.query<User>(
    'SELECT id, email, password_hash FROM users WHERE username = $1 OR email = $1',
    [usernameLower]
  );

  if (result.rows.length === 0) {
    throw createError('Ungültiger Benutzername oder Passwort', 401);
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw createError('Ungültiger Benutzername oder Passwort', 401);
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
