import type { Context, MiddlewareHandler } from 'hono';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

/**
 * Limitador em memória para reduzir abusos por instância. Em produção ele deve
 * complementar (e não substituir) o rate limit/WAF da borda da Vercel.
 */
export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = buckets.get(options.key);
  if (!current || current.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  if (current.count >= options.limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true };
}

export function clientAddress(c: Context) {
  const forwarded = c.req.header('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || c.req.header('x-vercel-forwarded-for')
    || 'unknown';
}

export function enforceRateLimit(options: Omit<RateLimitOptions, 'key'> & { scope: string }): MiddlewareHandler {
  return async (c, next) => {
    const result = consumeRateLimit({
      key: `${options.scope}:${clientAddress(c)}`,
      limit: options.limit,
      windowMs: options.windowMs,
    });
    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfterSeconds));
      return c.json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente em alguns instantes.' }, 429);
    }
    await next();
  };
}

export function enforceContentLength(maxBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const value = c.req.header('content-length');
    const length = value ? Number(value) : undefined;
    if (length !== undefined && Number.isFinite(length) && length > maxBytes) {
      return c.json({ error: 'Payload Too Large', message: 'O arquivo enviado excede o tamanho máximo permitido.' }, 413);
    }
    await next();
  };
}

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
