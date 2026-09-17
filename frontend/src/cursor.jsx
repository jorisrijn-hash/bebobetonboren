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
  // Richtkruis verbergen zodra de muis het venster verlaat.
  document.addEventListener('mouseleave', () => root.classList.add('cursor-away'));
  document.addEventListener('mouseenter', () => root.classList.remove('cursor-away'));

  createRoot(host).render(
    <TargetCursor
      targetSelector="a[href], button:not([disabled]), .opt, .pill, .upload__drop, [data-cursor-target]"
      spinDuration={4}
      hideDefaultCursor={false}
      hoverDuration={0.18}
      parallaxOn={false}
    />
  );
}
