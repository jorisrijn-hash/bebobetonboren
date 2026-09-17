import { createRoot } from 'react-dom/client';
import CardNav from './components/CardNav.jsx';

/* Primaire desktopnavigatie. De configuratie (echte routes, actieve pagina)
   komt uit Jinja (#card-nav-data); de server rendert dezelfde markup vooraf,
   dus mounten geeft geen verspringing. */
const host = document.getElementById('card-nav-root');
const dataEl = document.getElementById('card-nav-data');
if (host && dataEl && !host.dataset.mounted) {
  host.dataset.mounted = '1';
  const cfg = JSON.parse(dataEl.textContent);
  createRoot(host).render(<CardNav {...cfg} />);
}
