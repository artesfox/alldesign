import { defineMiddleware } from 'astro:middleware';
import { COOKIE, leerSesion } from './lib/auth';

/**
 * Protege el panel (/admin) y su API (/api/admin).
 * Solo deja pasar a quien tenga una sesión válida.
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  const ruta = ctx.url.pathname;
  const esPanel = ruta === '/admin' || ruta.startsWith('/admin/');
  const esApi = ruta.startsWith('/api/admin/');

  if (esPanel || esApi) {
    const env = (ctx.locals.runtime?.env ?? {}) as Partial<Env>;
    const usuario = await leerSesion(env, ctx.cookies.get(COOKIE)?.value);
    const publica = ruta === '/admin/login' || ruta === '/admin/login/';

    if (!usuario && !publica) {
      if (esApi) return json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }, 401);
      return ctx.redirect('/admin/login');
    }
    if (usuario && publica) return ctx.redirect('/admin');

    // La API solo acepta peticiones hechas desde este mismo sitio
    if (esApi && ctx.request.method !== 'GET') {
      const origen = ctx.request.headers.get('origin');
      if (origen && origen !== ctx.url.origin) return json({ error: 'Origen no permitido.' }, 403);
    }
    ctx.locals.usuario = usuario ?? undefined;
  }

  const respuesta = await next();

  if (esPanel || esApi) {
    try {
      respuesta.headers.set('Cache-Control', 'no-store');
      respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
      respuesta.headers.set('X-Frame-Options', 'DENY');
    } catch { /* algunas respuestas (redirecciones) no permiten cambiar cabeceras */ }
  }
  return respuesta;
});

function json(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
