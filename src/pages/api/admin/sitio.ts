import type { APIRoute } from 'astro';
import { getDB, getSitio } from '../../../lib/datos';
import { borrarFotos, env } from '../../../lib/admin';
import { imagenValida, limpiarHtml, texto } from '../../../lib/limpiar';
import { error, json, leerJson } from '../../../lib/respuesta';

const url = (v: unknown) => {
  const t = texto(v, 600);
  return /^https?:\/\//i.test(t) ? t : '';
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals);
  const b = await leerJson(request);
  const titulo = texto(b.titulo, 160);
  const descripcion = limpiarHtml(b.descripcion);
  if (!titulo) return error('El título de la página de inicio es obligatorio.');
  if (!descripcion) return error('La descripción de la página es obligatoria.');
  const correo = texto(b.correo, 120);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return error('El correo no es válido.');

  const galeria = (Array.isArray(b.galeriaInicio) ? b.galeriaInicio : [])
    .filter((f: { imagen?: unknown }) => imagenValida(f?.imagen))
    .slice(0, 30)
    .map((f: { imagen: string; alt?: unknown }) => ({ imagen: f.imagen, alt: texto(f.alt, 160) }));

  const antes = await getSitio(db);
  await db.prepare(
    `UPDATE sitio SET titulo = ?1, descripcion = ?2, titulo_pie = ?3, celular1 = ?4, telefono_fijo = ?5, celular2 = ?6,
     footer_info = ?7, correo = ?8, facebook = ?9, instagram = ?10, linkedin = ?11, youtube = ?12, tiktok = ?13,
     pinterest = ?14, google = ?15, galeria_inicio = ?16, actualizado = datetime('now') WHERE id = 1`,
  ).bind(
    titulo, descripcion, texto(b.tituloPie, 160), texto(b.celular1, 30), texto(b.telefonoFijo, 30), texto(b.celular2, 30),
    texto(b.footerInfo, 200), correo, url(b.facebook), url(b.instagram), url(b.linkedin), url(b.youtube), url(b.tiktok),
    url(b.pinterest), url(b.google), JSON.stringify(galeria),
  ).run();

  const nuevas = galeria.map((f: { imagen: string }) => f.imagen);
  await borrarFotos(env(locals), antes.galeriaInicio.map((f) => f.imagen).filter((i) => !nuevas.includes(i)));
  return json({ ok: true, mensaje: 'Información guardada.' });
};
