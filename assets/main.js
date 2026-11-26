/* Vive Japón — small, dependency-free behaviour */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var lang = root.getAttribute('lang') || 'es';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* buttons open the on-site step form (plan/), which posts into the Google Form */
  document.querySelectorAll('[data-form]').forEach(function (a) { a.href = 'plan/'; });

  /* 2. Header turns solid after the hero */
  var top = document.querySelector('.top');
  var hero = document.querySelector('.hero');
  if (top && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      top.classList.toggle('is-solid', !e[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  }

  /* 3. Reveal: noren hang-in, photo frames, text fades */
  var targets = document.querySelectorAll('[data-hang], .reveal, .fade');
  if (!('IntersectionObserver' in window) || reduce) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* 4. Hero crossfade with numbered caption */
  var slides = document.querySelectorAll('.hero-slides figure');
  var capNo = document.querySelector('[data-cap-no]');
  var capTx = document.querySelector('[data-cap-tx]');
  var bar = document.querySelector('.hero-bar i');
  if (slides.length > 1) {
    var i = 0, dur = 6000;
    var show = function (n) {
      slides[i].classList.remove('is-on');
      i = n;
      slides[i].classList.add('is-on');
      if (capNo) capNo.textContent = slides[i].dataset.no;
      if (capTx) capTx.textContent = slides[i].dataset.place;
      if (bar && !reduce) {
        bar.style.transition = 'none'; bar.style.width = '0';
        void bar.offsetWidth;
        bar.style.transition = 'width ' + dur + 'ms linear'; bar.style.width = '100%';
      }
    };
    show(0);
    if (!reduce) {
      setInterval(function () {
        if (!document.hidden) show((i + 1) % slides.length);
      }, dur);
    }
  }
})();
