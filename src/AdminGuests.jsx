import { useState } from 'react';
import '../admin.css';

const ENDPOINT = '/.netlify/functions/admin-guests';

const errorMessages = {
  401: 'That admin key was not accepted.',
  409: "This link can't be recovered because it predates copyable links. Replace it once to create a copyable link.",
  503: 'Admin access is not configured on the server, or the guest store is unavailable.',
};

function IconAction({ label, onClick, disabled, children }) {
  return <button className="admin-icon-button" type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
}

function ReplaceIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 0 0-14.8-4L3 10"/><path d="M4 17v-5h5"/><path d="M4 12a8 8 0 0 0 14.8 4L21 14"/></svg>;
}

function RevokeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>;
}

function DeleteIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>;
}

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
  const [copiedGuestId, setCopiedGuestId] = useState(null);

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
      setCreated({ id: data.id, name: data.name, url: new URL(data.path, window.location.origin).href });
      setCopied(false);
      setCopiedGuestId(null);
      setName('');
      setGuests((await call('GET')).guests);
    });
  };

  const copyGuestLink = (guest) => run(async () => {
    const data = await call('POST', { action: 'get_link', id: guest.id });
    const url = new URL(data.path, window.location.origin).href;
    setCreated({ id: data.id, name: data.name, url });
    setCopied(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedGuestId(guest.id);
    } catch {
      setCopiedGuestId(null);
      setError('Clipboard access was blocked. Select the URL above to copy it.');
    }
  });

  const replaceGuestLink = (guest) => {
    if (!window.confirm(`Create a new link for ${guest.name}? The current link will stop working.`)) return;
    run(async () => {
      const data = await call('POST', { action: 'reissue', id: guest.id });
      setCreated({ id: data.id, name: data.name, url: new URL(data.path, window.location.origin).href });
      setCopied(false);
      setCopiedGuestId(null);
      setGuests((await call('GET')).guests);
    });
  };

  const revokeGuest = (guest) => {
    if (!window.confirm(`Revoke ${guest.name}'s invitation link? It will stop working immediately.`)) return;
    run(async () => {
      await call('DELETE', { id: guest.id });
      if (created?.id === guest.id) {
        setCreated(null);
        setCopied(false);
      }
      if (copiedGuestId === guest.id) setCopiedGuestId(null);
      setGuests((await call('GET')).guests);
    });
  };

  const deleteGuest = (guest) => {
    if (!window.confirm(`Permanently delete ${guest.name} and invalidate its invitation? This cannot be undone.`)) return;
    run(async () => {
      await call('DELETE', { id: guest.id, permanent: true });
      if (created?.id === guest.id) {
        setCreated(null);
        setCopied(false);
      }
      if (copiedGuestId === guest.id) setCopiedGuestId(null);
      setGuests((await call('GET')).guests);
    });
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setCopiedGuestId(created.id ?? null);
    } catch {
      setCopied(false);
      setCopiedGuestId(null);
      setError('Clipboard access was blocked. Select the URL above to copy it.');
    }
  }

  return <main className="admin-page">
    <h1>Guest invitations</h1>
    <p className="admin-note">Use Copy to copy a guest’s current invitation link. Replace creates a new link and disables the old one.</p>

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
        <IconAction label={copied ? 'Link copied' : 'Copy link'} onClick={copyLink}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </IconAction>
      </div>
    </section>}

    {guests && <section className="admin-card">
      <h2>Guests ({guests.length})</h2>
      {guests.length === 0 ? <p>No guests yet.</p> : <ul className="admin-guests">
        {guests.map((guest) => <li key={guest.id}>
          <span>{guest.name}{guest.revoked && <em> — revoked</em>}</span>
          <div className="admin-actions guest-row-actions">
            {!guest.revoked && <>
              <IconAction
                label={copiedGuestId === guest.id ? `Link for ${guest.name} copied` : `Copy ${guest.name}'s link`}
                onClick={() => copyGuestLink(guest)}
                disabled={busy}
              >{copiedGuestId === guest.id ? <CheckIcon /> : <CopyIcon />}</IconAction>
              <IconAction label={`Replace ${guest.name}'s link`} onClick={() => replaceGuestLink(guest)} disabled={busy}><ReplaceIcon /></IconAction>
              <IconAction label={`Revoke ${guest.name}'s invitation`} onClick={() => revokeGuest(guest)} disabled={busy}><RevokeIcon /></IconAction>
            </>}
            <IconAction label={`Delete ${guest.name}`} onClick={() => deleteGuest(guest)} disabled={busy}><DeleteIcon /></IconAction>
          </div>
        </li>)}
      </ul>}
    </section>}
  </main>;
}
