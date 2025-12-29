import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { User, UserPublic } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<UserPublic> {
  const passwordHash = await hashPassword(password);
  
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [email, passwordHash, name || null]
  );
  
  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<UserPublic | null> {
  const result = await query<UserPublic>(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: UserPublic; token: string } | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }
  
  const isValid = await comparePasswords(password, user.password_hash);
  
  if (!isValid) {
    return null;
  }
  
  const token = generateToken({ userId: user.id, email: user.email });
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
    token,
  };
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const result = await query<User>(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  
  if (!result.rows[0]) {
    return false;
  }
  
  const isValid = await comparePasswords(currentPassword, result.rows[0].password_hash);
  
  if (!isValid) {
    return false;
  }
  
  const newHash = await hashPassword(newPassword);
  
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId]
  );
  
  return true;
}
