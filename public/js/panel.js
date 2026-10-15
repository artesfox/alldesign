/* Panel de administración – All Design Cocinas
   Editor de texto, fotos (comprimidas en el navegador), guardar, borrar e instalar. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ================= Avisos ================= */
  function aviso(texto, tipo) {
    var cont = $('.avisos');
    if (!cont) return alert(texto);
    var el = document.createElement('div');
    el.className = 'aviso aviso--' + (tipo || 'ok');
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    el.textContent = texto;
    cont.appendChild(el);
    setTimeout(function () { el.classList.add('sale'); setTimeout(function () { el.remove(); }, 320); }, tipo === 'error' ? 6000 : 3200);
  }
  // Mensaje pendiente tras redirigir
  try {
    var pendiente = sessionStorage.getItem('aviso');
    if (pendiente) { sessionStorage.removeItem('aviso'); aviso(pendiente, 'ok'); }
  } catch (e) { /* almacenamiento no disponible */ }

  function confirmar(titulo, texto) {
    var d = $('#dialogo-confirmar');
    if (!d || typeof d.showModal !== 'function') return Promise.resolve(window.confirm(texto));
    $('[data-dialogo-titulo]', d).textContent = titulo;
    $('[data-dialogo-texto]', d).textContent = texto;
    d.returnValue = '';
    d.showModal();
    return new Promise(function (ok) {
      d.addEventListener('close', function f() { d.removeEventListener('close', f); ok(d.returnValue === 'si'); });
    });
  }

  async function pedir(url, opciones) {
    var r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opciones));
    var datos = {};
    try { datos = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (r.status === 401) { location.href = '/admin/login'; throw new Error(datos.error || 'Sesión vencida'); }
    if (!r.ok) throw new Error(datos.error || 'No se pudo completar. Intenta de nuevo.');
    return datos;
  }

  /* ================= Menú lateral (móvil) ================= */
  $$('[data-abrir-lateral]').forEach(function (b) { b.addEventListener('click', function () { document.body.classList.add('lateral-abierto'); }); });
  $$('[data-cerrar-lateral]').forEach(function (b) { b.addEventListener('click', function () { document.body.classList.remove('lateral-abierto'); }); });

  /* ================= Buscar en listas ================= */
  $$('[data-buscar]').forEach(function (input) {
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      $$('[data-fila]').forEach(function (f) { f.hidden = q && f.getAttribute('data-texto').indexOf(q) === -1; });
    });
  });

  /* ================= Borrar ================= */
  $$('[data-borrar]').forEach(function (b) {
    b.addEventListener('click', async function () {
      var nombre = b.getAttribute('data-nombre') || 'este elemento';
      if (!(await confirmar('¿Eliminar "' + nombre + '"?', 'Se borrará de la página web junto con sus fotos. Esta acción no se puede deshacer.'))) return;
      b.disabled = true;
      try {
        var d = await pedir(b.getAttribute('data-borrar'), { method: 'DELETE' });
        var fila = b.closest('[data-fila]');
        if (fila) { fila.style.transition = 'opacity .3s'; fila.style.opacity = '0'; setTimeout(function () { fila.remove(); }, 300); }
        aviso(d.mensaje || 'Eliminado.');
      } catch (e) { aviso(e.message, 'error'); b.disabled = false; }
    });
  });

  /* ================= Instalar base de datos ================= */
  var instalar = $('[data-instalar]');
  if (instalar) {
    instalar.addEventListener('click', async function () {
      instalar.disabled = true; instalar.textContent = 'Instalando…';
      try {
        var d = await pedir('/api/admin/instalar', { method: 'POST' });
        try { sessionStorage.setItem('aviso', d.mensaje); } catch (e) { /* */ }
        location.reload();
      } catch (e) { aviso(e.message, 'error'); instalar.disabled = false; instalar.textContent = 'Instalar base de datos'; }
    });
  }

  /* ================= Editor de texto ================= */
  function iniciarEditor(ed) {
    var area = $('.editor__area', ed);
    var codigo = $('.editor__codigo', ed);
    var botonModo = $('[data-modo]', ed);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ }

    $$('[data-cmd]', ed).forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // no perder la selección
      b.addEventListener('click', function () {
        if (ed.classList.contains('en-codigo')) return;
        area.focus();
        var cmd = b.getAttribute('data-cmd');
        var valor = b.getAttribute('data-valor') || null;
        if (cmd === 'createLink') {
          valor = window.prompt('Pega la dirección del enlace (https://… o /pagina/):', 'https://');
          if (!valor || valor === 'https://') return;
        }
        if (cmd === 'formatBlock') valor = '<' + valor + '>';
        document.execCommand(cmd, false, valor);
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    botonModo.addEventListener('click', function () {
      var aCodigo = !ed.classList.contains('en-codigo');
      if (aCodigo) { codigo.value = formatearHtml(area.innerHTML); }
      else { area.innerHTML = codigo.value; }
      ed.classList.toggle('en-codigo', aCodigo);
      botonModo.classList.toggle('activo', aCodigo);
      botonModo.innerHTML = aCodigo ? '✎ Visual' : '&lt;/&gt; Código';
      (aCodigo ? codigo : area).focus();
    });

    // Al pegar desde Word o la web, pega texto limpio con párrafos
    area.addEventListener('paste', function (e) {
      var html = e.clipboardData && e.clipboardData.getData('text/html');
      var texto = e.clipboardData && e.clipboardData.getData('text/plain');
      if (!texto && !html) return;
      e.preventDefault();
      var limpio = html ? limpiarPegado(html) : texto.split(/\n{2,}/).map(function (p) { return '<p>' + escapar(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
      document.execCommand('insertHTML', false, limpio);
    });
  }
  function valorEditor(ed) {
    return ed.classList.contains('en-codigo') ? $('.editor__codigo', ed).value : $('.editor__area', ed).innerHTML;
  }
  function escapar(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function limpiarPegado(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var permitidas = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, UL: 1, OL: 1, LI: 1, H2: 1, H3: 1, A: 1 };
    (function limpiar(nodo) {
      $$('*', nodo).reverse().forEach(function (el) {
        if (!permitidas[el.tagName]) {
          if (/^(SCRIPT|STYLE|META|LINK|TITLE)$/.test(el.tagName)) { el.remove(); return; }
          var esBloque = /^(DIV|H1|H4|H5|H6|SECTION|ARTICLE|TR)$/.test(el.tagName);
          var frag = document.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          if (esBloque) { var p = document.createElement('p'); p.appendChild(frag); el.replaceWith(p); }
          else el.replaceWith(frag);
          return;
        }
        Array.prototype.slice.call(el.attributes).forEach(function (a) { if (!(el.tagName === 'A' && a.name === 'href')) el.removeAttribute(a.name); });
      });
    })(doc.body);
    return doc.body.innerHTML;
  }
  function formatearHtml(html) {
    return html.replace(/\s*(<\/(p|h2|h3|ul|ol|li)>)/g, '$1\n').replace(/(<(ul|ol)>)/g, '$1\n').replace(/\n{2,}/g, '\n').trim();
  }
  $$('[data-editor]').forEach(iniciarEditor);

  /* ================= Fotos ================= */
  function urlFoto(nombre, mini) {
    if (!nombre) return '/img/sin-foto.svg';
    if (nombre.indexOf('fotos/') === 0) return '/' + (mini ? nombre.replace(/^fotos\//, 'fotos/mini/') : nombre);
    return '/uploads/' + (mini ? 'mini/' : '') + nombre;
  }

  // Redimensiona y convierte a WebP en el navegador
  async function comprimir(archivo, anchoMax, calidad) {
    var bmp;
    try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await createImageBitmap(archivo); }
    var escala = Math.min(1, anchoMax / bmp.width);
    var c = document.createElement('canvas');
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return new Promise(function (ok, mal) {
      c.toBlob(function (b) { b && b.type === 'image/webp' ? ok(b) : mal(new Error('Este navegador no puede convertir la foto. Prueba con Chrome, Edge o Firefox.')); }, 'image/webp', calidad);
    });
  }

  function crearMiniatura(gestor, nombre, src) {
    var una = gestor.hasAttribute('data-una');
    var conAlt = gestor.hasAttribute('data-alt');
    var el = document.createElement('div');
    el.className = 'foto';
    el.draggable = !una;
    if (nombre) el.setAttribute('data-nombre', nombre);
    el.innerHTML =
      '<img alt="" src="' + src + '">' +
      '<span class="foto__portada">Portada</span>' +
      '<div class="foto__acciones">' +
      (una ? '' : '<button type="button" data-mover="-1" title="Mover a la izquierda" aria-label="Mover a la izquierda">‹</button><button type="button" data-mover="1" title="Mover a la derecha" aria-label="Mover a la derecha">›</button>') +
      '<button type="button" data-quitar title="Quitar foto" aria-label="Quitar foto">×</button></div>' +
      (conAlt ? '<input class="foto__alt" type="text" placeholder="Descripción de la foto" aria-label="Descripción de la foto">' : '');
    gestor.insertBefore(el, $('.agregar-foto', gestor));
    return el;
  }

  async function subirArchivos(gestor, archivos) {
    var una = gestor.hasAttribute('data-una');
    var lista = Array.prototype.slice.call(archivos).filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name); });
    if (una) lista = lista.slice(0, 1);
    for (var i = 0; i < lista.length; i++) {
      var archivo = lista[i];
      if (una) $$('.foto', gestor).forEach(function (f) { f.remove(); });
      var el = crearMiniatura(gestor, null, URL.createObjectURL(archivo));
      var prog = document.createElement('div');
      prog.className = 'foto__progreso';
      prog.textContent = 'Optimizando…';
      el.appendChild(prog);
      actualizarAgregar(gestor);
      try {
        var grande = await comprimir(archivo, 1600, 0.82);
        prog.style.setProperty('--avance', '45%');
        var mini = await comprimir(archivo, 640, 0.78);
        prog.style.setProperty('--avance', '60%');
        prog.textContent = 'Subiendo ' + Math.round(grande.size / 1024) + ' KB…';
        var fd = new FormData();
        fd.append('grande', grande, 'grande.webp');
        fd.append('mini', mini, 'mini.webp');
        fd.append('nombre', archivo.name);
        var d = await pedir('/api/admin/subir', { method: 'POST', body: fd });
        el.setAttribute('data-nombre', d.nombre);
        prog.style.setProperty('--avance', '100%');
        setTimeout(function (p) { p.remove(); }, 300, prog);
        marcarCambio(gestor.closest('form'));
      } catch (e) {
        el.classList.add('foto--error');
        var esHeic = /\.(heic|heif)$/i.test(archivo.name);
        prog.textContent = esHeic ? 'Formato HEIC del iPhone: expórtala como JPG' : (e.message || 'Error al subir');
        aviso((esHeic ? 'La foto ' + archivo.name + ' está en formato HEIC. Ábrela y guárdala como JPG.' : e.message), 'error');
        setTimeout(function (x) { x.remove(); actualizarAgregar(gestor); }, 6000, el);
      }
    }
  }

  function actualizarAgregar(gestor) {
    var agregar = $('.agregar-foto', gestor);
    if (gestor.hasAttribute('data-una')) agregar.hidden = $$('.foto', gestor).length > 0;
  }

  function iniciarGestor(gestor) {
    var input = $('.agregar-foto input', gestor);
    var agregar = $('.agregar-foto', gestor);
    input.addEventListener('change', function () { subirArchivos(gestor, input.files); input.value = ''; });

    // Soltar archivos sobre el recuadro
    ['dragenter', 'dragover'].forEach(function (ev) {
      agregar.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') > -1) { e.preventDefault(); agregar.classList.add('encima'); } });
    });
    ['dragleave', 'drop'].forEach(function (ev) { agregar.addEventListener(ev, function () { agregar.classList.remove('encima'); }); });
    agregar.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files.length) subirArchivos(gestor, e.dataTransfer.files); });

    // Quitar y mover con botones
    gestor.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var foto = b.closest('.foto');
      if (b.hasAttribute('data-quitar')) { foto.remove(); actualizarAgregar(gestor); marcarCambio(gestor.closest('form')); }
      if (b.hasAttribute('data-mover')) {
        var paso = Number(b.getAttribute('data-mover'));
        var vecino = paso < 0 ? foto.previousElementSibling : foto.nextElementSibling;
        if (vecino && vecino.classList.contains('foto')) {
          paso < 0 ? gestor.insertBefore(foto, vecino) : gestor.insertBefore(vecino, foto);
          marcarCambio(gestor.closest('form'));
        }
      }
    });

    // Reordenar arrastrando
    var arrastrada = null;
    gestor.addEventListener('dragstart', function (e) {
      var f = e.target.closest('.foto');
      if (!f || !f.draggable) return;
      arrastrada = f; f.classList.add('arrastrando');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (x) { /* */ }
    });
    gestor.addEventListener('dragover', function (e) {
      if (!arrastrada) return;
      e.preventDefault();
      var destino = e.target.closest('.foto');
      $$('.foto', gestor).forEach(function (f) { f.classList.toggle('destino', f === destino && f !== arrastrada); });
    });
    gestor.addEventListener('drop', function (e) {
      if (!arrastrada) return;
      e.preventDefault();
      var destino = e.target.closest('.foto');
      if (destino && destino !== arrastrada) {
        var fotos = $$('.foto', gestor);
        fotos.indexOf(arrastrada) < fotos.indexOf(destino) ? destino.after(arrastrada) : destino.before(arrastrada);
        marcarCambio(gestor.closest('form'));
      }
    });
    gestor.addEventListener('dragend', function () {
      if (arrastrada) arrastrada.classList.remove('arrastrando');
      $$('.foto', gestor).forEach(function (f) { f.classList.remove('destino'); });
      arrastrada = null;
    });
  }
  $$('[data-fotos]').forEach(iniciarGestor);

  /* ================= Precios y descuento ================= */
  function numero(v) { return Number(String(v || '').replace(/\D/g, '')) || 0; }
  function miles(n) { return n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''; }
  $$('[data-pesos]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var pos = inp.value.length - inp.selectionStart;
      inp.value = miles(numero(inp.value));
      var p = Math.max(0, inp.value.length - pos);
      try { inp.setSelectionRange(p, p); } catch (e) { /* */ }
      calcularDescuento();
    });
  });
  function calcularDescuento() {
    var caja = $('[data-descuento]');
    if (!caja) return;
    var a = numero($('#precio') && $('#precio').value);
    var b = numero($('#precioDescuento') && $('#precioDescuento').value);
    caja.textContent = a && b && b < a ? '-' + Math.round((a - b) / a * 100) + '%' : '—';
  }
  calcularDescuento();

  /* ================= Guardar formularios ================= */
  var hayCambios = false;
  function marcarCambio(form) {
    if (!form) return;
    hayCambios = true;
    var est = $('[data-estado]', form);
    if (est) { est.textContent = 'Cambios sin guardar'; est.classList.add('sin-guardar'); }
  }
  window.addEventListener('beforeunload', function (e) { if (hayCambios) { e.preventDefault(); e.returnValue = ''; } });

  $$('[data-formulario]').forEach(function (form) {
    form.addEventListener('input', function () { marcarCambio(form); });
    form.addEventListener('change', function () { marcarCambio(form); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var boton = $('button[type="submit"]', form);

      if ($$('.foto__progreso', form).length) return aviso('Espera a que terminen de subir las fotos.', 'error');

      var datos = {};
      $$('input[name], select[name], textarea[name]', form).forEach(function (el) {
        if (el.closest('[data-fotos]')) return;
        datos[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      $$('[data-editor]', form).forEach(function (ed) { datos[ed.getAttribute('data-editor')] = valorEditor(ed); });
      $$('[data-fotos]', form).forEach(function (g) {
        var fotos = $$('.foto[data-nombre]', g).filter(function (f) { return !f.classList.contains('foto--error'); });
        if (g.hasAttribute('data-alt')) {
          datos[g.getAttribute('data-fotos')] = fotos.map(function (f) { var a = $('.foto__alt', f); return { imagen: f.getAttribute('data-nombre'), alt: a ? a.value : '' }; });
        } else if (g.hasAttribute('data-una')) {
          datos[g.getAttribute('data-fotos')] = fotos.length ? fotos[0].getAttribute('data-nombre') : '';
        } else {
          datos[g.getAttribute('data-fotos')] = fotos.map(function (f) { return f.getAttribute('data-nombre'); });
        }
      });

      // Validación rápida antes de enviar
      var falta = $$('[required]', form).find(function (el) { return !el.value.trim(); });
      if (falta) { falta.focus(); return aviso('Completa los campos marcados con *.', 'error'); }
      var edVacio = $$('[data-editor][data-requerido]', form).find(function (ed) { return !valorEditor(ed).replace(/<[^>]+>/g, '').trim(); });
      if (edVacio) { $('.editor__area', edVacio).focus(); return aviso('La descripción es obligatoria.', 'error'); }
      var fotosVacias = $$('[data-fotos][data-requerido]', form).find(function (g) { return !$$('.foto[data-nombre]', g).length; });
      if (fotosVacias) { fotosVacias.scrollIntoView({ behavior: 'smooth', block: 'center' }); return aviso('Agrega al menos una foto.', 'error'); }

      boton.disabled = true;
      var textoBoton = boton.textContent;
      boton.textContent = 'Guardando…';
      try {
        var r = await pedir(form.getAttribute('data-url'), {
          method: form.getAttribute('data-metodo'),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos),
        });
        hayCambios = false;
        var volver = form.getAttribute('data-volver');
        if (form.getAttribute('data-metodo') === 'POST' && volver) {
          try { sessionStorage.setItem('aviso', r.mensaje || 'Publicado.'); } catch (x) { /* */ }
          location.href = volver;
          return;
        }
        var est = $('[data-estado]', form);
        if (est) { est.textContent = 'Guardado ✓'; est.classList.remove('sin-guardar'); }
        aviso(r.mensaje || 'Guardado.');
      } catch (err) {
        aviso(err.message, 'error');
      }
      boton.disabled = false;
      boton.textContent = textoBoton;
    });
  });
})();
