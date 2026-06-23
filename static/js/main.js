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

  /* ---- Menubalk: achtergrond bij scrollen + floating contactknop ----
     De StaggeredMenu-header wordt door React (async) gerenderd, dus we
     zoeken 'm elke scroll opnieuw op. */
  var float = document.getElementById('float');
  var ident = document.getElementById('ident');
  var footerEl = document.querySelector('.footer');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var smHeader = document.querySelector('.staggered-menu-header');
    if (smHeader) smHeader.classList.toggle('is-scrolled', y > 24);
    var atFooter = footerEl && footerEl.getBoundingClientRect().top < window.innerHeight - 40;
    if (float) float.classList.toggle('show', y > window.innerHeight * 0.4 && !atFooter);
    if (ident) ident.classList.toggle('show', !!atFooter);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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
