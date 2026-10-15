/**
 * Inicio de sesión del panel.
 *
 * - El usuario y la contraseña NO están en el código: son variables cifradas de Cloudflare
 *   (ADMIN_USUARIO y ADMIN_CLAVE). Nadie puede leerlas, ni siquiera desde el panel de Cloudflare.
 * - Al entrar se crea una cookie de sesión firmada (HMAC-SHA256 con SESION_SECRETO),
 *   que solo funciona en este sitio (HttpOnly, Secure, SameSite=Strict) y vence en 8 horas.
 * - Máximo 5 intentos fallidos cada 15 minutos por dirección IP.
 */
import type { D1 } from './datos';

export const COOKIE = 'ad_sesion';
const DURACION_HORAS = 8;
const MAX_INTENTOS = 5;
const VENTANA_MIN = 15;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function desdeB64url(txt: string): string {
  return atob(txt.replace(/-/g, '+').replace(/_/g, '/'));
}

async function hmac(secreto: string, datos: string): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', clave, enc.encode(datos)));
}

/** Comparación en tiempo constante (evita ataques por tiempo de respuesta). */
async function iguales(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

export function configuracionLista(env: Partial<Env>): boolean {
  return !!(env.ADMIN_USUARIO && env.ADMIN_CLAVE && env.SESION_SECRETO && env.SESION_SECRETO.length >= 16);
}

export async function credencialesValidas(env: Env, usuario: string, clave: string): Promise<boolean> {
  const okU = await iguales(usuario.trim().toLowerCase(), (env.ADMIN_USUARIO || '').trim().toLowerCase());
  const okC = await iguales(clave, env.ADMIN_CLAVE || '');
  return okU && okC;
}

export async function crearSesion(env: Env, usuario: string): Promise<{ valor: string; maxAge: number }> {
  const maxAge = DURACION_HORAS * 3600;
  const carga = b64url(enc.encode(JSON.stringify({ u: usuario, exp: Math.floor(Date.now() / 1000) + maxAge })));
  return { valor: `${carga}.${await hmac(env.SESION_SECRETO, carga)}`, maxAge };
}

/** Devuelve el usuario si la cookie es válida y no ha vencido. */
export async function leerSesion(env: Partial<Env>, valor: string | undefined): Promise<string | null> {
  if (!valor || !env.SESION_SECRETO) return null;
  const [carga, firma] = valor.split('.');
  if (!carga || !firma) return null;
  if (!(await iguales(firma, await hmac(env.SESION_SECRETO, carga)))) return null;
  try {
    const { u, exp } = JSON.parse(desdeB64url(carga));
    if (typeof exp !== 'number' || exp < Date.now() / 1000) return null;
    return typeof u === 'string' ? u : null;
  } catch {
    return null;
  }
}

/* ---------- Límite de intentos ---------- */
export async function bloqueado(db: D1, ip: string): Promise<boolean> {
  try {
    const r = await db
      .prepare(`SELECT COUNT(*) AS n FROM intentos_login WHERE ip = ?1 AND fecha > datetime('now', ?2)`)
      .bind(ip, `-${VENTANA_MIN} minutes`)
      .first<{ n: number }>();
    return (r?.n ?? 0) >= MAX_INTENTOS;
  } catch {
    return false; // si la base aún no está instalada, no bloquea
  }
}
export async function registrarFallo(db: D1, ip: string): Promise<void> {
  try {
    await db.batch([
      db.prepare('INSERT INTO intentos_login (ip) VALUES (?1)').bind(ip),
      db.prepare(`DELETE FROM intentos_login WHERE fecha < datetime('now', '-1 day')`),
    ]);
  } catch { /* base no instalada */ }
}
export async function limpiarFallos(db: D1, ip: string): Promise<void> {
  try { await db.prepare('DELETE FROM intentos_login WHERE ip = ?1').bind(ip).run(); } catch { /* */ }
}
