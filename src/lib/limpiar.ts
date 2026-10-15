/**
 * Limpieza del HTML que llega desde el editor del panel.
 * Quita scripts, estilos incrustados, iframes, eventos (onclick…) y enlaces "javascript:".
 */
const CON_CONTENIDO = /<\s*(script|style|iframe|object|textarea|select|button|form|noscript|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SUELTAS = /<\s*\/?\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|noscript|svg|math|frame|frameset)\b[^>]*>/gi;

export function limpiarHtml(html: unknown): string {
  let s = typeof html === 'string' ? html : '';
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(CON_CONTENIDO, '').replace(SUELTAS, '');
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/(href|src)\s*=\s*(["'])\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');
  // Enlaces externos se abren en otra pestaña de forma segura
  s = s.replace(/<a\s+([^>]*href=["']https?:\/\/(?!alldesign\.com\.co)[^"']*["'][^>]*)>/gi, (m, attrs) =>
    /target=/.test(attrs) ? m : `<a ${attrs} target="_blank" rel="noopener">`);
  return s.trim();
}

export function texto(v: unknown, max = 300): string {
  return (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

export function entero(v: unknown): number | null {
  const digitos = String(v ?? '').replace(/[^\d]/g, '');
  return digitos ? Number(digitos) : null;
}

/** Acepta solo nombres de imagen válidos: "algo.webp" (migradas) o "fotos/AAAA/MM/algo.webp" (R2). */
export function imagenValida(v: unknown): v is string {
  return typeof v === 'string' && /^(fotos\/\d{4}\/\d{2}\/)?[a-z0-9][a-z0-9._-]{0,120}\.(webp|jpe?g|png|gif|avif)$/i.test(v);
}
