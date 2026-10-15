/**
 * Capa de datos del sitio – lee y escribe en la base de datos D1 de Cloudflare.
 * Las páginas públicas y el panel usan estas funciones.
 */
import paginasJson from '../data/paginas.json';

/* ---------- Tipos ---------- */
export interface Redes {
  facebook: string; instagram: string; linkedin: string; youtube: string;
  tiktok: string; pinterest: string; google: string;
}
export interface FotoInicio { imagen: string; alt: string }
export interface Sitio {
  titulo: string;
  descripcion: string;        // HTML
  tituloPie: string;
  celular1: string;
  telefonoFijo: string;
  celular2: string;
  footerInfo: string;
  correo: string;
  galeriaInicio: FotoInicio[];
  redes: Redes;
}
export type TipoCatalogo = 'cocinas' | 'productos' | 'promociones';
export interface Producto {
  id: number;
  tipo: TipoCatalogo;
  slug: string;
  titulo: string;
  descripcion: string;        // HTML
  portada: string;            // primera foto de la galería
  galeria: string[];
  orden: number;
  publicado: boolean;
}
export interface Promocion extends Producto {
  precio: number;
  precioDescuento: number;
  nota: string;
}
export interface Entrada {
  id: number;
  slug: string;
  titulo: string;
  fecha: string;              // AAAA-MM-DD
  imagen: string;
  extracto: string;
  contenido: string;          // HTML
  publicado: boolean;
}
export interface Pagina { titulo: string; contenido: string }

export const TIPOS: Record<TipoCatalogo, { plural: string; singular: string; ruta: string }> = {
  cocinas: { plural: 'Cocinas integrales', singular: 'cocina', ruta: '/concinas-integrales/' },
  productos: { plural: 'Otros productos', singular: 'producto', ruta: '/productos/' },
  promociones: { plural: 'Promociones', singular: 'promoción', ruta: '/promociones/' },
};
export const esTipo = (t: unknown): t is TipoCatalogo => t === 'cocinas' || t === 'productos' || t === 'promociones';

/* ---------- Acceso a la base de datos ---------- */
// Tipos mínimos de D1 (evita depender de paquetes extra)
export interface D1Result<T = unknown> { results: T[]; meta?: { last_row_id?: number; changes?: number } }
export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1 { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<D1Result[]> }

/** Obtiene la base de datos desde `Astro.locals`. */
export function getDB(locals: unknown): D1 {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env;
  const db = env?.DB as D1 | undefined;
  if (!db) throw new Error('Falta la conexión "DB" a la base de datos D1 en Cloudflare (Configuración → Vinculaciones).');
  return db;
}

/* ---------- Lectura ---------- */

/** Si la base de datos aún no se ha instalado, el sitio público no se cae: muestra vacío. */
async function seguro<T>(fn: () => Promise<T>, siFalla: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (String(e).includes('no such table')) return siFalla;
    throw e;
  }
}

type FilaSitio = Record<string, string>;

export async function getSitio(db: D1): Promise<Sitio> {
  const f = (await seguro(() => db.prepare('SELECT * FROM sitio WHERE id = 1').first<FilaSitio>(), null)) ?? ({} as FilaSitio);
  const v = (k: string) => f[k] ?? '';
  return {
    titulo: v('titulo'),
    descripcion: v('descripcion'),
    tituloPie: v('titulo_pie'),
    celular1: v('celular1'),
    telefonoFijo: v('telefono_fijo'),
    celular2: v('celular2'),
    footerInfo: v('footer_info'),
    correo: v('correo'),
    galeriaInicio: json<FotoInicio[]>(f.galeria_inicio, []),
    redes: {
      facebook: v('facebook'), instagram: v('instagram'), linkedin: v('linkedin'), youtube: v('youtube'),
      tiktok: v('tiktok'), pinterest: v('pinterest'), google: v('google'),
    },
  };
}

type FilaCatalogo = {
  id: number; tipo: TipoCatalogo; slug: string; titulo: string; descripcion: string; galeria: string;
  orden: number; precio: number | null; precio_descuento: number | null; nota: string; publicado: number;
};
function aProducto(f: FilaCatalogo): Promocion {
  const galeria = json<string[]>(f.galeria, []);
  return {
    id: f.id, tipo: f.tipo, slug: f.slug, titulo: f.titulo, descripcion: f.descripcion,
    galeria, portada: galeria[0] ?? '', orden: f.orden, publicado: !!f.publicado,
    precio: f.precio ?? 0, precioDescuento: f.precio_descuento ?? 0, nota: f.nota ?? '',
  };
}

/** Lista del catálogo. `todos = true` incluye borradores (para el panel). */
export async function getCatalogo(db: D1, tipo: TipoCatalogo, todos = false): Promise<Promocion[]> {
  const sql = `SELECT * FROM catalogo WHERE tipo = ?1 ${todos ? '' : 'AND publicado = 1'} ORDER BY orden ASC, id DESC`;
  const { results } = await seguro(() => db.prepare(sql).bind(tipo).all<FilaCatalogo>(), { results: [] as FilaCatalogo[] });
  return results.map(aProducto);
}
export async function getItem(db: D1, tipo: TipoCatalogo, slug: string): Promise<Promocion | null> {
  const f = await seguro(() => db.prepare('SELECT * FROM catalogo WHERE tipo = ?1 AND slug = ?2 AND publicado = 1').bind(tipo, slug).first<FilaCatalogo>(), null);
  return f ? aProducto(f) : null;
}
export async function getItemPorId(db: D1, id: number): Promise<Promocion | null> {
  const f = await db.prepare('SELECT * FROM catalogo WHERE id = ?1').bind(id).first<FilaCatalogo>();
  return f ? aProducto(f) : null;
}

type FilaEntrada = { id: number; slug: string; titulo: string; fecha: string; imagen: string; contenido: string; publicado: number };
function aEntrada(f: FilaEntrada): Entrada {
  return { ...f, publicado: !!f.publicado, extracto: textoPlano(f.contenido, 180) };
}
export async function getEntradas(db: D1, todos = false): Promise<Entrada[]> {
  const sql = `SELECT * FROM entradas ${todos ? '' : 'WHERE publicado = 1'} ORDER BY fecha DESC, id ASC`;
  const { results } = await seguro(() => db.prepare(sql).all<FilaEntrada>(), { results: [] as FilaEntrada[] });
  return results.map(aEntrada);
}
export async function getEntrada(db: D1, slug: string): Promise<Entrada | null> {
  const f = await seguro(() => db.prepare('SELECT * FROM entradas WHERE slug = ?1 AND publicado = 1').bind(slug).first<FilaEntrada>(), null);
  return f ? aEntrada(f) : null;
}
export async function getEntradaPorId(db: D1, id: number): Promise<Entrada | null> {
  const f = await db.prepare('SELECT * FROM entradas WHERE id = ?1').bind(id).first<FilaEntrada>();
  return f ? aEntrada(f) : null;
}

export async function instalada(db: D1): Promise<boolean> {
  return seguro(async () => !!(await db.prepare('SELECT id FROM sitio WHERE id = 1').first()), false);
}

export async function getConteos(db: D1) {
  const [cat, ent] = await db.batch([
    db.prepare('SELECT tipo, COUNT(*) AS total FROM catalogo GROUP BY tipo'),
    db.prepare('SELECT COUNT(*) AS total FROM entradas'),
  ]);
  const c: Record<string, number> = { cocinas: 0, productos: 0, promociones: 0, entradas: 0 };
  for (const r of cat.results as { tipo: string; total: number }[]) c[r.tipo] = r.total;
  c.entradas = (ent.results[0] as { total: number })?.total ?? 0;
  return c as Record<TipoCatalogo | 'entradas', number>;
}

/** Páginas de texto fijo (Nosotros, Garantía, Materiales, introducción de Cocinas). */
export async function getPagina(clave: keyof typeof paginasJson): Promise<Pagina> {
  return paginasJson[clave] as Pagina;
}

/* ---------- Ayudas ---------- */

/**
 * Ruta pública de una imagen.
 * - Fotos migradas de WordPress: "cocina.webp"            → /uploads/cocina.webp
 * - Fotos subidas desde el panel: "fotos/2026/10/x.webp"  → /fotos/2026/10/x.webp (desde R2)
 */
export function img(nombre: string, mini = false): string {
  if (!nombre) return '/img/sin-foto.svg';
  if (nombre.startsWith('fotos/')) return '/' + (mini ? nombre.replace(/^fotos\//, 'fotos/mini/') : nombre);
  return `/uploads/${mini ? 'mini/' : ''}${nombre}`;
}

/** Porcentaje de descuento en número entero, ej. 4.500.000 → 3.500.000 = 22 */
export function porcentaje(precio: number, precioDescuento: number): number {
  if (!precio || !precioDescuento || precioDescuento >= precio) return 0;
  return Math.round(((precio - precioDescuento) / precio) * 100);
}

/** Formato de pesos colombianos: 3500000 → "$ 3.500.000" */
export function pesos(valor: number): string {
  return '$ ' + Math.round(valor || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Enlace de WhatsApp con mensaje prellenado. */
export function whatsapp(numero: string, mensaje: string): string {
  const limpio = (numero || '').replace(/\D/g, '');
  const conPais = limpio.startsWith('57') ? limpio : '57' + limpio;
  return `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`;
}

/** Fecha legible: 2015-10-26 → "26 oct 2015" */
export function fechaCorta(iso: string): string {
  const [a, m, d] = (iso || '').split('-').map(Number);
  if (!a || !m || !d) return iso;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${a}`;
}

/** Texto plano a partir de HTML (para extractos y meta descripciones). */
export function textoPlano(html: string, max = 160): string {
  const t = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}

/** "Cocina en Alto Brillo!" → "cocina-en-alto-brillo" */
export function slugify(texto: string): string {
  return (texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sin-titulo';
}

function json<T>(texto: unknown, porDefecto: T): T {
  if (typeof texto !== 'string' || !texto) return porDefecto;
  try { return JSON.parse(texto) as T; } catch { return porDefecto; }
}
