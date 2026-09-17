/* BEBO - interactie (vanilla JS, geen dependencies)
   1. Navigatie: scroll-status, actieve sectie, mobiel menu (focus, scroll-lock, Esc)
   2. Reveals: IntersectionObserver, respecteert prefers-reduced-motion
   3. Offerteformulier: progressive disclosure, foto-upload met previews,
      validatie en verzending met echte status (geen nep-succes) */

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
    window.matchMedia('(min-width: 1041px)').addEventListener('change', function (mq) {
      if (mq.matches && burger.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });
  }

  /* Actieve sectie in de navigatie + mobiele balk */
  var navLinks = document.querySelectorAll('[data-nav]');
  var mbarQuote = document.querySelector('[data-mbar="offerte"]');
  if ('IntersectionObserver' in window) {
    var sections = ['werk', 'werkzaamheden', 'waarom', 'werkgebied', 'contact']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (a) {
            var on = a.getAttribute('data-nav') === id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
          });
          if (mbarQuote) mbarQuote.classList.toggle('is-current', id === 'contact');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

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
     3. Offerteformulier
     --------------------------------------------------------------------- */
  var form = document.getElementById('quote-form');
  if (!form) return;

  var status = form.querySelector('.form__status');
  var submitBtn = form.querySelector('.form__submit');
  var submitLabel = form.querySelector('.form__submit-label');
  var detailSets = form.querySelectorAll('.form__details');
  var serviceRadios = form.querySelectorAll('input[name="dienst"]');

  /* 3a. Progressive disclosure: alleen de details van de gekozen dienst */
  function showDetails(service) {
    detailSets.forEach(function (fs) {
      var active = fs.getAttribute('data-for') === service;
      fs.classList.toggle('is-active', active);
      fs.disabled = !active; // uitgeschakelde velden worden niet meegestuurd
    });
  }
  function selectedService() {
    var checked = form.querySelector('input[name="dienst"]:checked');
    return checked ? checked.value : '';
  }
  serviceRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      showDetails(r.value);
      clearError('dienst');
    });
  });

  function preselect(service) {
    var radio = form.querySelector('input[name="dienst"][value="' + service + '"]');
    if (!radio) return;
    radio.checked = true;
    showDetails(service);
    clearError('dienst');
  }
  showDetails(selectedService());
  if (form.dataset.preselect) preselect(form.dataset.preselect);

  // "Offerte aanvragen" bij een dienst: kies die dienst en spring naar het formulier.
  document.querySelectorAll('[data-service]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      preselect(link.getAttribute('data-service'));
      var target = document.getElementById('offerte');
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', '#offerte');
    });
  });

  // Gewenste uitvoerdatum niet in het verleden.
  var dateInput = form.querySelector('#datum');
  if (dateInput) {
    var today = new Date();
    dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  /* 3b. Foto-upload */
  var upload = document.getElementById('upload');
  var fileInput = document.getElementById('fotos');
  var list = upload ? upload.querySelector('.upload__list') : null;
  var maxPhotos = parseInt(form.dataset.maxPhotos, 10) || 10;
  var limitBytes = (parseFloat(form.dataset.uploadLimitMb) || 4) * 1024 * 1024;
  var photos = []; // { id, file }
  var photoSeq = 0;
  var ACCEPT = /\.(jpe?g|png|heic|heif)$/i;

  function formatSize(bytes) {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(bytes / 1024) + ' kB';
  }

  function renderPhotos() {
    list.innerHTML = '';
    photos.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'thumb';
      var isHeic = /\.(heic|heif)$/i.test(p.file.name);
      var img = document.createElement('img');
      img.className = 'thumb__img';
      img.alt = 'Voorbeeld foto ' + (i + 1);
      img.src = p.url;
      img.onerror = function () {
        var fb = document.createElement('div');
        fb.className = 'thumb__fallback';
        fb.textContent = isHeic ? 'HEIC' : 'FOTO';
        img.replaceWith(fb);
      };
      var name = document.createElement('span');
      name.className = 'thumb__name';
      name.textContent = p.file.name + ' · ' + formatSize(p.file.size);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb__remove';
      btn.setAttribute('aria-label', 'Verwijder ' + p.file.name);
      btn.innerHTML = '<span aria-hidden="true">×</span>';
      btn.addEventListener('click', function () {
        URL.revokeObjectURL(p.url);
        photos = photos.filter(function (x) { return x.id !== p.id; });
        renderPhotos();
        clearError('fotos');
        fileInput.focus();
      });
      li.appendChild(img);
      li.appendChild(name);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function addFiles(fileList) {
    var rejected = 0;
    var overflow = false;
    Array.prototype.forEach.call(fileList, function (file) {
      if (!ACCEPT.test(file.name) && !/^image\/(jpeg|png|heic|heif)$/.test(file.type)) { rejected++; return; }
      if (photos.length >= maxPhotos) { overflow = true; return; }
      var dupe = photos.some(function (p) { return p.file.name === file.name && p.file.size === file.size; });
      if (dupe) return;
      photos.push({ id: ++photoSeq, file: file, url: URL.createObjectURL(file) });
    });
    renderPhotos();
    if (overflow) setError('fotos', 'Maximaal ' + maxPhotos + " foto's per aanvraag.");
    else if (rejected) setError('fotos', 'Alleen JPG, PNG of HEIC-foto\'s zijn mogelijk.');
    else clearError('fotos');
  }

  if (upload && fileInput) {
    fileInput.addEventListener('change', function () {
      addFiles(fileInput.files);
      fileInput.value = ''; // zelfde bestand opnieuw kunnen kiezen
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      upload.addEventListener(type, function (e) { e.preventDefault(); upload.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      upload.addEventListener(type, function (e) {
        e.preventDefault();
        if (type === 'dragleave' && upload.contains(e.relatedTarget)) return;
        upload.classList.remove('is-dragover');
      });
    });
    upload.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
    // Label-klik opent de bestandskiezer; Enter/spatie op het (onzichtbare) input idem.
  }

  /* Verklein JPG/PNG in de browser (max. 2000 px, JPEG 82%) zodat uploads
     klein blijven. HEIC of niet-decodeerbare bestanden gaan ongewijzigd mee. */
  function compress(file) {
    return new Promise(function (resolve) {
      if (!/\.(jpe?g|png)$/i.test(file.name) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then(function (bmp) {
        var max = 2000;
        var scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 900 * 1024) { bmp.close && bmp.close(); return resolve(file); }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close && bmp.close();
        canvas.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      }).catch(function () { resolve(file); });
    });
  }

  /* 3c. Validatie */
  var errorFields = {};
  function errorEl(name) { return form.querySelector('[data-error-for="' + name + '"]'); }
  function fieldsFor(name) { return form.querySelectorAll('[name="' + name + '"]'); }

  function setError(name, message) {
    var el = errorEl(name);
    if (el) el.textContent = message;
    fieldsFor(name).forEach(function (f) { f.setAttribute('aria-invalid', 'true'); });
    errorFields[name] = true;
    form.classList.add('has-errors');
  }
  function clearError(name) {
    var el = errorEl(name);
    if (el) el.textContent = '';
    fieldsFor(name).forEach(function (f) { f.removeAttribute('aria-invalid'); });
    delete errorFields[name];
    if (!Object.keys(errorFields).length) form.classList.remove('has-errors');
  }

  function value(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function validate() {
    var errors = {};
    var service = selectedService();
    if (!service) errors.dienst = 'Kies wat er moet gebeuren.';
    if (service === 'anders' && !value('anders__omschrijving')) errors.anders__omschrijving = 'Beschrijf kort wat er moet gebeuren.';
    if (value('naam').length < 2) errors.naam = 'Vul je naam in.';
    if (value('telefoon').replace(/\D/g, '').length < 9) errors.telefoon = 'Vul een geldig telefoonnummer in.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) errors.email = 'Vul een geldig e-mailadres in.';
    if (!/^\d{4}\s?[a-zA-Z]{2}$/.test(value('postcode'))) errors.postcode = 'Vul een geldige postcode in, bijv. 2651 BC.';
    if (value('plaats').length < 2) errors.plaats = 'Vul de plaats van de klus in.';
    return errors;
  }

  function showErrors(errors) {
    Object.keys(errors).forEach(function (name) { setError(name, errors[name]); });
    var firstName = Object.keys(errors)[0];
    var first = firstName && form.querySelector('[name="' + firstName + '"]');
    if (first) first.focus();
  }

  ['naam', 'telefoon', 'email', 'postcode', 'plaats', 'anders__omschrijving'].forEach(function (name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el) el.addEventListener('input', function () { if (errorFields[name]) clearError(name); });
  });

  /* 3d. Verzenden - succes pas na bevestiging van de server */
  function setSending(on) {
    form.classList.toggle('is-sending', on);
    submitBtn.disabled = on;
    submitLabel.textContent = on ? 'Versturen…' : 'Offerte aanvragen';
  }

  function showStatus(html) {
    status.innerHTML = html;
  }

  var telLink = document.querySelector('.form__note a');
  var fallbackContact = telLink ? ' Bel of app ons direct op <a href="' + telLink.getAttribute('href') + '">' + telLink.textContent + '</a>.' : '';

  form.addEventListener('submit', function (e) {
    if (!window.fetch || !window.FormData) return; // native verzending als fallback
    e.preventDefault();
    showStatus('');
    Object.keys(errorFields).forEach(clearError);

    var errors = validate();
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }

    setSending(true);
    Promise.all(photos.map(function (p) { return compress(p.file); })).then(function (files) {
      var total = files.reduce(function (sum, f) { return sum + f.size; }, 0);
      if (total > limitBytes) {
        setSending(false);
        setError('fotos', "De foto's zijn samen te groot (" + formatSize(total) + '). Verwijder een of meer foto\'s, of stuur ze na je aanvraag via WhatsApp.');
        fileInput.focus();
        return;
      }

      var data = new FormData(form);
      data.delete('fotos');
      files.forEach(function (f) { data.append('fotos', f, f.name); });

      return fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false }; }).then(function (json) {
          if (res.ok && json.ok) {
            // Echte bevestiging van de server → bedankpagina.
            window.location.assign(json.redirect || '/bedankt');
            return;
          }
          setSending(false);
          if (json.errors) {
            showErrors(json.errors);
            showStatus('Controleer de gemarkeerde velden.');
          } else {
            showStatus((json.error ? escapeHtml(json.error) : 'Je aanvraag kon niet worden verzonden.') + (json.error ? '' : fallbackContact));
          }
        });
      });
    }).catch(function () {
      setSending(false);
      showStatus('Er ging iets mis met de verbinding. Je aanvraag is niet verzonden.' + fallbackContact);
    });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
