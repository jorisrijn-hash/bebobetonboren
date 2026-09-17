import { createRoot } from 'react-dom/client';
import ShapeBlur from './components/ShapeBlur.jsx';

/* React Bits ShapeBlur als ingetogen achtergrond (alleen de laatste CTA op home).
   Hoekige rechthoek (roundness 0) die scherper wordt rond de muis: diepte-
   scherpte op een technische vorm. Alleen desktop + geen reduced motion. */
document.querySelectorAll('[data-shape-blur]').forEach((el) => {
  if (el.dataset.mounted) return;
  el.dataset.mounted = '1';
  createRoot(el).render(
    <ShapeBlur
      variation={0}
      pixelRatioProp={1.5}
      shapeSize={1.3}
      roundness={0}
      borderSize={0.035}
      circleSize={0.28}
      circleEdge={0.9}
    />
  );
});
