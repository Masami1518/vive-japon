/* Vive Japón — step form that submits to the Google Form (responses, sheet and email alerts stay in Google) */
(function () {
  var D = window.VJ_PLAN;
  var lang = document.documentElement.lang || 'es';
  var F = D[lang], ui = F.ui;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var OTHER = '__other_option__';
  var IMG = function (key, w) { return D.photos[key] + '?auto=format&fit=crop&w=' + (w || 1400) + '&q=70'; };

  var ans = {};      // entry -> string | string[]
  var other = {};    // entry -> text typed in "Other"
  var cur = 0;       // index inside path()

  var stage = $('.stage'), sheet = $('.sheet-inner'), bodyEl = $('.step-body');
  var countEl = $('.count'), introEl = $('.intro');
  var btnBack = $('[data-back]'), btnNext = $('[data-next]'), sendErr = $('.send-err');
  var navbar = $('.navbar');

  /* which purpose was picked: 0 study, 1 travel, 2 both, -1 none */
  function purposeIdx() {
    var pf = F.steps[1].fields[0];
    return pf.choices.indexOf(ans[pf.entry]);
  }
  function wantsTravelAfterStudy() {
    return purposeIdx() === 2 || ans[F.alsoTravelEntry] === F.alsoTravelYes;
  }
  function path() {
    var p = purposeIdx();
    return F.steps.filter(function (s) {
      if (s.branch === 'all') return true;
      if (s.branch === 'study') return p === 0 || p === 2;
      if (s.branch === 'travel') return p === 1 || (p !== -1 && p !== 1 && wantsTravelAfterStudy());
    });
  }

  /* ---------- rendering ---------- */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) { if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]); }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function field(f, step) {
    var id = 'q' + f.entry;
    // in "both" mode the "also travel?" question is answered for the visitor
    if (f.entry === F.alsoTravelEntry && purposeIdx() === 2) { ans[f.entry] = F.alsoTravelYes; return null; }
    var opt = f.req ? '' : '<span class="opt">(' + ui.optional + ')</span>';
    var help = f.help ? '<span class="help" id="' + id + 'h">' + esc(f.help) + '</span>' : '';
    var err = '<p class="err" id="' + id + 'e" role="alert"></p>';
    var wrap;

    if (f.t === 0 || f.t === 1) {
      wrap = el('div', { class: 'q', 'data-entry': f.entry });
      var isEmail = /mail/i.test(f.title) || /メール/.test(f.title);
      var isTel = /whatsapp/i.test(f.title);
      var input = f.t === 1
        ? '<textarea id="' + id + '" ' + (help ? 'aria-describedby="' + id + 'h"' : '') + '></textarea>'
        : '<input id="' + id + '" type="' + (isEmail ? 'email' : isTel ? 'tel' : 'text') + '" ' +
          (isEmail ? 'autocomplete="email" ' : isTel ? 'autocomplete="tel" ' : (step.id === 'you' && f === step.fields[0]) ? 'autocomplete="name" ' : '') +
          (help ? 'aria-describedby="' + id + 'h"' : '') + '>';
      wrap.innerHTML = '<label class="lbl" for="' + id + '">' + esc(f.title) + opt + '</label>' + help + input + err;
      var inp = $('input,textarea', wrap);
      inp.value = ans[f.entry] || '';
      inp.addEventListener('input', function () { ans[f.entry] = inp.value; clearErr(wrap); });
      return wrap;
    }

    var multi = f.t === 4;
    wrap = el('fieldset', { class: 'q' + (/privac|個人情報/i.test(f.title) ? ' consent' : ''), 'data-entry': f.entry });
    var html = '<legend>' + esc(f.title) + opt + '</legend>' + help;

    if (step.id === 'purpose') {
      html += '<div class="paths">' + f.choices.map(function (c, i) {
        return '<label class="path"><input type="radio" name="' + id + '" value="' + esc(c) + '"' + (ans[f.entry] === c ? ' checked' : '') + '>' +
          '<span class="card"><img src="' + IMG(D.purposePhotos[i], 700) + '" alt=""><b>' + esc(c) + '</b></span></label>';
      }).join('') + '</div>';
    } else {
      var chosen = ans[f.entry] || (multi ? [] : '');
      var choices = f.choices.slice();
      html += '<div class="chips">' + choices.map(function (c) {
        var on = multi ? chosen.indexOf(c) > -1 : chosen === c;
        return '<label class="chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + id + '" value="' + esc(c) + '"' + (on ? ' checked' : '') + '><span>' + esc(c) + '</span></label>';
      }).join('');
      if (f.other) {
        var oOn = multi ? chosen.indexOf(OTHER) > -1 : chosen === OTHER;
        html += '<label class="chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + id + '" value="' + OTHER + '"' + (oOn ? ' checked' : '') + '><span>' + ui.other + '</span></label>';
      }
      html += '</div>';
      if (f.other) html += '<input type="text" class="other-input" aria-label="' + esc(f.title) + ' — ' + ui.other + '">';
    }
    wrap.innerHTML = html + err;

    var oin = $('.other-input', wrap);
    if (oin) { oin.value = other[f.entry] || ''; oin.addEventListener('input', function () { other[f.entry] = oin.value; }); }
    function sync() {
      var picked = [].slice.call(wrap.querySelectorAll('input[name="' + id + '"]:checked')).map(function (i) { return i.value; });
      ans[f.entry] = multi ? picked : (picked[0] || '');
      if (oin) {
        var on = picked.indexOf(OTHER) > -1;
        oin.classList.toggle('on', on);
        if (on && document.activeElement && document.activeElement.value === OTHER) oin.focus();
      }
      clearErr(wrap);
      if (step.id === 'purpose' || f.entry === F.alsoTravelEntry) paintProgress();
    }
    wrap.addEventListener('change', sync);
    if (oin) oin.classList.toggle('on', multi ? (ans[f.entry] || []).indexOf(OTHER) > -1 : ans[f.entry] === OTHER);
    return wrap;
  }

  function paintProgress() {
    var p = path(), prog = $('.progress');
    // before the visitor picks study/travel, show the shortest path length (6)
    prog.style.setProperty('--panels', p.length);
    prog.innerHTML = p.map(function (s, i) { return '<span class="' + (i < cur ? 'done' : i === cur ? 'now' : '') + '"></span>'; }).join('');
    countEl.textContent = ui.step + ' ' + (cur + 1) + ' ' + ui.of + ' ' + p.length;
  }

  function show(i, dir) {
    var p = path(); cur = i;
    var s = p[i];
    // stage photo
    var fig = el('figure', { class: reduce ? '' : 'enter' }, '<img src="' + IMG(s.photo, 1600) + '" alt="">');
    var old = stage.querySelectorAll('figure');
    stage.insertBefore(fig, $('.progress'));
    setTimeout(function () { [].forEach.call(old, function (o) { o.remove(); }); }, reduce ? 0 : 1000);
    var copy = $('.stage-copy');
    copy.classList.remove('enter'); void copy.offsetWidth; if (!reduce) copy.classList.add('enter');
    $('.no b', copy).textContent = 'No.' + String(i + 1).padStart(2, '0');
    $('.no small', copy).textContent = s.caption;
    $('h1', copy).textContent = s.title;
    introEl.textContent = s.intro;
    // fields
    bodyEl.innerHTML = '';
    s.fields.forEach(function (f) { var w = field(f, s); if (w) bodyEl.appendChild(w); });
    bodyEl.classList.remove('enter'); void bodyEl.offsetWidth; if (!reduce) bodyEl.classList.add('enter');
    btnBack.hidden = i === 0;
    btnNext.innerHTML = (i === p.length - 1 ? ui.submit : ui.next) + ' <svg aria-hidden="true"><use href="#i-arrow"/></svg>';
    sendErr.textContent = '';
    paintProgress();
    if (dir) {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var first = bodyEl.querySelector('input,textarea');
      if (first && window.innerWidth >= 960) first.focus({ preventScroll: true });
    }
    try { history.replaceState(null, '', '#' + s.id); } catch (e) {}
  }

  /* ---------- validation ---------- */
  function setErr(wrap, msg) { wrap.setAttribute('aria-invalid', 'true'); $('.err', wrap).textContent = msg; }
  function clearErr(wrap) { wrap.removeAttribute('aria-invalid'); var e = $('.err', wrap); if (e) e.textContent = ''; }
  function validate() {
    var s = path()[cur], bad = null;
    s.fields.forEach(function (f) {
      var wrap = bodyEl.querySelector('[data-entry="' + f.entry + '"]');
      if (!wrap) return;
      var v = ans[f.entry];
      var empty = Array.isArray(v) ? v.length === 0 : !String(v || '').trim();
      if (!empty && (Array.isArray(v) ? v.indexOf(OTHER) > -1 : v === OTHER) && !String(other[f.entry] || '').trim()) empty = true;
      if (f.req && empty) { setErr(wrap, ui.errRequired); bad = bad || wrap; return; }
      var inp = wrap.querySelector('input[type="email"]');
      if (inp && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr(wrap, ui.errEmail); bad = bad || wrap; }
    });
    if (bad) {
      bad.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      var f = bad.querySelector('input,textarea'); if (f) f.focus({ preventScroll: true });
    }
    return !bad;
  }

  /* ---------- submit to Google Forms ---------- */
  function submit() {
    var p = path(), params = new URLSearchParams(), pages = {};
    p.forEach(function (s) {
      pages[s.page] = 1;
      s.fields.forEach(function (f) {
        var v = ans[f.entry];
        if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return;
        [].concat(v).forEach(function (x) { params.append('entry.' + f.entry, x); });
        if ([].concat(v).indexOf(OTHER) > -1) params.append('entry.' + f.entry + '.other_option_response', other[f.entry] || '');
      });
    });
    params.append('pageHistory', Object.keys(pages).sort(function (a, b) { return a - b; }).join(','));
    btnNext.disabled = true; btnBack.disabled = true;
    btnNext.textContent = ui.sending;
    return fetch(F.action, { method: 'POST', mode: 'no-cors', body: params })
      .then(done)
      .catch(function () {
        sendErr.textContent = ui.errSend;
        btnNext.disabled = false; btnBack.disabled = false;
        btnNext.innerHTML = ui.submit + ' <svg aria-hidden="true"><use href="#i-arrow"/></svg>';
      });
  }

  function done() {
    var wa = atob(D.wa);
    var copy = $('.stage-copy');
    $('h1', copy).textContent = ui.doneStage;
    $('.no b', copy).textContent = 'Vive Japón';
    $('.no small', copy).textContent = '';
    $('.progress').innerHTML = path().map(function () { return '<span class="done"></span>'; }).join('');
    sheet.innerHTML = '<div class="done step-body' + (reduce ? '' : ' enter') + '"><div class="stamp" aria-hidden="true">Vive<br>Japón</div>' +
      '<h2>' + esc(ui.doneTitle) + '</h2><p class="intro">' + esc(ui.doneText) + '</p>' +
      '<div class="actions"><a class="btn btn-wa" href="' + wa + '" target="_blank" rel="noopener">' + esc(ui.doneWa) +
      ' <svg aria-hidden="true"><use href="#i-arrow"/></svg></a><a class="btn btn-ghost" href="../">' + esc(ui.doneBack) + '</a></div></div>';
    navbar.remove();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', '#gracias'); } catch (e) {}
  }

  /* ---------- wiring ---------- */
  btnNext.addEventListener('click', function () {
    if (!validate()) return;
    var p = path();
    if (cur === p.length - 1) submit(); else show(cur + 1, 1);
  });
  btnBack.addEventListener('click', function () { if (cur > 0) show(cur - 1, -1); });
  document.title = ui.title;
  show(0);
})();
