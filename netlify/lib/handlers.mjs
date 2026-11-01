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
    const auth = checkAdmin(request, getSecret());
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
        const name = normalizeGuestName(body?.name);
        if (!name) return json(400, { error: 'invalid_name' });
        const token = generateToken();
        const id = hashToken(token);
        // Only the hash is persisted; the bearer token is returned once and never stored.
        await store.setJSON(`${GUEST_PREFIX}${id}`, { id, name, createdAt: now().toISOString(), revokedAt: null });
        return json(201, { id, name, path: `/invitation/${token}` });
      }

      if (request.method === 'DELETE') {
        const body = await readJsonBody(request);
        const id = body?.id;
        if (typeof id !== 'string' || !GUEST_ID_PATTERN.test(id)) return json(400, { error: 'invalid_id' });
        const record = await store.get(`${GUEST_PREFIX}${id}`, { type: 'json' });
        if (!record) return json(404, { error: 'not_found' });
        if (!record.revokedAt) await store.setJSON(`${GUEST_PREFIX}${id}`, { ...record, revokedAt: now().toISOString() });
        return json(200, { id, revoked: true });
      }

      return json(405, { error: 'method_not_allowed' }, { Allow: 'GET, POST, DELETE' });
    } catch {
      return json(503, { error: 'unavailable' });
    }
  };
}
