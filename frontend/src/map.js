/* BEBO werkgebied - echte kaart
   - Leaflet (open source, geen API-sleutel)
   - Ondergrond: BRT-Achtergrondkaart grijs van PDOK/Kadaster (officiële
     Nederlandse topografie, open data, CC BY 4.0)
   - Alleen bevestigde plaatsen; geen verzonnen werkgebied-grens.
   Wordt door static/js/main.js lazy geladen zodra een kaart in beeld komt. */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map-bebo.css';

const TILES = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png';
const ATTRIBUTION = 'Kaartgegevens &copy; <a href="https://www.kadaster.nl" target="_blank" rel="noopener">Kadaster</a> / <a href="https://www.pdok.nl" target="_blank" rel="noopener">PDOK</a>';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initMap(el) {
  if (el.dataset.mapReady) return;
  const dataEl = document.getElementById(el.dataset.beboMap);
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  el.dataset.mapReady = '1';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const map = L.map(el, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,     // pagina blijft scrollen
    dragging: !coarse,          // op touch: geen scroll-trap met één vinger
    tap: false,
    minZoom: 9,
    maxZoom: 17,
    zoomSnap: 0.25,
    keyboard: true
  });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Inzoomen', zoomOutTitle: 'Uitzoomen' }).addTo(map);
  map.attributionControl.setPrefix(false);
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, minZoom: 6 }).addTo(map);

  // Muiswiel-zoom pas na een bewuste klik in de kaart.
  map.once('click', () => map.scrollWheelZoom.enable());
  el.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  const hq = data.hq;
  const hqLatLng = L.latLng(hq.lat, hq.lon);
  const markers = {};

  // Verbindingslijnen BEBO-basis → plaatsen (indicatief, geen grens).
  data.places.forEach((p) => {
    if (p.base) return;
    L.polyline([hqLatLng, [p.lat, p.lon]], {
      color: '#D2051E', weight: 1.25, opacity: 0.55, dashArray: '4 6', interactive: false
    }).addTo(map);
  });

  data.places.forEach((p) => {
    const icon = L.divIcon({
      className: 'bebo-pin' + (p.base ? ' bebo-pin--town-base' : ''),
      html: '<span class="bebo-pin__dot"></span><span class="bebo-pin__label">' + escapeHtml(p.name) + '</span>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    const m = L.marker([p.lat, p.lon], { icon, title: p.name, keyboard: false }).addTo(map);
    markers[p.name] = m;
  });

  // BEBO-basis: duidelijker gemarkeerd, met kaartje.
  const hqIcon = L.divIcon({
    className: 'bebo-hq',
    html: '<span class="bebo-hq__ring"></span><span class="bebo-hq__core"></span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
  const hqMarker = L.marker(hqLatLng, { icon: hqIcon, title: 'BEBO / basis', zIndexOffset: 1000, keyboard: true }).addTo(map);
  hqMarker.bindPopup(
    '<div class="bebo-card"><span class="bebo-card__code">BEBO / Basis</span>' +
      '<strong>' + escapeHtml(hq.street) + '</strong><span>' + escapeHtml(hq.postal) + '</span>' +
      '<a href="' + escapeHtml(hq.route_url) + '" target="_blank" rel="noopener">Route plannen</a></div>',
    { className: 'bebo-popup', closeButton: true, offset: [0, -12], autoPanPadding: [24, 24] }
  );
  markers.__hq = hqMarker;

  const bounds = L.latLngBounds([hqLatLng].concat(data.places.map((p) => [p.lat, p.lon])));
  const fit = () => {
    const wide = el.clientWidth > 900;
    const padLeft = el.dataset.panelSide === 'left' && wide ? Math.min(460, el.clientWidth * 0.34) : 32;
    map.fitBounds(bounds, {
      paddingTopLeft: [padLeft, 56],
      paddingBottomRight: [130, 48], // ruimte voor labels rechts van de stippen
      animate: false
    });
  };
  fit();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { map.invalidateSize(); fit(); }, 150); });

  // Koppeling met de plaatsenlijst naast/over de kaart.
  document.querySelectorAll('[data-map-focus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-map-focus');
      const target = name === '__hq' ? hqMarker : markers[name];
      if (!target) return;
      const zoom = Math.max(map.getZoom(), 12);
      if (reduced) map.setView(target.getLatLng(), zoom); else map.flyTo(target.getLatLng(), zoom, { duration: 0.6 });
      if (name === '__hq') hqMarker.openPopup();
      document.querySelectorAll('[data-map-focus]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      el.classList.add('has-focus');
    });
  });
  document.querySelectorAll('[data-map-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      map.closePopup();
      fit();
      document.querySelectorAll('[data-map-focus]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    });
  });

  el.classList.add('is-ready');
}

document.querySelectorAll('[data-bebo-map]').forEach(initMap);
export { initMap };
