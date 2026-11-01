// Private party details come from the server-only ANET_EVENT_CONFIG environment
// variable (JSON; see netlify/README.md). Nothing private is kept in source.
// Only loaded after an invitation token has been validated.
const MAX_FIELD_LENGTH = 500;

function text(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error('missing field');
    return '';
  }
  if (typeof value !== 'string') throw new Error('invalid field');
  const trimmed = value.trim();
  if (trimmed.length > MAX_FIELD_LENGTH || (required && !trimmed)) throw new Error('invalid field');
  return trimmed;
}

function httpsUrl(value) {
  const raw = text(value);
  if (!raw) return '';
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('invalid url');
  return url.href;
}

function email(value) {
  const raw = text(value);
  if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new Error('invalid email');
  return raw;
}

// Returns a validated event object, or null if the config is unset or malformed.
export function parseEventConfig(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const config = JSON.parse(raw);
    if (!config || typeof config !== 'object' || !config.venue || typeof config.venue !== 'object') return null;

    const venueName = text(config.venue.name, { required: true });
    const address = text(config.venue.address, { required: true });
    const query = encodeURIComponent(`${venueName}, ${address}`);
    const venue = {
      name: venueName,
      address,
      mapsUrl: httpsUrl(config.venue.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${query}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
      embedUrl: `https://www.google.com/maps?q=${query}&output=embed`,
      photoAlt: text(config.venue.photoAlt),
      photoCredit: text(config.venue.photoCredit),
    };

    return {
      name: text(config.name, { required: true }),
      age: text(config.age),
      date: text(config.date, { required: true }),
      time: text(config.time, { required: true }),
      place: venue.name,
      dressCode: text(config.dressCode, { required: true }),
      note: text(config.note),
      email: email(config.email),
      venue,
    };
  } catch {
    return null;
  }
}

export const loadEventConfig = () => parseEventConfig(process.env.ANET_EVENT_CONFIG);
