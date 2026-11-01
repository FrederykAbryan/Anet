import { createAdminHandler } from '../lib/handlers.mjs';
import { getGuestStore } from '../lib/store.mjs';

// Authorization: Bearer <ANET_ADMIN_PASSWORD>
//   GET    → list guests (names/ids only; tokens are never stored)
//   POST   { name } → create guest, returns the one-time invitation path
//   DELETE { id }   → revoke guest
export default createAdminHandler({
  getStore: getGuestStore,
  getSecret: () => process.env.ANET_ADMIN_PASSWORD,
});
