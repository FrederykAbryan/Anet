# Invited-guest access

The welcome screen (`/`) is public. The invitation interior (date, time, venue,
dress code, venue photo) is only returned by Netlify Functions after a guest's
bearer token has been validated server-side against Netlify Blobs.

## Setup

1. `npm install` (adds `@netlify/blobs` and updates `package-lock.json`).
2. In Netlify → Site configuration → Environment variables, set
   **`ANET_ADMIN_PASSWORD`** to a long random value (at least 12 characters;
   use 24+). Scope it to Functions. Do **not** prefix it with `VITE_`.
   If unset or too short, the admin endpoint refuses every request (503).
3. Set **`ANET_EVENT_CONFIG`** (Functions scope, no `VITE_` prefix) to the
   party details as single-line JSON — see [Event config](#event-config). If it
   is unset or invalid, valid invitation links get a 503 with no details.
4. Netlify Blobs needs no extra configuration on Netlify; the store is `anet-guests`.

Local testing of functions needs `netlify dev` (plain `vite` serves the UI only).

## Using it

- Open `/admin/guests`, enter the admin key (kept in page memory only), add a
  guest name, and copy the link. **The link is shown once**: only a SHA-256 hash
  of its token is stored, so it can't be recovered later. Create a replacement
  if one is lost.
- "Show guests" lists guests. "Replace link" issues a new copyable link and
  immediately disables the guest's previous link. "Revoke" disables it without
  issuing a replacement. "Delete" permanently removes the guest and invalidates
  its link; this cannot be undone.
- Guests open `/invitation/<token>`.

## Endpoints

| Function | Method | Auth | Result |
| --- | --- | --- | --- |
| `/.netlify/functions/invitation` | POST `{ token }` | token | `{ guest, event }` or 404 |
| `/.netlify/functions/invitation-photo` | POST `{ token }` | token | venue photo or 404 |
| `/.netlify/functions/admin-guests` | GET / POST `{ name }` / DELETE `{ id }` or `{ id, permanent: true }` | `Authorization: Bearer <ANET_ADMIN_PASSWORD>` | list / create / revoke / delete |

## Event config

The repository is public, so real party details are **never** committed. They
live only in the `ANET_EVENT_CONFIG` environment variable, read by
`netlify/lib/event.mjs` after a guest token has been validated. Shape (placeholder
values only):

```json
{
  "name": "Host Name",
  "date": "January 1, 2030",
  "time": "18:00",
  "dressCode": "Describe the dress code here.",
  "age": "",
  "email": "",
  "note": "",
  "venue": {
    "name": "Example Venue",
    "address": "1 Example Street, Example City",
    "mapsUrl": "https://maps.example.com/your-share-link",
    "photoAlt": "Short description of the venue photo",
    "photoCredit": "Photo: Photographer / Source"
  }
}
```

- Required: `name`, `date`, `time`, `dressCode`, `venue.name`, `venue.address`
  (non-empty strings, max 500 characters each).
- Optional: `age`, `email` (must look like an email), `note`, `venue.mapsUrl`
  (must be `https://`; defaults to a Google Maps search), `venue.photoAlt`,
  `venue.photoCredit`.
- Directions and embedded-map URLs are always derived from `venue.name` +
  `venue.address`; they can't be set directly.
- `date` is shown as written and also parsed for the calendar card (e.g.
  `January 1, 2030` or `2030-01-01`); `time` like `18:00` or `6:00 pm`.
- Set it in Netlify → Site configuration → Environment variables, scoped to
  **Functions** only. AWS Lambda caps all function env vars at 4 KB combined,
  so keep the JSON compact. Redeploy after changing it.
- For `netlify dev`, put it in an untracked `.env` file; never commit it.

The venue photo is served from `netlify/private/` by the token-checked function
and is not part of the static build.

Tests: `npm test`.
