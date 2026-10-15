/* All Design Cocinas – carrusel de inicio, galerías de producto (Swiper) y visor de fotos.
   El visor (lightbox) es propio y liviano: reemplaza a Magnific Popup, que necesitaba jQuery. */
(function () {
  'use strict';

  /* ================= Swiper ================= */
  function iniciarSwiper() {
    if (typeof window.Swiper !== 'function') return;

    // Carrusel de inicio: 3 fotos por vista en escritorio, automático y en bucle
    document.querySelectorAll('[data-carrusel-inicio] .swiper').forEach(function (el) {
      new window.Swiper(el, {
        slidesPerView: 1.25,
        spaceBetween: 10,
        loop: true,
        speed: 600,
        autoplay: { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true },
        navigation: { nextEl: el.querySelector('.swiper-button-next'), prevEl: el.querySelector('.swiper-button-prev') },
        breakpoints: { 480: { slidesPerView: 2 }, 768: { slidesPerView: 3 } },
      });
    });

    // Galería de detalle con miniaturas
    document.querySelectorAll('[data-galeria]').forEach(function (cont) {
      var principal = cont.querySelector('.galeria-principal');
      var mini = cont.querySelector('.miniaturas-fx-galeria');
      var miniaturas = null;
      if (mini) {
        miniaturas = new window.Swiper(mini, {
          spaceBetween: 10,
          slidesPerView: 4,
          freeMode: true,
          watchSlidesProgress: true,
          navigation: { nextEl: mini.querySelector('.mini-next'), prevEl: mini.querySelector('.mini-prev') },
        });
      }
      new window.Swiper(principal, {
        spaceBetween: 10,
        speed: 500,
        navigation: { nextEl: principal.querySelector('.swiper-button-next'), prevEl: principal.querySelector('.swiper-button-prev') },
        thumbs: miniaturas ? { swiper: miniaturas } : undefined,
        keyboard: { enabled: true, onlyInViewport: true },
      });
    });
  }

  /* ================= Visor de fotos (lightbox) ================= */
  var visor, imgVisor, contador, grupoActual = [], indice = 0, ultimoFoco = null;

  function crearVisor() {
    visor = document.createElement('div');
    visor.className = 'visor';
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-modal', 'true');
    visor.setAttribute('aria-label', 'Visor de fotos');
    visor.innerHTML =
      '<button class="visor__cerrar" type="button" aria-label="Cerrar">×</button>' +
      '<button class="visor__flecha visor__flecha--prev" type="button" aria-label="Foto anterior">‹</button>' +
      '<figure class="visor__figura"><img alt="" /><figcaption class="visor__contador"></figcaption></figure>' +
      '<button class="visor__flecha visor__flecha--next" type="button" aria-label="Foto siguiente">›</button>';
    document.body.appendChild(visor);
    imgVisor = visor.querySelector('img');
    contador = visor.querySelector('.visor__contador');

    visor.querySelector('.visor__cerrar').addEventListener('click', cerrar);
    visor.querySelector('.visor__flecha--prev').addEventListener('click', function () { mover(-1); });
    visor.querySelector('.visor__flecha--next').addEventListener('click', function () { mover(1); });
    visor.addEventListener('click', function (e) { if (e.target === visor || e.target.classList.contains('visor__figura')) cerrar(); });

    // Deslizar con el dedo
    var x0 = null;
    visor.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  function mostrar() {
    var a = grupoActual[indice];
    visor.classList.add('cargando');
    imgVisor.onload = function () { visor.classList.remove('cargando'); };
    imgVisor.src = a.getAttribute('href');
    imgVisor.alt = a.getAttribute('data-titulo') || '';
    contador.textContent = grupoActual.length > 1 ? (indice + 1) + ' / ' + grupoActual.length : '';
    visor.classList.toggle('visor--una', grupoActual.length < 2);
  }
  function mover(paso) {
    indice = (indice + paso + grupoActual.length) % grupoActual.length;
    mostrar();
  }
  function abrir(enlace) {
    if (!visor) crearVisor();
    var grupo = enlace.getAttribute('data-lightbox');
    // Sin duplicados (el carrusel en bucle clona diapositivas)
    var vistos = {};
    grupoActual = Array.prototype.filter.call(document.querySelectorAll('[data-lightbox="' + grupo + '"]'), function (a) {
      var h = a.getAttribute('href');
      if (vistos[h]) return false;
      vistos[h] = true; return true;
    });
    indice = Math.max(0, grupoActual.findIndex(function (a) { return a.getAttribute('href') === enlace.getAttribute('href'); }));
    ultimoFoco = document.activeElement;
    mostrar();
    document.body.classList.add('visor-abierto');
    requestAnimationFrame(function () { visor.classList.add('visible'); });
    visor.querySelector('.visor__cerrar').focus();
  }
  function cerrar() {
    visor.classList.remove('visible');
    document.body.classList.remove('visor-abierto');
    if (ultimoFoco) ultimoFoco.focus();
  }

  document.addEventListener('click', function (e) {
    var enlace = e.target.closest('[data-lightbox]');
    if (!enlace) return;
    e.preventDefault();
    abrir(enlace);
  });
  document.addEventListener('keydown', function (e) {
    if (!visor || !visor.classList.contains('visible')) return;
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowRight') mover(1);
    if (e.key === 'ArrowLeft') mover(-1);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarSwiper);
  else iniciarSwiper();
})();
