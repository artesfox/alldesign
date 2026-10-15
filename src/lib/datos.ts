/**
 * Capa de datos del sitio.
 *
 * ETAPA 1 (ahora): los datos salen de los archivos JSON en `src/data/`.
 * ETAPA 2 (panel):  estas mismas funciones leerán de la base de datos D1.
 *                   Las páginas NO cambian, solo este archivo.
 *
 * Por eso todas las funciones son `async`, igual que serán con D1.
 */
import sitioJson from '../data/sitio.json';
import cocinasJson from '../data/cocinas.json';
import productosJson from '../data/productos.json';
import promocionesJson from '../data/promociones.json';
import blogJson from '../data/blog.json';
import paginasJson from '../data/paginas.json';

/* ---------- Tipos (equivalen a las tablas de la base de datos) ---------- */
export interface Redes {
  facebook: string; instagram: string; linkedin: string; youtube: string;
  tiktok: string; pinterest: string; google: string;
}
export interface Sitio {
  titulo: string;
  descripcion: string;        // HTML
  tituloPie: string;
  celular1: string;
  telefonoFijo: string;
  celular2: string;
  footerInfo: string;
  correo: string;
  galeriaInicio: { imagen: string; alt: string }[];
  redes: Redes;
}
export interface Producto {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;        // HTML
  portada: string;            // nombre de archivo de imagen
  galeria: string[];
  orden: number;
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
}
export interface Pagina { titulo: string; contenido: string }

export type TipoCatalogo = 'cocinas' | 'productos' | 'promociones';

/* ---------- Lectura ---------- */
export async function getSitio(): Promise<Sitio> {
  return sitioJson as Sitio;
}
export async function getCocinas(): Promise<Producto[]> {
  return ordenar(cocinasJson as Producto[]);
}
export async function getProductos(): Promise<Producto[]> {
  return ordenar(productosJson as Producto[]);
}
export async function getPromociones(): Promise<Promocion[]> {
  return ordenar(promocionesJson as Promocion[]);
}
export async function getEntradas(): Promise<Entrada[]> {
  return [...(blogJson as Entrada[])].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id - b.id);
}
export async function getPagina(clave: keyof typeof paginasJson): Promise<Pagina> {
  return paginasJson[clave] as Pagina;
}

function ordenar<T extends { orden: number }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => a.orden - b.orden);
}

/* ---------- Ayudas ---------- */

/** Ruta pública de una imagen grande (o de su miniatura). */
export function img(nombre: string, mini = false): string {
  return `/uploads/${mini ? 'mini/' : ''}${nombre}`;
}

/** Porcentaje de descuento en número entero, ej. 4.500.000 → 3.500.000 = 22 */
export function porcentaje(precio: number, precioDescuento: number): number {
  if (!precio || precioDescuento >= precio) return 0;
  return Math.round(((precio - precioDescuento) / precio) * 100);
}

/** Formato de pesos colombianos: 3500000 → "$ 3.500.000" */
export function pesos(valor: number): string {
  return '$ ' + Math.round(valor).toLocaleString('es-CO').replace(/,/g, '.');
}

/** Enlace de WhatsApp con mensaje prellenado. */
export function whatsapp(numero: string, mensaje: string): string {
  const limpio = numero.replace(/\D/g, '');
  const conPais = limpio.startsWith('57') ? limpio : '57' + limpio;
  return `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`;
}

/** Fecha legible: 2015-10-26 → "26 oct 2015" */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${a}`;
}

/** Texto plano a partir de HTML (para meta descripciones). */
export function textoPlano(html: string, max = 160): string {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}
