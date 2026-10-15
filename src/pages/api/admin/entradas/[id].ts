import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/datos';
import { actualizarEntrada, borrarEntrada, env, validarEntrada } from '../../../../lib/admin';
import { error, json, leerJson } from '../../../../lib/respuesta';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const { datos, error: e } = validarEntrada(await leerJson(request));
  if (!datos) return error(e ?? 'Datos no válidos.');
  const ok = await actualizarEntrada(getDB(locals), env(locals), Number(params.id), datos);
  return ok ? json({ ok: true, mensaje: 'Cambios guardados.' }) : error('No existe.', 404);
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const ok = await borrarEntrada(getDB(locals), env(locals), Number(params.id));
  return ok ? json({ ok: true, mensaje: 'Entrada eliminada.' }) : error('No existe.', 404);
};
