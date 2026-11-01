import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// 32 random bytes → 43 base64url characters (256 bits of entropy).
export const TOKEN_BYTES = 32;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const GUEST_ID_PATTERN = /^[a-f0-9]{64}$/;
export const MIN_ADMIN_SECRET_LENGTH = 12;
export const MAX_BODY_BYTES = 2048;
export const MAX_GUEST_NAME_LENGTH = 80;

export const generateToken = () => randomBytes(TOKEN_BYTES).toString('base64url');

export const hashToken = (token) => createHash('sha256').update(token, 'utf8').digest('hex');

export const isWellFormedToken = (token) => typeof token === 'string' && TOKEN_PATTERN.test(token);

// Hash both sides first so timingSafeEqual always compares equal-length buffers.
export function safeEqual(provided, expected) {
  const a = createHash('sha256').update(String(provided), 'utf8').digest();
  const b = createHash('sha256').update(String(expected), 'utf8').digest();
  return timingSafeEqual(a, b);
}

// Fails closed: an unset or too-short secret disables admin access entirely.
export function checkAdmin(request, secret) {
  if (typeof secret !== 'string' || secret.length < MIN_ADMIN_SECRET_LENGTH) return 'unconfigured';
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return 'denied';
  return safeEqual(match[1], secret) ? 'ok' : 'denied';
}

export function normalizeGuestName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/gu, ' ').trim();
  if (!name || name.length > MAX_GUEST_NAME_LENGTH) return null;
  return name;
}

const baseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...baseHeaders, ...headers } });

export async function readJsonBody(request) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
