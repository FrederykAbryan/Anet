import { getStore } from '@netlify/blobs';

// Strong consistency so a just-created or just-revoked invitation is seen immediately.
export const getGuestStore = () => getStore({ name: 'anet-guests', consistency: 'strong' });
