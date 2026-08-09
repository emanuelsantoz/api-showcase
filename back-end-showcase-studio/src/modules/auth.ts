import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AuthUser = { id: string; role: 'STUDENT' | 'ADMIN' | 'COORDENADOR' };

export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!env.JWT_SECRET) return c.json({ error: 'Service Unavailable', message: 'JWT_SECRET is not configured.' }, 503);
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized', message: 'Bearer token is required.' }, 401);
  try {
    const user = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
    if (!user.id || !user.role) throw new Error('Invalid token payload');
    c.set('user', user);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token.' }, 401);
  }
};

export const requireModerator: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as AuthUser | undefined;
  if (!user || !['ADMIN', 'COORDENADOR'].includes(user.role)) return c.json({ error: 'Forbidden', message: 'Moderator role is required.' }, 403);
  await next();
};

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as AuthUser | undefined;
  if (!user || user.role !== 'ADMIN') return c.json({ error: 'Forbidden', message: 'Administrator role is required.' }, 403);
  await next();
};
