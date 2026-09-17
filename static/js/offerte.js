/* BEBO - offerte-wizard (alleen /offerte)
   Stappen: 01 Werk · 02 Details · 03 Foto's · 04 Gegevens · 05 Controle
   - Bestaande logica blijft: details per dienst, foto's (verkleinen, limieten),
     validatie, verzending met echte serverbevestiging.
   - Alle invoer blijft behouden bij Volgende/Terug/Wijzig (één formulier,
     stappen worden alleen getoond/verborgen; foto's staan in geheugen).
   - Zonder JS: één doorlopend formulier (CSS toont dan alle stappen). */

(function () {
  'use strict';

  var form = document.getElementById('quote-form');
  if (!form) return;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wizard = document.getElementById('formulier');
  root.classList.add('qz-on');

  var errorFields = {};
  var status = form.querySelector('.form__status');
  var submitBtn = form.querySelector('.form__submit');
  var submitLabel = form.querySelector('.form__submit-label');
  var detailSets = form.querySelectorAll('.form__details');
  var serviceRadios = form.querySelectorAll('input[name="dienst"]');

  /* ---------------------------------------------------------------------
     Details per dienst (ongewijzigde logica)
     --------------------------------------------------------------------- */
  function showDetails(service) {
    detailSets.forEach(function (fs) {
      var active = fs.getAttribute('data-for') === service;
      fs.classList.toggle('is-active', active);
      fs.disabled = !active; // uitgeschakelde velden worden niet meegestuurd
    });
    var empty = form.querySelector('[data-qz-no-service]');
    if (empty) empty.hidden = !!service;
  }
  function selectedService() {
    var checked = form.querySelector('input[name="dienst"]:checked');
    return checked ? checked.value : '';
  }
  function serviceInfo(id) {
    var input = form.querySelector('input[name="dienst"][value="' + id + '"]');
    if (!input) return null;
    var box = input.nextElementSibling;
    var t = box.querySelector('.qz-tile__t');
    var sp = box.querySelector('.qz-tile__s');
    return { title: t ? t.textContent.trim() : id, spec: sp ? sp.textContent.trim() : '' };
  }
  serviceRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      showDetails(r.value);
      clearError('dienst');
      updateSummary();
    });
  });

  // Gewenste uitvoerdatum niet in het verleden.
  var dateInput = form.querySelector('#datum');
  if (dateInput) {
    var today = new Date();
    dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  /* ---------------------------------------------------------------------
     Foto-upload (ongewijzigde logica + teller)
     --------------------------------------------------------------------- */
  var upload = document.getElementById('upload');
  var fileInput = document.getElementById('fotos');
  var list = upload ? upload.querySelector('.upload__list') : null;
  var countEl = form.querySelector('[data-qz-photo-count]');
  var maxPhotos = parseInt(form.dataset.maxPhotos, 10) || 10;
  var limitBytes = (parseFloat(form.dataset.uploadLimitMb) || 4) * 1024 * 1024;
  var photos = []; // { id, file, url }
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
    if (countEl) {
      countEl.textContent = photos.length
        ? photos.length + ' van max. ' + maxPhotos + " foto's geselecteerd"
        : '';
    }
    upload.classList.toggle('has-photos', photos.length > 0);
    updateSummary();
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
    else if (rejected) setError('fotos', "Alleen JPG, PNG of HEIC-foto's zijn mogelijk.");
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
  }

  /* Verklein JPG/PNG in de browser (max. 2000 px, JPEG 82%). HEIC gaat ongewijzigd mee. */
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

  /* ---------------------------------------------------------------------
     Validatie
     --------------------------------------------------------------------- */
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

  // Welke stap hoort bij een veld (voor serverfouten en eindcontrole).
  function stepForField(name) {
    if (name === 'dienst') return 0;
    if (name.indexOf('__') > 0) return 1;
    if (name === 'fotos') return 2;
    return 3;
  }

  // Validatie per stap; dezelfde regels als de server.
  function validateStep(i) {
    var errors = {};
    if (i === 0) {
      if (!selectedService()) errors.dienst = 'Kies wat er moet gebeuren.';
    } else if (i === 1) {
      if (selectedService() === 'anders' && !value('anders__omschrijving')) {
        errors.anders__omschrijving = 'Beschrijf kort wat er moet gebeuren.';
      }
    } else if (i === 3) {
      if (value('naam').length < 2) errors.naam = 'Vul je naam in.';
      if (value('telefoon').replace(/\D/g, '').length < 9) errors.telefoon = 'Vul een geldig telefoonnummer in.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) errors.email = 'Vul een geldig e-mailadres in.';
      if (!/^\d{4}\s?[a-zA-Z]{2}$/.test(value('postcode'))) errors.postcode = 'Vul een geldige postcode in, bijv. 2651 BC.';
      if (value('plaats').length < 2) errors.plaats = 'Vul de plaats van de klus in.';
    }
    return errors;
  }

  function showErrors(errors) {
    Object.keys(errors).forEach(function (name) { setError(name, errors[name]); });
    var firstName = Object.keys(errors)[0];
    var first = firstName && form.querySelector('[name="' + firstName + '"]:not([disabled])');
    if (first) {
      first.focus({ preventScroll: true });
      var box = first.closest('.field, fieldset') || first;
      box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }

  ['naam', 'telefoon', 'email', 'postcode', 'plaats', 'anders__omschrijving'].forEach(function (name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el) el.addEventListener('input', function () { if (errorFields[name]) clearError(name); });
  });

  /* ---------------------------------------------------------------------
     Wizard: stappen, voortgang, navigatie
     --------------------------------------------------------------------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll('[data-qz-step]'));
  var progressItems = Array.prototype.slice.call(document.querySelectorAll('[data-qz-progress]'));
  var backBtn = form.querySelector('[data-qz-back]');
  var nextBtn = form.querySelector('[data-qz-next]');
  var summaryEl = form.querySelector('[data-qz-summary]');
  var meterNow = document.querySelector('[data-qz-current]');
  var meterLabel = document.querySelector('[data-qz-current-label]');
  var LAST = steps.length - 1;
  var current = 0;
  var reached = 0; // verste stap die al bereikt is

  function scrollToWizard() {
    var top = wizard.getBoundingClientRect().top;
    var navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
    if (top < 0 || top > window.innerHeight * 0.4) {
      window.scrollTo({ top: window.scrollY + top - navH - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function goTo(i, opts) {
    opts = opts || {};
    if (i < 0 || i > LAST) return;
    if (i === LAST) buildReview();
    var prev = current;
    current = i;
    reached = Math.max(reached, i);
    steps.forEach(function (s, n) {
      var on = n === i;
      s.classList.toggle('is-current', on);
      s.classList.remove('is-enter-fwd', 'is-enter-back');
      if (on && prev !== i && !reduceMotion) {
        void s.offsetWidth;
        s.classList.add(i > prev ? 'is-enter-fwd' : 'is-enter-back');
      }
    });
    progressItems.forEach(function (li, n) {
      li.classList.toggle('is-current', n === i);
      li.classList.toggle('is-done', n < i || (n <= reached && n !== i && n < reached));
      var btn = li.querySelector('button');
      // Terug kan altijd; vooruit tot één stap na de verst bereikte stap
      // (tryAdvance valideert de tussenliggende stappen).
      btn.disabled = n > reached + 1;
      if (n === i) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    wizard.style.setProperty('--qz-progress', (i / steps.length)); // markering van stap i staat op i/5 van de balk
    if (meterNow) meterNow.textContent = String(i + 1);
    if (meterLabel) meterLabel.textContent = steps[i].getAttribute('data-qz-label');
    backBtn.hidden = i === 0;
    nextBtn.hidden = i === LAST;
    submitBtn.hidden = i !== LAST;
    status.innerHTML = '';
    updateSummary();
    if (!opts.silent) {
      scrollToWizard();
      var heading = steps[i].querySelector('.qz-step__title');
      if (opts.focus) {
        var target = form.querySelector(opts.focus);
        (target || heading).focus({ preventScroll: true });
      } else if (heading) {
        heading.focus({ preventScroll: true });
      }
    }
  }

  // Vooruit: eerst de huidige stap valideren. Bij springen via de voortgangsbalk
  // worden ook de tussenliggende stappen gecontroleerd.
  function tryAdvance(to) {
    for (var s = current; s < to; s++) {
      var errors = validateStep(s);
      if (Object.keys(errors).length) {
        if (s !== current) goTo(s, { silent: true });
        showErrors(errors);
        return false;
      }
    }
    goTo(to);
    return true;
  }

  nextBtn.addEventListener('click', function () { tryAdvance(current + 1); });
  backBtn.addEventListener('click', function () { goTo(current - 1); });
  document.querySelectorAll('[data-qz-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var to = parseInt(btn.getAttribute('data-qz-goto'), 10);
      if (to < current) goTo(to); else if (to > current) tryAdvance(to);
    });
  });

  // Live samenvatting in de navigatie (Wizard 4)
  function updateSummary() {
    if (!summaryEl) return;
    var parts = [];
    var info = serviceInfo(selectedService());
    if (info) parts.push(info.title);
    if (photos.length) parts.push(photos.length + (photos.length === 1 ? ' foto' : " foto's"));
    summaryEl.textContent = parts.join(' · ');
  }

  /* ---------------------------------------------------------------------
     05 Controle (Wizard 5)
     --------------------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Zelfde notatie als de server: "2651 BC".
  function formatPostcode(v) {
    var pc = String(v || '').replace(/\s+/g, '').toUpperCase();
    return /^\d{4}[A-Z]{2}$/.test(pc) ? pc.slice(0, 4) + ' ' + pc.slice(4) : String(v || '').trim();
  }
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function detailRows() {
    var fs = form.querySelector('.form__details.is-active');
    if (!fs) return [];
    var rows = [];
    fs.querySelectorAll('[data-qz-field]').forEach(function (wrap) {
      var label = wrap.getAttribute('data-qz-field');
      var val = '';
      var radio = wrap.querySelector('input[type="radio"]:checked');
      var input = wrap.querySelector('input:not([type="radio"]), textarea');
      if (radio) val = radio.value;
      else if (input) val = input.value.trim();
      if (val) rows.push([label, val]);
    });
    return rows;
  }

  function section(title, step, rowsHtml, focusSel) {
    return '<div class="qz-review__sec">' +
      '<div class="qz-review__head"><h3 class="qz-review__title"><span>' + String(step + 1).padStart(2, '0') + '</span>' + esc(title) + '</h3>' +
      '<button type="button" class="qz-review__edit" data-qz-edit="' + step + '"' + (focusSel ? ' data-qz-focus="' + esc(focusSel) + '"' : '') +
      '>Wijzig<span class="visually-hidden"> ' + esc(title.toLowerCase()) + '</span></button></div>' +
      '<div class="qz-review__content">' + rowsHtml + '</div></div>';
  }
  function dl(rows) {
    if (!rows.length) return '<p class="qz-review__empty">Niet ingevuld</p>';
    return '<dl class="qz-review__dl">' + rows.map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function buildReview() {
    var review = form.querySelector('[data-qz-review]');
    var info = serviceInfo(selectedService());
    var html = '';
    html += section('Werkzaamheid', 0,
      info ? '<p class="qz-review__big">' + esc(info.title) + (info.spec ? ' <span>' + esc(info.spec) + '</span>' : '') + '</p>' : dl([]),
      'input[name="dienst"]:checked');
    html += section('Details', 1, dl(detailRows()));
    var photoHtml = photos.length
      ? '<p class="qz-review__line">' + photos.length + (photos.length === 1 ? ' foto' : " foto's") + '</p><ul class="qz-review__thumbs">' +
        photos.map(function (p) { return '<li><img src="' + p.url + '" alt="" onerror="this.parentNode.textContent=\'' + (/\.(heic|heif)$/i.test(p.file.name) ? 'HEIC' : 'FOTO') + '\'"></li>'; }).join('') + '</ul>'
      : '<p class="qz-review__empty">Geen foto\'s toegevoegd</p>';
    html += section("Foto's", 2, photoHtml);
    var loc = [];
    if (value('postcode') || value('plaats')) loc.push(['Adres', [formatPostcode(value('postcode')), value('plaats')].filter(Boolean).join(' ')]);
    if (value('datum')) loc.push(['Gewenste datum', formatDate(value('datum'))]);
    html += section('Locatie', 3, dl(loc), '#postcode');
    var contact = [['Naam', value('naam')], ['Bedrijf', value('bedrijf')], ['Telefoon', value('telefoon')], ['E-mail', value('email')]]
      .filter(function (r) { return r[1]; });
    if (value('toelichting')) contact.push(['Toelichting', value('toelichting')]);
    html += section('Contact', 3, dl(contact), '#naam');
    review.innerHTML = html;
    review.querySelectorAll('[data-qz-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goTo(parseInt(btn.getAttribute('data-qz-edit'), 10), { focus: btn.getAttribute('data-qz-focus') });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Verzenden - succes pas na bevestiging van de server
     --------------------------------------------------------------------- */
  function setSending(on, label) {
    form.classList.toggle('is-sending', on);
    submitBtn.disabled = on;
    backBtn.disabled = on;
    submitLabel.textContent = on ? (label || 'Versturen…') : 'Offerte aanvragen';
  }
  function showStatus(html) { status.innerHTML = html; }

  var fallbackContact = (function () {
    var tel = document.querySelector('.qz-contact a[href^="tel:"]');
    return tel ? ' Bel of app ons direct op <a href="' + tel.getAttribute('href') + '">' + esc(tel.textContent.replace(/Bel direct/i, '').trim()) + '</a>.' : '';
  })();

  function showDone(json) {
    var done = document.querySelector('[data-qz-done]');
    var info = serviceInfo(selectedService());
    var rows = [];
    if (json.reference) rows.push(['Referentie', json.reference]);
    if (info) rows.push(['Werkzaamheid', info.title]);
    rows.push(['Locatie', [formatPostcode(value('postcode')), value('plaats')].filter(Boolean).join(' ')]);
    rows.push(["Foto's", photos.length ? String(photos.length) : 'Geen']);
    done.querySelector('[data-qz-done-summary]').innerHTML = rows.map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('');
    form.hidden = true;
    document.querySelector('.qz-progress').hidden = true;
    done.hidden = false;
    root.classList.add('qz-finished');
    scrollToWizard();
    done.querySelector('[data-qz-done-title]').focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    // Enter in een veld vóór de laatste stap = volgende stap, niet verzenden.
    if (current < LAST) {
      e.preventDefault();
      tryAdvance(current + 1);
      return;
    }
    if (!window.fetch || !window.FormData) return; // native verzending als fallback
    e.preventDefault();
    showStatus('');
    Object.keys(errorFields).forEach(clearError);

    // Volledige controle; ga naar de eerste stap met een fout.
    for (var s = 0; s < LAST; s++) {
      var errors = validateStep(s);
      if (Object.keys(errors).length) {
        goTo(s, { silent: true });
        scrollToWizard();
        showErrors(errors);
        return;
      }
    }

    setSending(true, photos.length ? "Foto's voorbereiden…" : 'Versturen…');
    Promise.all(photos.map(function (p) { return compress(p.file); })).then(function (files) {
      var total = files.reduce(function (sum, f) { return sum + f.size; }, 0);
      if (total > limitBytes) {
        setSending(false);
        goTo(2, { silent: true });
        scrollToWizard();
        setError('fotos', "De foto's zijn samen te groot (" + formatSize(total) + "). Verwijder een of meer foto's, of stuur ze na je aanvraag via WhatsApp.");
        fileInput.focus({ preventScroll: true });
        return;
      }

      setSending(true, 'Versturen…');
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
          setSending(false);
          if (res.ok && json.ok) {
            showDone(json); // echte bevestiging van de server
            return;
          }
          if (json.errors) {
            var names = Object.keys(json.errors);
            var step = Math.min.apply(null, names.map(stepForField));
            goTo(step, { silent: true });
            scrollToWizard();
            showErrors(json.errors);
            showStatus('Controleer de gemarkeerde velden.');
          } else {
            showStatus((json.error ? esc(json.error) : 'Je aanvraag kon niet worden verzonden.') + (json.error ? '' : fallbackContact));
          }
        });
      });
    }).catch(function () {
      setSending(false);
      showStatus('Er ging iets mis met de verbinding. Je aanvraag is niet verzonden.' + fallbackContact);
    });
  });

  /* ---------------------------------------------------------------------
     Start
     --------------------------------------------------------------------- */
  showDetails(selectedService());
  if (form.dataset.preselect) {
    var pre = form.querySelector('input[name="dienst"][value="' + form.dataset.preselect + '"]');
    if (pre) { pre.checked = true; showDetails(pre.value); }
  }
  renderPhotos();
  goTo(0, { silent: true });
})();
