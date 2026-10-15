/** Lógica de guardado del panel (validación, slugs únicos y limpieza de fotos en R2). */
import { esTipo, getItemPorId, getEntradaPorId, slugify, type D1, type TipoCatalogo } from './datos';
import { entero, imagenValida, limpiarHtml, texto } from './limpiar';

export function env(locals: unknown): Env {
  return (locals as App.Locals).runtime.env;
}

/** Garantiza un slug único dentro de la tabla (agrega -2, -3…). */
async function slugUnico(db: D1, tabla: 'catalogo' | 'entradas', base: string, tipo?: TipoCatalogo, excluirId?: number) {
  let slug = base, n = 2;
  for (;;) {
    const sql = tabla === 'catalogo'
      ? 'SELECT id FROM catalogo WHERE tipo = ?1 AND slug = ?2 AND id != ?3'
      : 'SELECT id FROM entradas WHERE slug = ?2 AND id != ?3 AND ?1 = ?1';
    const existe = await db.prepare(sql).bind(tipo ?? '', slug, excluirId ?? 0).first();
    if (!existe) return slug;
    slug = `${base}-${n++}`;
  }
}

/** Borra de R2 las fotos subidas desde el panel que ya no se usan. */
export async function borrarFotos(e: Env, nombres: string[]) {
  const claves = nombres
    .filter((n) => n.startsWith('fotos/'))
    .flatMap((n) => [n, n.replace(/^fotos\//, 'fotos/mini/')]);
  if (claves.length && e.FOTOS) await e.FOTOS.delete(claves);
}

/* ---------- Catálogo (cocinas, productos, promociones) ---------- */
export interface DatosItem {
  tipo: TipoCatalogo; titulo: string; descripcion: string; galeria: string[];
  orden: number; precio: number | null; precioDescuento: number | null; nota: string; publicado: number;
}

export function validarItem(b: Record<string, unknown>): { datos?: DatosItem; error?: string } {
  if (!esTipo(b.tipo)) return { error: 'Tipo no válido.' };
  const titulo = texto(b.titulo, 160);
  if (!titulo) return { error: 'El título es obligatorio.' };
  const descripcion = limpiarHtml(b.descripcion);
  if (!descripcion.replace(/<[^>]+>/g, '').trim()) return { error: 'La descripción es obligatoria.' };
  const galeria = (Array.isArray(b.galeria) ? b.galeria : []).filter(imagenValida).slice(0, 30);
  if (!galeria.length) return { error: 'Agrega al menos una foto.' };
  const precio = entero(b.precio);
  const precioDescuento = entero(b.precioDescuento);
  if (b.tipo === 'promociones') {
    if (!precio || !precioDescuento) return { error: 'Escribe el precio y el precio con descuento.' };
    if (precioDescuento >= precio) return { error: 'El precio con descuento debe ser menor que el precio normal.' };
  }
  return {
    datos: {
      tipo: b.tipo, titulo, descripcion, galeria,
      orden: entero(b.orden) ?? 0,
      precio: b.tipo === 'promociones' ? precio : null,
      precioDescuento: b.tipo === 'promociones' ? precioDescuento : null,
      nota: b.tipo === 'promociones' ? texto(b.nota, 200) : '',
      publicado: b.publicado === false ? 0 : 1,
    },
  };
}

export async function crearItem(db: D1, d: DatosItem): Promise<number> {
  const slug = await slugUnico(db, 'catalogo', slugify(d.titulo), d.tipo);
  const r = await db.prepare(
    `INSERT INTO catalogo (tipo, slug, titulo, descripcion, galeria, orden, precio, precio_descuento, nota, publicado)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  ).bind(d.tipo, slug, d.titulo, d.descripcion, JSON.stringify(d.galeria), d.orden, d.precio, d.precioDescuento, d.nota, d.publicado).run();
  return Number(r.meta?.last_row_id ?? 0);
}

export async function actualizarItem(db: D1, e: Env, id: number, d: DatosItem): Promise<boolean> {
  const antes = await getItemPorId(db, id);
  if (!antes) return false;
  await db.prepare(
    `UPDATE catalogo SET titulo = ?1, descripcion = ?2, galeria = ?3, orden = ?4, precio = ?5, precio_descuento = ?6,
     nota = ?7, publicado = ?8, actualizado = datetime('now') WHERE id = ?9`,
  ).bind(d.titulo, d.descripcion, JSON.stringify(d.galeria), d.orden, d.precio, d.precioDescuento, d.nota, d.publicado, id).run();
  await borrarFotos(e, antes.galeria.filter((f) => !d.galeria.includes(f)));
  return true;
}

export async function borrarItem(db: D1, e: Env, id: number): Promise<boolean> {
  const antes = await getItemPorId(db, id);
  if (!antes) return false;
  await db.prepare('DELETE FROM catalogo WHERE id = ?1').bind(id).run();
  await borrarFotos(e, antes.galeria);
  return true;
}

/* ---------- Entradas del blog ---------- */
export interface DatosEntrada { titulo: string; fecha: string; imagen: string; contenido: string; publicado: number }

export function validarEntrada(b: Record<string, unknown>): { datos?: DatosEntrada; error?: string } {
  const titulo = texto(b.titulo, 160);
  if (!titulo) return { error: 'El título es obligatorio.' };
  const contenido = limpiarHtml(b.contenido);
  if (!contenido.replace(/<[^>]+>/g, '').trim()) return { error: 'La descripción es obligatoria.' };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha)) ? String(b.fecha) : new Date().toISOString().slice(0, 10);
  const imagen = imagenValida(b.imagen) ? b.imagen : '';
  if (!imagen) return { error: 'Agrega la imagen destacada.' };
  return { datos: { titulo, fecha, imagen, contenido, publicado: b.publicado === false ? 0 : 1 } };
}

export async function crearEntrada(db: D1, d: DatosEntrada): Promise<number> {
  const slug = await slugUnico(db, 'entradas', slugify(d.titulo));
  const r = await db.prepare('INSERT INTO entradas (slug, titulo, fecha, imagen, contenido, publicado) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(slug, d.titulo, d.fecha, d.imagen, d.contenido, d.publicado).run();
  return Number(r.meta?.last_row_id ?? 0);
}

export async function actualizarEntrada(db: D1, e: Env, id: number, d: DatosEntrada): Promise<boolean> {
  const antes = await getEntradaPorId(db, id);
  if (!antes) return false;
  await db.prepare(`UPDATE entradas SET titulo = ?1, fecha = ?2, imagen = ?3, contenido = ?4, publicado = ?5, actualizado = datetime('now') WHERE id = ?6`)
    .bind(d.titulo, d.fecha, d.imagen, d.contenido, d.publicado, id).run();
  if (antes.imagen !== d.imagen) await borrarFotos(e, [antes.imagen]);
  return true;
}

export async function borrarEntrada(db: D1, e: Env, id: number): Promise<boolean> {
  const antes = await getEntradaPorId(db, id);
  if (!antes) return false;
  await db.prepare('DELETE FROM entradas WHERE id = ?1').bind(id).run();
  await borrarFotos(e, [antes.imagen]);
  return true;
}
