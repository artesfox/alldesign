import type { APIRoute } from 'astro';
import { COOKIE, bloqueado, configuracionLista, credencialesValidas, crearSesion, limpiarFallos, registrarFallo } from '../../lib/auth';
import { getDB } from '../../lib/datos';

export const POST: APIRoute = async ({ request, locals, cookies, redirect }) => {
  const env = (locals as App.Locals).runtime.env;
  if (!configuracionLista(env)) return redirect('/admin/login?error=config', 303);

  const db = getDB(locals);
  const ip = request.headers.get('cf-connecting-ip') ?? 'desconocida';
  if (await bloqueado(db, ip)) return redirect('/admin/login?error=bloqueado', 303);

  const form = await request.formData();
  const usuario = String(form.get('usuario') ?? '');
  const clave = String(form.get('clave') ?? '');

  if (!(await credencialesValidas(env, usuario, clave))) {
    await registrarFallo(db, ip);
    return redirect('/admin/login?error=datos', 303);
  }
  await limpiarFallos(db, ip);
  const { valor, maxAge } = await crearSesion(env, usuario.trim());
  cookies.set(COOKIE, valor, { path: '/', httpOnly: true, secure: true, sameSite: 'strict', maxAge });
  return redirect('/admin', 303);
};
