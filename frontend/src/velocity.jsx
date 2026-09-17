import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ScrollVelocity from './components/ScrollVelocity.jsx';

/* React Bits ScrollVelocity als schermbrede typografische strip.
   Rustig ingesteld; pauzeert buiten beeld. Niet geladen bij reduced motion
   (dan blijft de statische server-versie staan). */
function Strip({ texts, velocity }) {
  const ref = useRef(null);
  const paused = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { paused.current = !e.isIntersecting; }, { rootMargin: '100px 0px' });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}>
      <ScrollVelocity
        texts={texts}
        velocity={velocity}
        className="velo__text"
        damping={60}
        stiffness={300}
        numCopies={4}
        velocityMapping={{ input: [0, 1000], output: [0, 1.6] }}
        parallaxClassName="parallax velo__row"
        scrollerClassName="scroller velo__scroller"
        pausedRef={paused}
      />
    </div>
  );
}

document.querySelectorAll('[data-velocity]').forEach((el) => {
  if (el.dataset.mounted) return;
  el.dataset.mounted = '1';
  const texts = JSON.parse(el.dataset.velocity);
  const small = window.matchMedia('(max-width: 720px)').matches;
  createRoot(el).render(<Strip texts={texts} velocity={small ? 22 : 38} />);
});
