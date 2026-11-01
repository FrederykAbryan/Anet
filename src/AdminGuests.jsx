import { useState } from 'react';
import '../admin.css';

const ENDPOINT = '/.netlify/functions/admin-guests';

const errorMessages = {
  401: 'That admin key was not accepted.',
  503: 'Admin access is not configured on the server, or the guest store is unavailable.',
};

// Organizer page at /admin/guests. The admin key lives only in React state (memory):
// it is never written to storage and is sent to the server function on each request.
export default function AdminGuests() {
  const [adminKey, setAdminKey] = useState('');
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const [guests, setGuests] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function call(method, body) {
    const response = await fetch(ENDPOINT, {
      method,
      headers: { Authorization: `Bearer ${adminKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessages[response.status] || (data.error === 'invalid_name' ? 'Enter a guest name (up to 80 characters).' : 'Request failed.'));
    return data;
  }

  async function run(task) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const loadGuests = () => run(async () => setGuests((await call('GET')).guests));

  const createGuest = (event) => {
    event.preventDefault();
    run(async () => {
      const data = await call('POST', { name });
      // Built from the current origin so links work on any deployment domain.
      setCreated({ name: data.name, url: new URL(data.path, window.location.origin).href });
      setCopied(false);
      setName('');
      setGuests((await call('GET')).guests);
    });
  };

  const replaceGuestLink = (guest) => {
    if (!window.confirm(`Create a new link for ${guest.name}? The current link will stop working.`)) return;
    run(async () => {
      const data = await call('POST', { action: 'reissue', id: guest.id });
      setCreated({ name: data.name, url: new URL(data.path, window.location.origin).href });
      setCopied(false);
      setGuests((await call('GET')).guests);
    });
  };

  const revokeGuest = (guest) => {
    if (!window.confirm(`Revoke ${guest.name}'s invitation link? It will stop working immediately.`)) return;
    run(async () => {
      await call('DELETE', { id: guest.id });
      setGuests((await call('GET')).guests);
    });
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <main className="admin-page">
    <h1>Guest invitations</h1>
    <p className="admin-note">Invitation links are shown once. If you lose one, choose Replace link in the guest list to create a copyable replacement; the old link will stop working.</p>

    <form className="admin-card" onSubmit={createGuest}>
      <label>
        Admin key
        <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} autoComplete="off" required />
      </label>
      <label>
        Guest name
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      </label>
      <div className="admin-actions">
        <button type="submit" disabled={busy || !adminKey}>Create invitation link</button>
        <button type="button" disabled={busy || !adminKey} onClick={loadGuests}>Show guests</button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
    </form>

    {created && <section className="admin-card" aria-live="polite">
      <h2>Link for {created.name}</h2>
      <input className="admin-link" type="text" value={created.url} readOnly onFocus={(event) => event.target.select()} />
      <div className="admin-actions">
        <button type="button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>
    </section>}

    {guests && <section className="admin-card">
      <h2>Guests ({guests.length})</h2>
      {guests.length === 0 ? <p>No guests yet.</p> : <ul className="admin-guests">
        {guests.map((guest) => <li key={guest.id}>
          <span>{guest.name}{guest.revoked && <em> — revoked</em>}</span>
          {!guest.revoked && <div className="admin-actions">
            <button type="button" disabled={busy} onClick={() => replaceGuestLink(guest)}>Replace link</button>
            <button type="button" disabled={busy} onClick={() => revokeGuest(guest)}>Revoke</button>
          </div>}
        </li>)}
      </ul>}
    </section>}
  </main>;
}
