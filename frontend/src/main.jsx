import { createRoot } from 'react-dom/client';
import TargetCursor from './components/TargetCursor.jsx';
import './bebo-overrides.css';

/* Capabilities - we volgen het React Bits-advies: effecten uit op mobiel
   en bij prefers-reduced-motion, en zwaar WebGL pas laden wanneer nodig. */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const isSmall = window.matchMedia('(max-width: 860px)').matches;

/* 1) Target cursor - alleen op desktop met een echte muis.
   De component zet zichzelf ook intern uit op mobiel; dit is de extra gate. */
if (!isTouch && !prefersReduced) {
  const host = document.createElement('div');
  host.id = 'target-cursor-root';
  document.body.appendChild(host);
  // Markeer de pagina zodat we de OS-cursor overal kunnen verbergen
  // (ook op links/knoppen/velden en tijdens selecteren) via CSS.
  document.documentElement.classList.add('bebo-cursor-on');
  createRoot(host).render(
    <TargetCursor
      targetSelector=".btn, .textlink, .dienst, .chip, .regio__list span, .nav__links a, .nav__phone, .float a, .offerte__direct a, .footer__col a, .brand, .field input, .field textarea, .field select"
      spinDuration={3}
      hideDefaultCursor={true}
    />
  );
}

/* 2) Beams-achtergrond in de offerte-sectie - three.js wordt lazy geladen
   (aparte chunk) en pas gemount wanneer de sectie in beeld komt. */
const beamsRoot = document.getElementById('beams-root');
if (beamsRoot && !prefersReduced && !isSmall) {
  const mountBeams = () =>
    import('./components/Beams.jsx').then(({ default: Beams }) => {
      createRoot(beamsRoot).render(
        <Beams
          beamNumber={10}
          lightColor="#C2493C"
          speed={1.6}
          noiseIntensity={1.4}
          scale={0.18}
          rotation={26}
        />
      );
    });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          mountBeams();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(beamsRoot);
  } else {
    mountBeams();
  }
}

/* 3) LightRays-achtergrond in het hero-paneel. Boven de vouw, dus direct
   mounten (geen observer). ogl is licht; alleen desktop + geen reduced-motion.
   Wil je liever een foto/video (optie B)? Vervang in templates/index.html de
   <div id="hero-fx"> door een <img>/<video> die het paneel vult. */
const heroFx = document.getElementById('hero-fx');
if (heroFx && !prefersReduced && !isSmall) {
  import('./components/LightRays.jsx').then(({ default: LightRays }) => {
    createRoot(heroFx).render(
      <LightRays
        raysOrigin="top-center"
        raysColor="#E84531"
        raysSpeed={1.0}
        lightSpread={1.0}
        rayLength={2.0}
        followMouse={true}
        mouseInfluence={0.15}
        noiseAmount={0.08}
        distortion={0.03}
      />
    );
  });
}
