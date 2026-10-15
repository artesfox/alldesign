// Instala la base de datos la primera vez: crea las tablas y carga el contenido
// que se copió de la web de WordPress. Si ya está instalada, no hace nada.
import type { APIRoute } from 'astro';
import esquema from '../../../../base-de-datos/1-tablas.sql?raw';
import sitio from '../../../data/sitio.json';
import cocinas from '../../../data/cocinas.json';
import productos from '../../../data/productos.json';
import promociones from '../../../data/promociones.json';
import blog from '../../../data/blog.json';
import { getDB, instalada } from '../../../lib/datos';
import { error, json } from '../../../lib/respuesta';

export const POST: APIRoute = async ({ locals }) => {
  const db = getDB(locals);
  if (await instalada(db)) return error('La base de datos ya estaba instalada.', 409);

  // 1. Tablas
  const sentencias = esquema
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(';').map((s) => s.trim()).filter(Boolean);
  await db.batch(sentencias.map((s) => db.prepare(s)));

  // 2. Contenido inicial
  const r = sitio.redes;
  const lotes = [
    db.prepare(
      `INSERT OR REPLACE INTO sitio (id, titulo, descripcion, titulo_pie, celular1, telefono_fijo, celular2, footer_info, correo,
       facebook, instagram, linkedin, youtube, tiktok, pinterest, google, galeria_inicio)
       VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`,
    ).bind(
      sitio.titulo, sitio.descripcion, sitio.tituloPie, sitio.celular1, sitio.telefonoFijo, sitio.celular2, sitio.footerInfo,
      sitio.correo, r.facebook, r.instagram, r.linkedin, r.youtube, r.tiktok, r.pinterest, r.google, JSON.stringify(sitio.galeriaInicio),
    ),
  ];
  const catalogo: [string, Array<Record<string, unknown>>][] = [['cocinas', cocinas], ['productos', productos], ['promociones', promociones]];
  for (const [tipo, lista] of catalogo) {
    for (const it of lista) {
      lotes.push(
        db.prepare(
          `INSERT INTO catalogo (tipo, slug, titulo, descripcion, galeria, orden, precio, precio_descuento, nota)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        ).bind(tipo, it.slug, it.titulo, it.descripcion, JSON.stringify(it.galeria), it.orden,
          it.precio ?? null, it.precioDescuento ?? null, it.nota ?? ''),
      );
    }
  }
  for (const e of blog) {
    lotes.push(
      db.prepare('INSERT INTO entradas (slug, titulo, fecha, imagen, contenido) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(e.slug, e.titulo, e.fecha, e.imagen, e.contenido),
    );
  }
  await db.batch(lotes);
  return json({ ok: true, mensaje: 'Base de datos instalada con todo el contenido.' });
};
