import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import pinkButterfly from '../assets/paper-butterfly.webp';
import blueButterfly from '../assets/paper-butterfly-blue.webp';
import yellowButterfly from '../assets/paper-butterfly-yellow.webp';
import scrapbookVine from '../assets/scrapbook-vine-slim.webp';
import welcomePhotoPlaceholder from '../assets/welcome-photo-placeholder.webp';
import scrapbookBanner from '../assets/scrapbook-banner.webp';
import scrapbookCake from '../assets/scrapbook-footer-cutout.webp';
import bunting from '../assets/art/bunting.svg';
import discoBall from '../assets/art/disco-ball.svg';
import partyHat from '../assets/art/party-hat.svg';
import flower from '../assets/art/flower.svg';
import caterpillar from '../assets/art/caterpillar.svg';
import sparkleTrail from '../assets/art/sparkle-trail.svg';
import starYellow from '../assets/art/star-yellow.svg';
import starPink from '../assets/art/star-pink.svg';
import starBlue from '../assets/art/star-blue.svg';
import starLilac from '../assets/art/star-lilac.svg';
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

const defaults = { guest: '', name: '', age: '', date: '', time: '', place: '', dressCode: '', note: '', email: '', photo: '' };
const keys = Object.keys(defaults);
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

function readInvite() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(keys.map((key) => [key, (params.get(key) || '').slice(0, key === 'photo' ? 2048 : 100)]));
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

function NameTiles({ name }) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const longest = Math.max(...words.map((word) => word.length + 1));
  const size = longest > 10 || name.length > 16 ? 'tiles-xlong' : longest > 7 || name.length > 9 ? 'tiles-long' : '';
  return <span className={`name-tiles ${size}`} aria-hidden="true">
    {words.map((word, wordIndex) => <span className="tile-word" key={`${word}-${wordIndex}`}>
      {[...word].map((letter, index) => <span className="tile" key={`${letter}-${index}`}>{letter}</span>)}
      {wordIndex === words.length - 1 && <span className="tile tile-apostrophe">’S</span>}
    </span>)}
  </span>;
}

function PosterArtwork({ invite }) {
  const name = invite.name?.trim() || 'Your Name';
  const guest = invite.guest?.trim();
  const age = invite.age?.trim();
  const photo = invite.photo?.trim() || welcomePhotoPlaceholder;
  return <>
      <Art src={scrapbookBanner} className="poster-banner" />
      <Art src={flower} className="poster-sticker flower-top-right" />
      <Art src={starYellow} className="poster-sticker poster-star-top" />
      <Art src={starPink} className="poster-sticker poster-star-left" />
      <Art src={starBlue} className="poster-sticker poster-star-right" />
      <Art src={starLilac} className="poster-sticker poster-star-bottom" />
      <span className="poster-intro">{guest ? `Heyy ${guest}, you’re` : 'You’re'} invited to</span>
      <span className="poster-name" aria-label={`${name}'s`}><NameTiles name={name} /></span>
      <span className={`poster-age ${age ? 'poster-age-number' : ''}`} aria-label={age ? `${age}th birthday` : 'Birthday party'}><span className="poster-age-inner">{age || 'PARTY'}<small>{age ? 'TH' : 'TIME!'}</small></span></span>
      <span className="poster-party-title">BIRTHDAY PARTY!!</span>
      <Art src={caterpillar} className="poster-sticker poster-caterpillar" />
      <ButterflySticker src={pinkButterfly} className="poster-butterfly poster-butterfly-one" />
      <ButterflySticker src={blueButterfly} className="poster-butterfly poster-butterfly-two" />
      <Art src={scrapbookCake} className="poster-cake" />
      <span className="poster-photo" aria-hidden="true"><img src={photo} onError={(event) => { event.currentTarget.src = welcomePhotoPlaceholder; }} alt="" /></span>
      <Art src={partyHat} className="poster-sticker poster-hat" />
  </>;
}

function WelcomePage({ invite, onOpen }) {
  const name = invite.name?.trim() || 'Your Name';
  const guest = invite.guest?.trim();
  const age = invite.age?.trim();
  const photo = invite.photo?.trim() || welcomePhotoPlaceholder;
  return <main className="welcome-page">
    <button type="button" className="letter-card" onClick={onOpen} aria-label={`Open the invitation to ${name}'s birthday party`}>
      <Art src={bunting} className="letter-bunting" />
      <span className="letter-strip" aria-hidden="true" />
      <Art src={scrapbookVine} className="letter-vine" />
      <span className="snap snap-photo" aria-hidden="true"><img src={photo} onError={(event) => { event.currentTarget.src = welcomePhotoPlaceholder; }} alt="" /><Art src={tapePink} className="tape" /></span>
      <span className="snap snap-age" aria-hidden="true"><em>{age || '♡'}</em><small>{age ? 'years young!' : 'party time!'}</small><Art src={tapeBlue} className="tape" /></span>
      <span className="snap snap-disco" aria-hidden="true"><Art src={discoBall} className="snap-disco-ball" /><Art src={tapeGreen} className="tape" /></span>
      <Art src={starYellow} className="letter-star letter-star-one" />
      <Art src={starPink} className="letter-star letter-star-two" />
      <span className="letter-body">
        <span className="letter-hello">Heyy{guest ? ` ${guest}` : ''}!</span>
        <span className="letter-line">you’re invited to</span>
        <NameTiles name={name} />
        <span className="letter-party">birthday party!!</span>
      </span>
      <Art src={sparkleTrail} className="letter-sparkles" />
      <Art src={pinkButterfly} className="letter-butterfly" />
      <Art src={tapeLilac} className="letter-corner-tape" />
      <span className="letter-open"><span className="letter-seal" aria-hidden="true">♥</span>Tap to open your invitation</span>
      <span className="letter-fineprint" aria-hidden="true">✿ made with love ✿</span>
    </button>
  </main>;
}

function InvitationCover({ invite }) {
  const name = invite.name?.trim() || 'Your Name';
  return <section className="invitation-cover" aria-label="Birthday invitation cover">
    <div className="cover-poster" role="img" aria-label={`${name}'s birthday party scrapbook cover`}>
      <PosterArtwork invite={invite} />
    </div>
    <Art src={tapePink} className="cover-tape cover-tape-left" />
    <Art src={tapeBlue} className="cover-tape cover-tape-right" />
  </section>;
}

function getPartyDate(dateText, timeText) {
  const text = dateText?.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const local = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
  const parsed = iso || local ? null : new Date(text);
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [date, time]);

  const remaining = target ? Math.max(0, target.getTime() - now) : 0;
  const seconds = Math.floor(remaining / 1000);
  const units = [
    ['DAYS', Math.floor(seconds / 86400)],
    ['HOURS', Math.floor(seconds / 3600) % 24],
    ['MINS', Math.floor(seconds / 60) % 60],
    ['SECS', seconds % 60],
  ];

  return <div className="countdown-scrapbook cutout torn">
    <Art src={tapeLilac} className="countdown-tape" />
    <Art src={starYellow} className="countdown-star countdown-star-left" />
    <Art src={starBlue} className="countdown-star countdown-star-right" />
    <span className="countdown-eyebrow">✿ THE BIG DAY IS ALMOST HERE ✿</span>
    {target ? <>
      <div className="countdown-units" role="timer" aria-label={`${units[0][1]} days, ${units[1][1]} hours, ${units[2][1]} minutes and ${units[3][1]} seconds until the party`}>
        {units.map(([label, value]) => <div className="countdown-unit" key={label} aria-hidden="true"><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}
      </div>
      <span className="countdown-caption">{remaining > 0 ? 'counting down to cake & confetti!' : 'it’s party time!'} </span>
    </> : <p className="countdown-pending">The countdown starts when the date is set ♡</p>}
  </div>;
}

function EventDetails({ invite }) {
  const name = invite.name?.trim() || 'Your Name';
  return <section className="party-details" aria-labelledby="party-details-title">
    <p className="party-details-kicker">SAVE THE DATE</p>
    <h2 id="party-details-title">The party details</h2>
    <PartyCountdown date={invite.date} time={invite.time} />
    <div className="party-details-grid">
      <div className="cutout pinked"><Art src={tapePink} className="tape" /><span className="detail-label">WHEN</span><p>{invite.date || 'Date to come'}</p></div>
      <div className="cutout pinked"><Art src={tapeBlue} className="tape" /><span className="detail-label">TIME</span><p>{invite.time || 'Time to come'}</p></div>
      <div className="cutout pinked"><Art src={tapeGreen} className="tape" /><span className="detail-label">WHERE</span><p>{invite.place || 'Place to come'}</p></div>
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
    <div className="dress-code-mark" aria-hidden="true"><img src={discoBall} alt="" className="spinning-disco-ball" /></div>
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
      <ButterflySticker src={yellowButterfly} className="frame-butterfly frame-butterfly-top" />
      <ButterflySticker src={pinkButterfly} className="frame-butterfly frame-butterfly-left" />
      <ButterflySticker src={pinkButterfly} className="frame-butterfly frame-butterfly-right" />
      <InvitationCover invite={invite} />
      <ButterflyFlight src={yellowButterfly} variant={0} />
      <EventDetails invite={invite} />
      <ButterflyFlight src={pinkButterfly} variant={1} />
      <p className="invitation-note cutout">{invite.note || 'Cake, confetti & good company await!'}</p>
      <ButterflyFlight src={blueButterfly} variant={2} />
      <DressCode invite={invite} />
      <ButterflyFlight src={yellowButterfly} variant={3} />
      <Wishes invite={invite} />
      <div className="candle-flames" aria-hidden="true"><span /><span /><span /></div>
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
