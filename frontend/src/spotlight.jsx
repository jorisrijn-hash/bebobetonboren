import { createRoot } from 'react-dom/client';
import SpotlightCard from './components/SpotlightCard.jsx';

/* React Bits SpotlightCard rond server-gerenderde CTA-kaarten.
   Alleen geladen bij muis/trackpad; op touch blijft de statische kaart staan. */
document.querySelectorAll('[data-spotlight]').forEach((mount) => {
  if (mount.dataset.mounted) return;
  const card = mount.querySelector('.card-spotlight');
  if (!card) return;
  mount.dataset.mounted = '1';
  const html = card.innerHTML;
  const extra = card.className.replace('card-spotlight', '').trim();
  createRoot(mount).render(
    <SpotlightCard className={extra} spotlightColor={mount.dataset.spotlight || 'rgba(210, 5, 30, 0.22)'}>
      <div className="spot-inner" dangerouslySetInnerHTML={{ __html: html }} />
    </SpotlightCard>
  );
});
