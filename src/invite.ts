export const venue = {
  name: 'Braci by Matoa Group',
  address: 'Jl. Sulanjana No.5, Tamansari, Bandung Wetan, Kota Bandung, Jawa Barat',
  mapsUrl: 'https://share.google/7XrHGOtATT5XqetpF',
  directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Braci by Matoa Group, Jl. Sulanjana No.5, Bandung')}`,
  embedUrl: `https://www.google.com/maps?q=${encodeURIComponent('Braci by Matoa Group, Jl. Sulanjana No.5, Bandung')}&output=embed`,
};

export interface Invite {
  guest: string;
  name: string;
  age: string;
  date: string;
  time: string;
  place: string;
  dressCode: string;
  note: string;
  email: string;
  photo: string;
}

// Edit the party details here.
export const invite: Invite = {
  guest: '',
  name: 'Anet',
  age: '',
  date: 'November 8, 2026',
  time: '17:30',
  place: venue.name,
  dressCode: 'Wear colorful outfits—please avoid black, white, gray, and yellow.',
  note: '',
  email: '',
  photo: '',
};
