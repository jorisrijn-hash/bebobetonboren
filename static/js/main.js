/* BEBO - interactie
   - nav krijgt achtergrond bij scrollen
   - mobiel menu (hamburger)
   - scroll-reveal via IntersectionObserver
   - offerte-chips (multi-select) → verborgen inputs
   - zwevend contactknopje verschijnt na de hero
   Respecteert prefers-reduced-motion. */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Nav: stuck-state + floating button ---- */
  var nav = document.getElementById('nav');
  var float = document.getElementById('float');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('is-stuck', y > 24);
    if (float) float.classList.toggle('show', y > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobiel menu ---- */
  var burger = document.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    });
    document.querySelectorAll('#navPanel a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Scroll-reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Offerte-chips ---- */
  var chips = document.getElementById('chips');
  var chipInputs = document.getElementById('chipInputs');
  if (chips && chipInputs) {
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      var on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      var val = btn.getAttribute('data-value');
      var existing = chipInputs.querySelector('input[value="' + val + '"]');
      if (on && existing) {
        existing.remove();
      } else if (!on && !existing) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'diensten';
        input.value = val;
        chipInputs.appendChild(input);
      }
    });
  }
})();
