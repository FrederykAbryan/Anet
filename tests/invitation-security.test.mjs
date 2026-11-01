import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminHandler, createInvitationHandler, createPhotoHandler } from '../netlify/lib/handlers.mjs';
import { checkAdmin, generateToken, hashToken, isWellFormedToken, normalizeGuestName } from '../netlify/lib/security.mjs';
import { parseEventConfig } from '../netlify/lib/event.mjs';

const SECRET = 'test-secret-not-for-production';
// Obviously fake fixture values; never real event details.
const fakeConfig = {
  name: 'Test Host',
  date: 'PRIVATE-DATE January 1, 2000',
  time: 'PRIVATE-TIME 12:00',
  dressCode: 'PRIVATE-DRESS fake dress code',
  venue: { name: 'PRIVATE-VENUE Example Hall', address: 'PRIVATE-ADDR 1 Example Street, Testville' },
};
const event = parseEventConfig(JSON.stringify(fakeConfig));

function memoryStore() {
  const data = new Map();
  return {
    data,
    async get(key) { return data.has(key) ? structuredClone(data.get(key)) : null; },
    async setJSON(key, value) { data.set(key, structuredClone(value)); },
    async list({ prefix }) { return { blobs: [...data.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}

function setup(...args) {
  const secret = args.length ? args[0] : SECRET;
  const store = memoryStore();
  const getStore = () => store;
  return {
    store,
    admin: createAdminHandler({ getStore, getSecret: () => secret }),
    invitation: createInvitationHandler({ getStore, loadEvent: () => event }),
    photo: createPhotoHandler({ getStore, loadPhoto: async () => Buffer.from('PHOTO') }),
  };
}

const adminRequest = (method, body, key = SECRET) => new Request('https://example.test/.netlify/functions/admin-guests', {
  method,
  headers: { ...(key === null ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
});
const tokenRequest = (token, method = 'POST') => new Request('https://example.test/.netlify/functions/invitation', {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: method === 'POST' ? JSON.stringify({ token }) : undefined,
});

async function createGuest(ctx, name = 'Budi') {
  const response = await ctx.admin(adminRequest('POST', { name }));
  assert.equal(response.status, 201);
  const body = await response.json();
  return { ...body, token: body.path.split('/').pop() };
}

test('tokens are 256-bit base64url and unique', () => {
  const tokens = new Set(Array.from({ length: 1000 }, generateToken));
  assert.equal(tokens.size, 1000);
  for (const token of tokens) assert.ok(isWellFormedToken(token));
  assert.equal(Buffer.from([...tokens][0], 'base64url').length, 32);
});

test('admin auth fails closed when the secret is unset or weak', async () => {
  for (const secret of [undefined, '', 'short']) {
    const ctx = setup(secret);
    const response = await ctx.admin(adminRequest('POST', { name: 'X' }, secret ?? ''));
    assert.equal(response.status, 503);
    assert.equal(ctx.store.data.size, 0);
  }
});

test('admin rejects missing and wrong keys', async () => {
  const ctx = setup();
  assert.equal((await ctx.admin(adminRequest('POST', { name: 'X' }, null))).status, 401);
  assert.equal((await ctx.admin(adminRequest('POST', { name: 'X' }, `${SECRET}x`))).status, 401);
  assert.equal((await ctx.admin(adminRequest('GET', null, 'wrong'))).status, 401);
  assert.equal(ctx.store.data.size, 0);
  assert.equal(checkAdmin(new Request('https://x', { headers: { Authorization: `Basic ${SECRET}` } }), SECRET), 'denied');
});

test('created guest stores only the token hash, never the token', async () => {
  const ctx = setup();
  const { token, id } = await createGuest(ctx);
  assert.equal(id, hashToken(token));
  const stored = JSON.stringify([...ctx.store.data.entries()]);
  assert.ok(!stored.includes(token));
  assert.ok(stored.includes(hashToken(token)));
});

test('valid token returns private details; unknown, malformed, and missing tokens are denied', async () => {
  const ctx = setup();
  const { token } = await createGuest(ctx, 'Budi');

  const ok = await ctx.invitation(tokenRequest(token));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await ok.json(), { guest: 'Budi', event });

  for (const bad of [generateToken(), 'short', '', null, undefined, `${token}x`, token.slice(1)]) {
    const response = await ctx.invitation(tokenRequest(bad));
    assert.equal(response.status, 404, `token ${bad} should be denied`);
    assert.ok(!(await response.text()).includes('PRIVATE'));
  }
  assert.equal((await ctx.invitation(tokenRequest(token, 'GET'))).status, 405);
});

test('revoked token is denied for details and photo', async () => {
  const ctx = setup();
  const { token, id } = await createGuest(ctx);
  assert.equal((await ctx.photo(tokenRequest(token))).status, 200);
  assert.equal((await ctx.admin(adminRequest('DELETE', { id }))).status, 200);
  assert.equal((await ctx.invitation(tokenRequest(token))).status, 404);
  assert.equal((await ctx.photo(tokenRequest(token))).status, 404);
  const { guests } = await (await ctx.admin(adminRequest('GET'))).json();
  assert.deepEqual(guests.map(({ revoked }) => revoked), [true]);
});

test('store failures fail closed', async () => {
  const broken = () => ({ get: async () => { throw new Error('down'); } });
  const invitation = createInvitationHandler({ getStore: broken, loadEvent: () => event });
  const response = await invitation(tokenRequest(generateToken()));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('PRIVATE'));
});

test('event config is loaded only after a valid token', async () => {
  const store = memoryStore();
  let loads = 0;
  const invitation = createInvitationHandler({ getStore: () => store, loadEvent: () => { loads += 1; return event; } });
  for (const bad of [generateToken(), 'short', null]) await invitation(tokenRequest(bad));
  assert.equal(loads, 0);
});

test('missing or malformed event config fails closed with no private fields', async () => {
  const ctx = setup();
  const { token } = await createGuest(ctx);
  const broken = [
    undefined,
    '',
    'not json',
    '[]',
    JSON.stringify({ ...fakeConfig, venue: undefined }),
    JSON.stringify({ ...fakeConfig, date: '' }),
    JSON.stringify({ ...fakeConfig, time: 42 }),
    JSON.stringify({ ...fakeConfig, venue: { ...fakeConfig.venue, mapsUrl: 'javascript:alert(1)' } }),
    JSON.stringify({ ...fakeConfig, venue: { ...fakeConfig.venue, mapsUrl: 'http://example.test/' } }),
    JSON.stringify({ ...fakeConfig, email: 'not-an-email' }),
    JSON.stringify({ ...fakeConfig, dressCode: 'x'.repeat(501) }),
  ];
  for (const raw of broken) {
    const invitation = createInvitationHandler({ getStore: () => ctx.store, loadEvent: () => parseEventConfig(raw) });
    const response = await invitation(tokenRequest(token));
    assert.equal(response.status, 503, `config ${raw} should fail closed`);
    const body = await response.text();
    assert.ok(!body.includes('PRIVATE') && !body.includes('Budi'));
  }
});

test('map URLs are derived and encoded from the configured venue', () => {
  const parsed = parseEventConfig(JSON.stringify({ ...fakeConfig, venue: { name: 'A&B "Hall"', address: '1 <Street>' } }));
  const query = encodeURIComponent('A&B "Hall", 1 <Street>');
  assert.equal(parsed.place, 'A&B "Hall"');
  assert.equal(parsed.venue.directionsUrl, `https://www.google.com/maps/dir/?api=1&destination=${query}`);
  assert.equal(parsed.venue.embedUrl, `https://www.google.com/maps?q=${query}&output=embed`);
  assert.equal(parsed.venue.mapsUrl, `https://www.google.com/maps/search/?api=1&query=${query}`);
  for (const url of [parsed.venue.directionsUrl, parsed.venue.embedUrl, parsed.venue.mapsUrl]) assert.ok(!/[<>" ]/.test(url));
  const custom = parseEventConfig(JSON.stringify({ ...fakeConfig, venue: { ...fakeConfig.venue, mapsUrl: 'https://maps.example.test/x' } }));
  assert.equal(custom.venue.mapsUrl, 'https://maps.example.test/x');
});

test('guest names are normalized and bounded', () => {
  assert.equal(normalizeGuestName('  Budi \u0000 Santoso\n'), 'Budi Santoso');
  assert.equal(normalizeGuestName('   '), null);
  assert.equal(normalizeGuestName('x'.repeat(81)), null);
  assert.equal(normalizeGuestName(42), null);
});
