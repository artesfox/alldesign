import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/datos';
import { actualizarItem, borrarItem, env, validarItem } from '../../../../lib/admin';
import { error, json, leerJson } from '../../../../lib/respuesta';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const { datos, error: e } = validarItem(await leerJson(request));
  if (!datos) return error(e ?? 'Datos no válidos.');
  const ok = await actualizarItem(getDB(locals), env(locals), Number(params.id), datos);
  return ok ? json({ ok: true, mensaje: 'Cambios guardados.' }) : error('No existe.', 404);
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const ok = await borrarItem(getDB(locals), env(locals), Number(params.id));
  return ok ? json({ ok: true, mensaje: 'Eliminado.' }) : error('No existe.', 404);
};
