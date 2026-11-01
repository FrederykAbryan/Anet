import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import {
  GUEST_ID_PATTERN,
  checkAdmin,
  generateToken,
  hashToken,
  isWellFormedToken,
  json,
  normalizeGuestName,
  readJsonBody,
} from './security.mjs';

const GUEST_PREFIX = 'guest/';
const NOT_FOUND = { error: 'invitation_not_found' };
const LINK_TOKEN_SALT = Buffer.from('Anet invitation link v1');
const LINK_TOKEN_INFO = Buffer.from('guest-token-recovery');

function deriveLinkEncryptionKey(secret) {
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), LINK_TOKEN_SALT, LINK_TOKEN_INFO, 32));
}

function encryptLinkToken(token, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveLinkEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };
}

function decryptLinkToken(envelope, secret) {
  if (envelope?.version !== 1 || typeof envelope.iv !== 'string'
      || typeof envelope.ciphertext !== 'string' || typeof envelope.tag !== 'string') return null;
  try {
    const iv = Buffer.from(envelope.iv, 'base64url');
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64url');
    const tag = Buffer.from(envelope.tag, 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length > 128) return null;
    const decipher = createDecipheriv('aes-256-gcm', deriveLinkEncryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const token = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return isWellFormedToken(token) ? token : null;
  } catch {
    return null;
  }
}

// Returns the stored guest record only for a well-formed, known, non-revoked token.
export async function findActiveGuest(store, token) {
  if (!isWellFormedToken(token)) return null;
  const record = await store.get(`${GUEST_PREFIX}${hashToken(token)}`, { type: 'json' });
  if (!record || record.revokedAt || typeof record.name !== 'string') return null;
  return record;
}

async function readToken(request) {
  if (request.method !== 'POST') return { error: json(405, { error: 'method_not_allowed' }, { Allow: 'POST' }) };
  const body = await readJsonBody(request);
  return { token: body?.token };
}

export function createInvitationHandler({ getStore, loadEvent }) {
  return async (request) => {
    const { token, error } = await readToken(request);
    if (error) return error;
    try {
      const guest = await findActiveGuest(getStore(), token);
      if (!guest) return json(404, NOT_FOUND);
      // Event config is read only after the token is authorized; missing/invalid config fails closed.
      const event = loadEvent();
      if (!event) return json(503, { error: 'unavailable' });
      return json(200, { guest: guest.name, event });
    } catch {
      return json(503, { error: 'unavailable' });
    }
  };
}

export function createPhotoHandler({ getStore, loadPhoto }) {
  return async (request) => {
    const { token, error } = await readToken(request);
    if (error) return error;
    try {
      const guest = await findActiveGuest(getStore(), token);
      if (!guest) return json(404, NOT_FOUND);
      const photo = await loadPhoto();
      return new Response(photo, {
        status: 200,
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch {
      return json(503, { error: 'unavailable' });
    }
  };
}

export function createAdminHandler({ getStore, getSecret, now = () => new Date() }) {
  return async (request) => {
    const secret = getSecret();
    const auth = checkAdmin(request, secret);
    if (auth === 'unconfigured') return json(503, { error: 'admin_not_configured' });
    if (auth !== 'ok') return json(401, { error: 'unauthorized' }, { 'WWW-Authenticate': 'Bearer' });

    try {
      const store = getStore();

      if (request.method === 'GET') {
        const { blobs } = await store.list({ prefix: GUEST_PREFIX });
        const records = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
        const guests = records.filter(Boolean)
          .map(({ id, name, createdAt, revokedAt }) => ({ id, name, createdAt, revoked: Boolean(revokedAt) }))
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return json(200, { guests });
      }

      if (request.method === 'POST') {
        const body = await readJsonBody(request);
        if (body?.action === 'get_link') {
          const id = body.id;
          if (typeof id !== 'string' || !GUEST_ID_PATTERN.test(id)) return json(400, { error: 'invalid_id' });
          const record = await store.get(`${GUEST_PREFIX}${id}`, { type: 'json' });
          if (!record || record.revokedAt) return json(404, { error: 'not_found' });
          const token = decryptLinkToken(record.encryptedToken, secret);
          if (!token || hashToken(token) !== id) return json(409, { error: 'link_unavailable' });
          return json(200, { id, name: record.name, path: `/invitation/${token}` });
        }

        if (body?.action === 'reissue') {
          const id = body.id;
          if (typeof id !== 'string' || !GUEST_ID_PATTERN.test(id)) return json(400, { error: 'invalid_id' });
          const record = await store.get(`${GUEST_PREFIX}${id}`, { type: 'json' });
          if (!record || record.revokedAt) return json(404, { error: 'not_found' });

          const token = generateToken();
          const newId = hashToken(token);
          const timestamp = now().toISOString();
          await store.setJSON(`${GUEST_PREFIX}${newId}`, { id: newId, name: record.name, createdAt: timestamp, revokedAt: null, encryptedToken: encryptLinkToken(token, secret) });
          try {
            await store.setJSON(`${GUEST_PREFIX}${id}`, { ...record, revokedAt: timestamp, replacedBy: newId });
          } catch (error) {
            try { await store.delete(`${GUEST_PREFIX}${newId}`); } catch { /* best-effort rollback */ }
            throw error;
          }
          // The old token is revoked; the replacement token is encrypted at rest and returned to the admin once.
          return json(200, { id: newId, name: record.name, path: `/invitation/${token}` });
        }

        const name = normalizeGuestName(body?.name);
        if (!name) return json(400, { error: 'invalid_name' });
        const token = generateToken();
        const id = hashToken(token);
        // Store only a one-way hash for validation plus an authenticated encrypted copy for admin-only retrieval.
        await store.setJSON(`${GUEST_PREFIX}${id}`, { id, name, createdAt: now().toISOString(), revokedAt: null, encryptedToken: encryptLinkToken(token, secret) });
        return json(201, { id, name, path: `/invitation/${token}` });
      }

      if (request.method === 'DELETE') {
        const body = await readJsonBody(request);
        const id = body?.id;
        if (typeof id !== 'string' || !GUEST_ID_PATTERN.test(id)) return json(400, { error: 'invalid_id' });
        const record = await store.get(`${GUEST_PREFIX}${id}`, { type: 'json' });
        if (!record) return json(404, { error: 'not_found' });
        if (body.permanent === true) {
          await store.delete(`${GUEST_PREFIX}${id}`);
          return json(200, { id, deleted: true });
        }
        if (!record.revokedAt) await store.setJSON(`${GUEST_PREFIX}${id}`, { ...record, revokedAt: now().toISOString() });
        return json(200, { id, revoked: true });
      }

      return json(405, { error: 'method_not_allowed' }, { Allow: 'GET, POST, DELETE' });
    } catch {
      return json(503, { error: 'unavailable' });
    }
  };
}
