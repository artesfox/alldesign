/* All Design Cocinas – comportamiento general (menú y formulario de contacto) */
(function () {
  'use strict';

  /* ---------- Menú móvil ---------- */
  var boton = document.querySelector('.menu-boton');
  var cuerpo = document.body;
  function cerrarMenu() {
    cuerpo.classList.remove('menu-abierto');
    if (boton) { boton.setAttribute('aria-expanded', 'false'); boton.setAttribute('aria-label', 'Abrir menú'); }
  }
  if (boton) {
    boton.addEventListener('click', function () {
      var abrir = !cuerpo.classList.contains('menu-abierto');
      cuerpo.classList.toggle('menu-abierto', abrir);
      boton.setAttribute('aria-expanded', String(abrir));
      boton.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { cerrarMenu(); cerrarSubmenus(); } });
  window.matchMedia('(min-width: 981px)').addEventListener('change', function (e) { if (e.matches) cerrarMenu(); });

  /* ---------- Submenú "All design cocinas" ---------- */
  var grupos = document.querySelectorAll('.menu__grupo');
  function cerrarSubmenus(excepto) {
    grupos.forEach(function (g) {
      if (g === excepto) return;
      g.classList.remove('abierto');
      g.querySelector('.menu__desplegar').setAttribute('aria-expanded', 'false');
    });
  }
  grupos.forEach(function (g) {
    var b = g.querySelector('.menu__desplegar');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = !g.classList.contains('abierto');
      cerrarSubmenus(g);
      g.classList.toggle('abierto', abrir);
      b.setAttribute('aria-expanded', String(abrir));
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu__grupo')) cerrarSubmenus();
  });

  /* ---------- Formulario de contacto → WhatsApp ---------- */
  var form = document.querySelector('[data-formulario-whatsapp]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var texto = 'Hola! Escribo desde la página web.\n\n' +
        '*Nombre:* ' + d.get('nombre') + '\n' +
        '*Teléfono:* ' + d.get('telefono') + '\n' +
        (d.get('correo') ? '*Correo:* ' + d.get('correo') + '\n' : '') +
        '*Mensaje:* ' + d.get('mensaje');
      var numero = form.getAttribute('data-formulario-whatsapp');
      if (numero.indexOf('57') !== 0) numero = '57' + numero;
      window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });
  }
})();
