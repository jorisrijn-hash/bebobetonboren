import { createRoot } from 'react-dom/client';
import TargetCursor from './components/TargetCursor.jsx';
import './cursor-bebo.css';

/* React Bits TargetCursor als BEBO-richtkruis.
   base.html laadt dit bestand alleen bij een fijne pointer (muis/trackpad) en
   zonder prefers-reduced-motion; dit is een tweede controle. */
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (fine && !reduced && !document.getElementById('target-cursor-root')) {
  const root = document.documentElement;
  const host = document.createElement('div');
  host.id = 'target-cursor-root';
  document.body.appendChild(host);
  root.classList.add('bebo-cursor-on');

  // Over tekstvelden en de kaart tonen we de native cursor (I-beam / grab),
  // zodat invoer en slepen vanzelfsprekend blijven.
  const NATIVE = 'input, textarea, select, [contenteditable="true"], .leaflet-container';
  window.addEventListener('pointerover', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    root.classList.toggle('cursor-native', !!(el && el.closest(NATIVE)));
  }, { passive: true });
  // Wit richtkruis op rood. De stip wordt wit zodra de muis boven een rood
  // vlak staat. De hoeken worden alleen wit als dat rode vlak óm het
  // aangewezen element ligt (bijv. links in de rode nav-kaart); bij een rode
  // knop staan de hoeken er juist buiten, op de lichte pagina, en blijven rood.
  const TARGETS = 'a[href], button:not([disabled]), .opt, .pill, .upload__drop, [data-cursor-target]';
  const RED_WHEN_HOVERED = '.ft__cta'; // rode vulling is een los element
  const RED = [[210, 5, 30], [169, 4, 24]];
  const isRedColor = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map((n) => parseFloat(n));
    if (a < 0.5) return null; // transparant: verder zoeken bij de ouder
    return RED.some(([R, G, B]) => Math.abs(r - R) < 12 && Math.abs(g - G) < 12 && Math.abs(b - B) < 12);
  };
  // Eerste element (vanaf de muis omhoog) met een dekkende achtergrond.
  const surfaceOf = (el) => {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node.matches(RED_WHEN_HOVERED)) return { node, red: true };
      const red = isRedColor(getComputedStyle(node).backgroundColor);
      if (red !== null) return { node, red };
    }
    return { node: null, red: false };
  };
  const updateTone = (el) => {
    const { node, red } = surfaceOf(el);
    const target = el.closest(TARGETS);
    const dotLight = red;
    const cornersLight = red && (!target || (node !== target && node.contains(target)));
    root.classList.toggle('cursor-dot-light', dotLight);
    root.classList.toggle('cursor-corners-light', cornersLight);
  };
  let toneFrame = 0;
  window.addEventListener('pointerover', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    cancelAnimationFrame(toneFrame);
    toneFrame = requestAnimationFrame(() => updateTone(el));
  }, { passive: true });

  // Richtkruis verbergen zodra de muis het venster verlaat.
  document.addEventListener('mouseleave', () => root.classList.add('cursor-away'));
  document.addEventListener('mouseenter', () => root.classList.remove('cursor-away'));

  createRoot(host).render(
    <TargetCursor
      targetSelector={TARGETS}
      spinDuration={4}
      hideDefaultCursor={false}
      hoverDuration={0.18}
      parallaxOn={false}
    />
  );
}
