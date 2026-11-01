import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPhotoHandler } from '../lib/handlers.mjs';
import { getGuestStore } from '../lib/store.mjs';

// Shipped via `included_files` in netlify.toml, kept out of the public static build.
const PHOTO = 'netlify/private/venue-photo.webp';

async function loadPhoto() {
  const roots = [process.env.LAMBDA_TASK_ROOT, process.cwd()].filter(Boolean);
  for (const root of roots) {
    try {
      return await readFile(path.resolve(root, PHOTO));
    } catch {
      // try the next root
    }
  }
  throw new Error('venue photo unavailable');
}

// POST /.netlify/functions/invitation-photo  { token } → image/webp or 404.
export default createPhotoHandler({ getStore: getGuestStore, loadPhoto });
