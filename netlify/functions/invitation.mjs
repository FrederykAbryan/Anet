import { loadEventConfig } from '../lib/event.mjs';
import { createInvitationHandler } from '../lib/handlers.mjs';
import { getGuestStore } from '../lib/store.mjs';

// POST /.netlify/functions/invitation  { token } → { guest, event } or 404.
export default createInvitationHandler({ getStore: getGuestStore, loadEvent: loadEventConfig });
