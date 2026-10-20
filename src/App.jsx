import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import pinkButterfly from '../assets/paper-butterfly.webp';
import blueButterfly from '../assets/paper-butterfly-blue.webp';
import yellowButterfly from '../assets/paper-butterfly-yellow.webp';
import welcomePhotoPlaceholder from '../assets/welcome-photo-placeholder.webp';
import scrapbookPortrait from '../assets/anet-scrapbook-portrait.webp';
import stageArtwork from '../assets/anet-theatrical-cover-stage.webp';
import stageChildTeddy from '../assets/anet-child-teddy-cutout.webp';
import stageChildHat from '../assets/anet-child-hat-cutout.webp';
import DiscoGlobe from './DiscoGlobe.jsx';
import starYellow from '../assets/art/star-yellow.svg';
import starBlue from '../assets/art/star-blue.svg';
import tapePink from '../assets/art/tape-pink.svg';
import tapeBlue from '../assets/art/tape-blue.svg';
import tapeGreen from '../assets/art/tape-green.svg';
import tapeLilac from '../assets/art/tape-lilac.svg';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);

const Art = ({ src, className }) => <img className={className} src={src} alt="" aria-hidden="true" draggable="false" />;

function ButterflySticker({ src, className = '' }) {
  return <span className={`butterfly-sticker ${className}`} aria-hidden="true">
    <img className="butterfly-wing butterfly-wing-left" src={src} alt="" draggable="false" />
    <img className="butterfly-wing butterfly-wing-right" src={src} alt="" draggable="false" />
    <img className="butterfly-body" src={src} alt="" draggable="false" />
  </span>;
}

const flightPaths = [
  'M20 60 C110 0 170 120 250 70 S330 -10 300 40 S360 112 470 70 S560 20 580 50',
  'M580 40 C480 110 420 0 340 60 S240 120 260 60 S220 -6 140 50 S40 100 20 60',
  'M20 80 C90 20 160 20 210 70 S290 120 330 50 S300 -4 270 40 S420 110 580 30',
  'M580 70 C500 10 430 110 360 60 S300 0 250 50 S170 110 110 50 S50 10 20 40',
];

// A paper butterfly that flutters along a dotted doodle path as the gap between two sections scrolls by.
function ButterflyFlight({ src, variant = 0 }) {
  const root = useRef(null);
  useGSAP(() => {
    const path = root.current.querySelector('.flight-route');
    const butterfly = root.current.querySelector('.flight-butterfly');
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(butterfly, {
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: 90 },
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      });
    });
    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(butterfly, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: 90, start: 0.5, end: 0.5 } });
    });
  }, { scope: root });
  return <div className={`butterfly-flight flight-${variant}`} ref={root} aria-hidden="true">
    <svg viewBox="0 0 600 120" preserveAspectRatio="none"><path className="flight-route" d={flightPaths[variant % flightPaths.length]} /></svg>
    <span className="flight-butterfly"><ButterflySticker src={src} /></span>
  </div>;
}

const defaults = { guest: '', name: 'Anet', age: '', date: 'October 21, 2026', time: '', place: '', dressCode: '', note: '', email: '', photo: '' };
const keys = Object.keys(defaults);
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

function readInvite() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(keys.map((key) => {
    const value = params.has(key) ? params.get(key) : defaults[key];
    return [key, (value ?? '').slice(0, key === 'photo' ? 2048 : 100)];
  }));
}

function pathWithInvite(path, invite) {
  const params = new URLSearchParams();
  for (const key of keys) if (invite[key]?.trim()) params.set(key, invite[key].trim());
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}`;
}

function Header({ onHome }) {
  return <header className="site-header"><a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); onHome(); }}><span className="wordmark-star" aria-hidden="true">★</span> a little party</a><span className="header-note">A birthday invite, made with love</span></header>;
}

function PosterArtwork({ invite }) {
  const name = invite.name?.trim() || 'Anet';
  const displayName = `${name}'s`;
  const guest = invite.guest?.trim();
  const age = invite.age?.trim();
  const numericAge = Number.parseInt(age, 10);
  const lastTwo = numericAge % 100;
  const ageSuffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[numericAge % 10] || 'th');
  const ageLabel = age ? (Number.isFinite(numericAge) ? `${age}${ageSuffix}` : age) : '';
  const photo = invite.photo?.trim() || scrapbookPortrait;
  return <>
      <span className="poster-edition" aria-hidden="true">A LITTLE PARTY <span>✿</span> INVITATION</span>
      <span className="poster-intro">{guest ? `${guest}, you're invited to` : "You're invited to"}</span>
      <span className={`poster-name${displayName.includes(' ') ? ' poster-name-multi' : ''}`} aria-label={displayName}>{displayName.split(/\s+/u).map((word, wordIndex) => <span className="poster-name-word" key={`${wordIndex}-${word}`}>{Array.from(word, (letter, index) => <span className="name-tiles" aria-hidden="true" key={`${index}-${letter}`}>{letter}</span>)}</span>)}</span>
      <span className="poster-subtitle">Birthday Party!!</span>
      <span className="poster-age"><strong>{ageLabel || '✿'}</strong><small>{ageLabel ? 'BIRTHDAY' : 'LET’S PARTY'}</small></span>
      <span className={`poster-photo${invite.photo?.trim() ? ' poster-photo-custom' : ''}`} aria-hidden="true"><img src={photo} onError={(event) => { event.currentTarget.src = scrapbookPortrait; }} alt="" />{invite.photo?.trim() && <span className="poster-party-hat" />}</span>
      <span className="poster-sticker poster-sticker-flower" aria-hidden="true">✿</span>
      <span className="poster-sticker poster-sticker-star" aria-hidden="true">★</span>
      <span className="poster-sticker poster-sticker-butterfly" aria-hidden="true">🦋</span>
      <span className="poster-sticker poster-sticker-flower-alt" aria-hidden="true">✿</span>
      <span className="poster-sticker poster-sticker-star-alt" aria-hidden="true">✦</span>
      <span className="poster-sticker poster-sticker-butterfly-alt" aria-hidden="true">🦋</span>
      <span className="poster-caterpillar" style={{ position: 'absolute', left: '6%', top: '64%', bottom: 'auto', zIndex: 20, display: 'block', fontSize: '2rem', lineHeight: 1 }} aria-hidden="true"><span className="poster-caterpillar-art">🐛</span></span>
      <span className="poster-ticket"><small>THE PARTY</small><strong>LET’S<br />CELEBRATE</strong><em>{invite.date || 'DATE TO COME'}</em></span>
      <span className="poster-footer">A LITTLE PARTY <span>✦</span> MADE WITH LOVE</span>
  </>;
}

function WelcomePage({ invite, onOpen }) {
  const name = invite.name?.trim() || 'Anet';
  const guest = invite.guest?.trim();
  const age = invite.age?.trim();
  const date = invite.date?.trim() || 'Date to be announced';
  const celebration = age === '17' ? 'Sweet Seventeen' : age ? `Birthday · ${age}` : 'Birthday Celebration';
  return <main className="welcome-page stage-welcome">
    <section className="stage-cover" aria-labelledby="stage-name">
      <img className="stage-artwork" src={stageArtwork} alt="" aria-hidden="true" width="1024" height="1792" fetchPriority="high" draggable="false" />
      <img className="stage-child-cutout stage-child-teddy" src={stageChildTeddy} alt="" aria-hidden="true" draggable="false" />
      <img className="stage-child-cutout stage-child-hat" src={stageChildHat} alt="" aria-hidden="true" draggable="false" />
      <p className="stage-overture" aria-hidden="true">Oh La La!</p>
      <div className={`stage-copy${name.length > 24 ? ' stage-copy-long' : ''}${name.length > 50 ? ' stage-copy-extra-long' : ''}`}>
        <p className="stage-greeting">You’re invited to</p>
        <h1 id="stage-name">{name}’s</h1>
        <p className="stage-celebration">{celebration}</p>
        <p className={`stage-date${date.length > 35 ? ' stage-date-long' : ''}`}>{date}</p>
      </div>
      <div className="stage-opening">
        {guest && <p className={`stage-guest${guest.length > 35 ? ' stage-guest-long' : ''}`}>For {guest}</p>}
        <button type="button" className="stage-open" onClick={onOpen} aria-label={`Open the invitation to ${name}'s birthday party`}>Open Invitation <span aria-hidden="true">✧</span></button>
      </div>
    </section>
  </main>;
}

function InvitationCover({ invite }) {
  const name = invite.name?.trim() || 'Anet';
  return <section className="invitation-cover" aria-label="Birthday invitation cover">
    <div className="cover-poster" role="img" aria-label={`${name}'s retro music birthday party cover`}>
      <PosterArtwork invite={invite} />
    </div>
  </section>;
}

function getPartyDate(dateText, timeText) {
  const text = dateText?.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const local = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
  const normalizedText = text
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),?\s+/i, '');
  const parsed = iso || local ? null : new Date(normalizedText);
  if (!iso && !local && Number.isNaN(parsed.getTime())) return null;
  const year = iso ? Number(iso[1]) : local ? Number(local[3]) : parsed.getFullYear();
  const month = iso ? Number(iso[2]) - 1 : local ? Number(local[2]) - 1 : parsed.getMonth();
  const day = iso ? Number(iso[3]) : local ? Number(local[1]) : parsed.getDate();

  const clock = /\b(\d{1,2})(?:[:.]([0-5]\d))?\s*(am|pm)\b/i.exec(timeText || '')
    || /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/.exec(timeText || '');
  let hour = clock ? Number(clock[1]) : 0;
  const minute = clock ? Number(clock[2] || 0) : 0;
  if (clock?.[3]) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (clock[3].toLowerCase() === 'pm' ? 12 : 0);
  }

  const target = new Date(year, month, day, hour, minute);
  return target.getFullYear() === year && target.getMonth() === month && target.getDate() === day ? target : null;
}

function PartyCountdown({ date, time }) {
  const target = getPartyDate(date, time);
  const days = target
    ? [-1, 0, 1].map((offset) => new Date(target.getFullYear(), target.getMonth(), target.getDate() + offset))
    : [];
  const eventDateLabel = target
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(target)
    : '';

  return <section className="countdown-scrapbook calendar-card" aria-label="Save the date">
    <span className="calendar-envelope" aria-hidden="true">✉</span>
    <DiscoGlobe className="calendar-disco" />
    <h3 className="calendar-title">Save the <span>Date!</span></h3>
    {target ? <div className="calendar-days" role="list" aria-label={`Three-day calendar centered on ${eventDateLabel}`}>
      {days.map((day, index) => {
        const isPartyDay = index === 1;
        const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(day);
        const fullDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day);
        return <div className={`calendar-day${isPartyDay ? ' calendar-day-party' : ''}`} role="listitem" aria-label={isPartyDay ? `${fullDate}, party day` : fullDate} key={day.toISOString()}>
          <span className="calendar-weekday" aria-hidden="true">{weekday}</span>
          <strong className="calendar-number" aria-hidden="true">{day.getDate()}</strong>
          {isPartyDay && <span className="calendar-party-label" aria-hidden="true">Party!</span>}
        </div>;
      })}
    </div> : <p className="countdown-pending">Add the party date to mark your special day.</p>}
  </section>;
}

function EventDetails({ invite }) {
  const name = invite.name?.trim() || 'Anet';
  return <section className="party-details" aria-labelledby="party-details-title">
    <p className="party-details-kicker">THE CELEBRATION</p>
    <PartyCountdown date={invite.date} time={invite.time} />
    <div className="event-info-card">
      <h2 id="party-details-title">Event Details</h2>
      <div className="party-details-grid">
        <div className="cutout pinked"><Art src={tapePink} className="tape" /><span className="detail-label">WHEN</span><p>{invite.date || 'Date to come'}</p></div>
        <div className="cutout pinked"><Art src={tapeBlue} className="tape" /><span className="detail-label">TIME</span><p>{invite.time || 'Time to come'}</p></div>
        <div className="cutout pinked"><Art src={tapeGreen} className="tape" /><span className="detail-label">WHERE</span><p>{invite.place || 'Place to come'}</p></div>
      </div>
    </div>
    {validEmail(invite.email) && <a className="rsvp-link" href={`mailto:${invite.email}?subject=${encodeURIComponent(`RSVP for ${name}'s birthday`)}`}>RSVP WITH LOVE <span aria-hidden="true">↗</span></a>}
  </section>;
}

function Wishes({ invite }) {
  const [from, setFrom] = useState('');
  const [wish, setWish] = useState('');
  const [message, setMessage] = useState('');
  function sendWish(event) {
    event.preventDefault();
    if (!validEmail(invite.email)) { setMessage('Wishes are not open yet. Please check back soon.'); return; }
    const subject = `A birthday wish for ${invite.name || 'you'}!`;
    const body = `${wish.trim()}\n\nWith love,\n${from.trim()}`;
    window.location.href = `mailto:${invite.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage('Your email app is opening with your wish.');
  }
  return <section className="wishes-section cutout torn"aria-labelledby="wishes-title">
    <Art src={tapePink} className="tape" />
    <div className="wishes-intro"><span className="wishes-doodle" aria-hidden="true">♡</span><div><span className="panel-kicker">A LITTLE EXTRA LOVE</span><h2 id="wishes-title">Leave a birthday wish</h2><p>Good wishes make the day even sweeter. Write yours below.</p></div></div>
    <form className="wishes-form" onSubmit={sendWish}><label>Your name<input value={from} onChange={(event) => setFrom(event.target.value)} required maxLength="50" placeholder="Your name" /></label><label>Your wish<textarea value={wish} onChange={(event) => setWish(event.target.value)} required maxLength="500" rows="4" placeholder="Wishing you the happiest birthday..." /></label><div className="wishes-actions"><button className="primary-button" type="submit">Send your wish <span aria-hidden="true">↗</span></button><p role="status" aria-live="polite">{message || (validEmail(invite.email) ? 'Opens your email app to send your wish.' : 'Wishes will open when the invitation is ready.')}</p></div></form>
  </section>;
}

function DressCode({ invite }) {
  return <section className="dress-code-section cutout torn"aria-labelledby="dress-code-title">
    <Art src={tapeLilac} className="tape" />
    <div className="dress-code-mark" aria-hidden="true"><DiscoGlobe className="dress-code-globe" /></div>
    <div className="dress-code-copy">
      <span className="panel-kicker">WHAT TO WEAR</span>
      <h2 id="dress-code-title">Dress code</h2>
      <p>{invite.dressCode?.trim() || 'Come dressed for a celebration. The host will add the dress code here.'}</p>
    </div>
    <Art src={starYellow} className="dress-code-sparkles" />
  </section>;
}

function InvitationPage({ invite, onBack }) {
  return <main className="page-shell invitation-page">
    <button className="back-button sheet-back" onClick={onBack}>← Back to hello</button>
    <div className="invitation-sheet">
      <InvitationCover invite={invite} />
      <ButterflyFlight src={yellowButterfly} variant={0} />
      <EventDetails invite={invite} />
      <ButterflyFlight src={pinkButterfly} variant={1} />
      <p className="invitation-note cutout">{invite.note || 'Cake, confetti & good company await!'}</p>
      <ButterflyFlight src={blueButterfly} variant={2} />
      <DressCode invite={invite} />
      <ButterflyFlight src={yellowButterfly} variant={3} />
      <Wishes invite={invite} />
    </div>
  </main>;
}

export default function App() {
  const [invite, setInvite] = useState(readInvite);
  const [page, setPage] = useState(window.location.pathname === '/invitation' ? 'invitation' : 'welcome');
  useEffect(() => {
    const onPopState = () => { setPage(window.location.pathname === '/invitation' ? 'invitation' : 'welcome'); setInvite(readInvite()); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  function navigate(next) {
    window.history.pushState(null, '', pathWithInvite(next === 'welcome' ? '/' : '/invitation', invite));
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  return <><Header onHome={() => navigate('welcome')} />{page === 'welcome' ? <WelcomePage invite={invite} onOpen={() => navigate('invitation')} /> : <InvitationPage invite={invite} onBack={() => navigate('welcome')} />}<footer className="site-footer"><span>Made for the moments we remember.</span><span>★ &nbsp; A LITTLE PARTY</span></footer></>;
}
