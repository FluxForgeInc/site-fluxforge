// FluxForge — production site behaviour. Vanilla JS, no dependencies.
'use strict';

// Configure this to point at the API Gateway endpoint once it exists.
// Contact form backend: Web3Forms (https://web3forms.com). Set the public access
// key obtained for contacto@fluxforge.pt. While empty, the form falls back to a mailto: link.
window.FLUXFORGE_WEB3FORMS_KEY = '';
window.FLUXFORGE_FORM_ENDPOINT = 'https://api.web3forms.com/submit';

var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* i18n: current page language + user-facing strings                   */
/* ------------------------------------------------------------------ */
var LANG = (document.body && document.body.getAttribute('data-lang')) ||
  (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
if (LANG !== 'en') LANG = 'pt';

var STRINGS = {
  pt: {
    menuOpen: 'Abrir menu de navegação',
    menuClose: 'Fechar menu de navegação',
    carouselGoTo: function (i, n) { return 'Ir para testemunho ' + i + ' de ' + n; },
    submitting: 'A submeter pedido...',
    mailtoSubject: 'Pedido de contacto — ',
    mailtoLabels: {
      name: 'Nome',
      company: 'Empresa',
      role: 'Cargo',
      email: 'Email',
      phone: 'Telefone',
      companySize: 'Dimensão da empresa',
      interests: 'Áreas de interesse'
    },
    messageLabel: 'Mensagem',
    consentLabel: 'Consentimento RGPD'
  },
  en: {
    menuOpen: 'Open navigation menu',
    menuClose: 'Close navigation menu',
    carouselGoTo: function (i, n) { return 'Go to testimonial ' + i + ' of ' + n; },
    submitting: 'Submitting request...',
    mailtoSubject: 'Contact request — ',
    mailtoLabels: {
      name: 'Name',
      company: 'Company',
      role: 'Role',
      email: 'Email',
      phone: 'Phone',
      companySize: 'Company size',
      interests: 'Areas of interest'
    },
    messageLabel: 'Message',
    consentLabel: 'GDPR consent'
  }
};
var T = STRINGS[LANG];

/* ------------------------------------------------------------------ */
/* Language switcher: remember the visitor's choice                    */
/* ------------------------------------------------------------------ */
(function languageSwitcher() {
  var LANG_KEY = 'fluxforge_lang';

  // Persist the choice whenever a language-switch link is clicked, in the
  // header or footer, in either direction (pt -> en or en -> pt).
  document.querySelectorAll('a[hreflang]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = link.getAttribute('hreflang');
      try {
        if (target === 'en') window.localStorage.setItem(LANG_KEY, 'en');
        else if (target && target.indexOf('pt') === 0) window.localStorage.setItem(LANG_KEY, 'pt');
      } catch (err) { /* localStorage unavailable (private mode, etc.) — noop */ }
    });
  });

  // Only auto-redirect from the PT homepage, only for a real returning
  // visitor with a stored preference, never for crawlers/automation.
  if (window.location.pathname !== '/') return;
  if (navigator.webdriver) return;
  try {
    if (window.localStorage.getItem(LANG_KEY) === 'en') {
      window.location.replace('/en/');
    }
  } catch (err) { /* localStorage unavailable — noop, stay on page */ }
})();

/* ------------------------------------------------------------------ */
/* Mobile menu                                                         */
/* ------------------------------------------------------------------ */
(function mobileMenu() {
  var toggle = document.getElementById('mobile-menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  var iconOpen = toggle.querySelector('[data-icon-open]');
  var iconClose = toggle.querySelector('[data-icon-close]');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? T.menuClose : T.menuOpen);
    menu.classList.toggle('hidden', !open);
    if (iconOpen) iconOpen.classList.toggle('hidden', open);
    if (iconClose) iconClose.classList.toggle('hidden', !open);
    document.body.classList.toggle('overflow-hidden', open);
  }

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!isOpen);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Close the mobile menu when a nav link inside it is activated.
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
})();

/* ------------------------------------------------------------------ */
/* Testimonials carousel (homepage "Relatos")                          */
/* ------------------------------------------------------------------ */
(function testimonialCarousel() {
  var root = document.querySelector('[data-carousel]');
  if (!root) return;
  var track = root.querySelector('[data-carousel-track]');
  var slides = Array.prototype.slice.call(root.querySelectorAll('.testimonial-carousel__slide'));
  var dotsWrap = root.querySelector('[data-carousel-dots]');
  var prevBtn = document.getElementById('carousel-prev');
  var nextBtn = document.getElementById('carousel-next');
  if (!track || slides.length === 0) return;

  function perView() {
    return window.matchMedia('(min-width: 768px)').matches ? 2 : 1;
  }

  var pageCount = Math.max(1, Math.ceil(slides.length / perView()));
  var current = 0;

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (var i = 0; i < pageCount; i++) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'w-11 h-11 flex items-center justify-center';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', T.carouselGoTo(i + 1, pageCount));
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
      var dotMark = document.createElement('span');
      dotMark.className = 'w-2.5 h-2.5 rounded-full transition-colors ' + (i === current ? 'bg-primary-container' : 'bg-outline-variant');
      dotMark.setAttribute('aria-hidden', 'true');
      dot.appendChild(dotMark);
      dot.addEventListener('click', function (idx) {
        return function () { goTo(idx); };
      }(i));
      dotsWrap.appendChild(dot);
    }
  }

  function goTo(index) {
    current = Math.max(0, Math.min(pageCount - 1, index));
    var slideWidth = track.clientWidth;
    track.scrollTo({ left: current * slideWidth, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    buildDots();
    if (prevBtn) prevBtn.disabled = pageCount <= 1;
    if (nextBtn) nextBtn.disabled = pageCount <= 1;
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });

  // Keep dots in sync with native touch-swipe scrolling.
  var scrollTimer = null;
  track.addEventListener('scroll', function () {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var slideWidth = track.clientWidth || 1;
      var idx = Math.round(track.scrollLeft / slideWidth);
      if (idx !== current) {
        current = Math.max(0, Math.min(pageCount - 1, idx));
        buildDots();
      }
    }, 100);
  }, { passive: true });

  window.addEventListener('resize', function () {
    var newPageCount = Math.max(1, Math.ceil(slides.length / perView()));
    if (newPageCount !== pageCount) {
      pageCount = newPageCount;
      current = Math.min(current, pageCount - 1);
      buildDots();
    }
  });

  buildDots();
  if (prevBtn) prevBtn.disabled = pageCount <= 1;
  if (nextBtn) nextBtn.disabled = pageCount <= 1;
})();

/* ------------------------------------------------------------------ */
/* Copy-to-clipboard (contact page)                                     */
/* ------------------------------------------------------------------ */
(function copyToClipboard() {
  document.querySelectorAll('.js-copy-email').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      var done = function () {
        var icon = btn.querySelector('use');
        var original = icon ? icon.getAttribute('href') : null;
        if (icon) icon.setAttribute('href', '/assets/icons.svg#i-check');
        btn.classList.add('text-primary-container');
        setTimeout(function () {
          if (icon && original) icon.setAttribute('href', original);
          btn.classList.remove('text-primary-container');
        }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { /* noop */ }
        ta.remove();
      }
    });
  });
})();

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */
(function contactForm() {
  var form = document.getElementById('contact-qualification-form');
  if (!form) return;
  var submitBtn = document.getElementById('submit-btn');
  var successBanner = document.getElementById('form-success-banner');
  var errorBanner = document.getElementById('form-error-banner');

  function setBanner(el, show) {
    if (!el) return;
    el.classList.toggle('hidden', !show);
  }

  function collectPayload() {
    var data = new FormData(form);
    // Use the visible labels (not the internal option values) so the email reads naturally.
    var sizeSelect = form.querySelector('#company-size');
    var sizeLabel = sizeSelect && sizeSelect.selectedIndex >= 0 ? sizeSelect.options[sizeSelect.selectedIndex].text.trim() : (data.get('companySize') || '');
    var interests = [];
    form.querySelectorAll('input[name="interests"]:checked').forEach(function (cb) {
      var label = cb.closest('label');
      var text = label ? label.textContent.replace(/\s+/g, ' ').trim() : '';
      interests.push(text || cb.value);
    });
    return {
      fullName: data.get('fullName') || '',
      companyName: data.get('companyName') || '',
      role: data.get('role') || '',
      workEmail: data.get('workEmail') || '',
      phone: data.get('phone') || '',
      companySize: sizeLabel,
      interests: interests,
      message: data.get('message') || '',
      consent: form.querySelector('#privacy-consent') ? form.querySelector('#privacy-consent').checked : false,
      website: data.get('website') || '' // honeypot
    };
  }

  function mailtoFallback(payload) {
    var l = T.mailtoLabels;
    var lines = [
      l.name + ': ' + payload.fullName,
      l.company + ': ' + payload.companyName,
      l.role + ': ' + payload.role,
      l.email + ': ' + payload.workEmail,
      l.phone + ': ' + payload.phone,
      l.companySize + ': ' + payload.companySize,
      l.interests + ': ' + payload.interests.join(', '),
      '',
      payload.message
    ];
    var subject = encodeURIComponent(T.mailtoSubject + payload.companyName);
    var body = encodeURIComponent(lines.join('\n'));
    window.location.href = 'mailto:contacto@fluxforge.pt?subject=' + subject + '&body=' + body;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setBanner(successBanner, false);
    setBanner(errorBanner, false);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var payload = collectPayload();
    if (payload.website) return; // honeypot triggered: silently drop

    var accessKey = window.FLUXFORGE_WEB3FORMS_KEY;
    var endpoint = window.FLUXFORGE_FORM_ENDPOINT;
    var originalHTML = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-75', 'cursor-wait');
      submitBtn.innerHTML = '<svg class="icon text-[20px] animate-spin" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#i-refresh"></use></svg><span>' + T.submitting + '</span>';
    }

    function restoreButton() {
      if (!submitBtn) return;
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75', 'cursor-wait');
      submitBtn.innerHTML = originalHTML;
    }

    if (!accessKey || !endpoint) {
      // No backend configured yet: fall back to opening the user's email client.
      mailtoFallback(payload);
      restoreButton();
      setBanner(successBanner, true);
      form.reset();
      return;
    }

    // Web3Forms expects flat key/value fields; keys become the labels in the email.
    var l = T.mailtoLabels;
    var body = {
      access_key: accessKey,
      subject: T.mailtoSubject + payload.companyName,
      from_name: 'FluxForge Website',
      replyto: payload.workEmail,
      botcheck: payload.website
    };
    body[l.name] = payload.fullName;
    body[l.company] = payload.companyName;
    body[l.role] = payload.role;
    body[l.email] = payload.workEmail;
    body[l.phone] = payload.phone;
    body[l.companySize] = payload.companySize;
    body[l.interests] = payload.interests.join(', ');
    body[T.messageLabel || 'Message'] = payload.message;
    body[T.consentLabel || 'Consent'] = payload.consent ? 'yes' : 'no';
    body['Page'] = window.location.href;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok || json.success === false) throw new Error(json.message || ('Bad response: ' + res.status));
          return json;
        });
      })
      .then(function () {
        restoreButton();
        setBanner(successBanner, true);
        form.reset();
      })
      .catch(function () {
        restoreButton();
        setBanner(errorBanner, true);
      });
  });
})();

/* ------------------------------------------------------------------ */
/* Active nav link (fallback / redundancy to the build-time markup)    */
/* ------------------------------------------------------------------ */
(function activeNav() {
  var path = window.location.pathname;
  document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    if (href === path || (href !== '/' && path.indexOf(href) === 0)) {
      link.classList.add('text-primary-container', 'font-semibold');
      link.setAttribute('aria-current', 'page');
    }
  });
})();
