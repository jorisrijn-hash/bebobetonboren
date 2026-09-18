/* BEBO - interactie (vanilla JS, geen dependencies)
   1. Navigatie: scroll-status, actieve sectie, mobiel menu (focus, scroll-lock, Esc)
   2. Reveals: IntersectionObserver, respecteert prefers-reduced-motion
   3. Offerteformulier: static/js/offerte.js */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------------------------------------------------------------------
     1. Navigatie
     --------------------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  var lastFocus = null;

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function focusables(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')
    );
  }

  function openMenu() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    // Forceer layout zodat de clip-path-transitie start.
    void menu.offsetHeight;
    menu.classList.add('is-open');
    root.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menu sluiten');
    burger.querySelector('.burger__txt').textContent = 'Sluit';
    var first = menu.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus) {
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menu openen');
    burger.querySelector('.burger__txt').textContent = 'Menu';
    var hide = function () { if (!menu.classList.contains('is-open')) menu.hidden = true; };
    if (reduceMotion) hide(); else setTimeout(hide, 500);
    if (restoreFocus !== false && lastFocus) lastFocus.focus({ preventScroll: true });
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu();
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;
      // Focus binnen menu + menuknop houden.
      var items = [burger].concat(focusables(menu));
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', function (mq) { /* desktop gebruikt CardNav */
      if (mq.matches && burger.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });
  }

  /* Kaart (Leaflet + PDOK) pas laden als hij bijna in beeld is */
  var mainScript = document.querySelector('script[data-map-js]');
  var mapEls = document.querySelectorAll('[data-bebo-map]');
  if (mapEls.length && mainScript) {
    var mapLoaded = false;
    var loadMap = function () {
      if (mapLoaded) return;
      mapLoaded = true;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = mainScript.getAttribute('data-map-css');
      document.head.appendChild(link);
      import(mainScript.getAttribute('data-map-js')).catch(function () {
        mapEls.forEach(function (el) { el.classList.add('is-failed'); });
      });
    };
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { mio.disconnect(); loadMap(); }
      }, { rootMargin: '400px 0px' });
      mapEls.forEach(function (el) { mio.observe(el); });
    } else {
      loadMap();
    }
  }

  /* React Bits-effecten per sectie, lazy en alleen waar passend:
     - Spotlight Card: alleen muis/trackpad (op touch is de kaart al compleet)
     - Shape Blur: alleen desktop met muis, geen reduced motion */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var wide = window.matchMedia('(min-width: 1101px)').matches;
  [
    { sel: '[data-spotlight]', attr: 'data-spotlight-js', ok: fine && !reduceMotion, margin: '300px 0px' },
    { sel: '[data-shape-blur]', attr: 'data-shapeblur-js', ok: fine && wide && !reduceMotion, margin: '200px 0px' }
  ].forEach(function (island) {
    var els = document.querySelectorAll(island.sel);
    if (!els.length || !island.ok || !mainScript) return;
    var src = mainScript.getAttribute(island.attr);
    var done = false;
    var load = function () { if (done) return; done = true; import(src).catch(function () {}); };
    if (!('IntersectionObserver' in window)) { load(); return; }
    var obs = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { obs.disconnect(); load(); }
    }, { rootMargin: island.margin });
    els.forEach(function (el) { obs.observe(el); });
  });

  /* Echte foto's: wireframe-achtergrond tot het beeld geladen is */
  document.querySelectorAll('.media img').forEach(function (img) {
    var done = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });

  /* ---------------------------------------------------------------------
     2. Reveals
     --------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-mask, .measure-host, .area__map');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Blur Highlight (BEBO-versie van React Bits Pro "Blur Highlight")
     Zelfde props als het origineel; hier de centrale BEBO-standaarden.
     Per element te overschrijven met data-bh-<prop> (bijv. data-bh-highlight-delay).
     Tekst en <mark> komen van de server; de beginstaat staat in CSS (html.js),
     dit script zet timing en .bh--in zodra het element in beeld komt.
     --------------------------------------------------------------------- */
  var BH_DEFAULTS = {
    blurAmount: 5,          // px   (origineel: 8)
    inactiveOpacity: 0.55,  //      (origineel: 0.3 - te zwak voor leesbare tekst)
    blurDelay: 0,           // s
    blurDuration: 0.7,      // s    (origineel: 0.8)
    highlightDelay: 0.4,    // s
    highlightDuration: 0.85,// s    (origineel: 1)
    highlightDirection: 'left',
    once: true,             // origineel: false; eenmalig voelt rustiger
    amount: 0.45            // deel zichtbaar vóór start (origineel 0.5, marge -20%)
  };
  var bhEls = document.querySelectorAll('[data-bh]');
  if (bhEls.length) {
    var bhOpt = function (el, key) {
      var attr = 'bh' + key.charAt(0).toUpperCase() + key.slice(1);
      var v = el.dataset[attr];
      if (v === undefined) return BH_DEFAULTS[key];
      if (typeof BH_DEFAULTS[key] === 'number') return parseFloat(v);
      if (typeof BH_DEFAULTS[key] === 'boolean') return v !== 'false';
      return v;
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      // Meteen scherp, markering in eindstaat.
      bhEls.forEach(function (el) { el.classList.add('bh--static'); });
    } else {
      var byAmount = {};
      bhEls.forEach(function (el) {
        var st = el.style;
        st.setProperty('--bh-blur', bhOpt(el, 'blurAmount') + 'px');
        st.setProperty('--bh-inactive', bhOpt(el, 'inactiveOpacity'));
        st.setProperty('--bh-blur-delay', bhOpt(el, 'blurDelay') + 's');
        st.setProperty('--bh-blur-dur', bhOpt(el, 'blurDuration') + 's');
        st.setProperty('--bh-hl-delay', (bhOpt(el, 'blurDelay') + bhOpt(el, 'highlightDelay')) + 's');
        st.setProperty('--bh-hl-dur', bhOpt(el, 'highlightDuration') + 's');
        el.classList.add('bh--dir-' + bhOpt(el, 'highlightDirection'));
        var amt = bhOpt(el, 'amount');
        (byAmount[amt] = byAmount[amt] || []).push(el);
      });
      Object.keys(byAmount).forEach(function (amt) {
        var bio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var el = e.target;
            if (e.isIntersecting) {
              el.classList.add('bh--in');
              if (bhOpt(el, 'once')) bio.unobserve(el);
            } else if (!bhOpt(el, 'once')) {
              el.classList.remove('bh--in');
            }
          });
        }, { threshold: parseFloat(amt), rootMargin: '-20% 0px -20% 0px' });
        byAmount[amt].forEach(function (el) { bio.observe(el); });
      });
    }
  }

  /* 3. Offerteformulier: zie static/js/offerte.js (alleen geladen op /offerte) */
})();
