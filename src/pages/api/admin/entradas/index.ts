import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/datos';
import { crearEntrada, validarEntrada } from '../../../../lib/admin';
import { error, json, leerJson } from '../../../../lib/respuesta';

export const POST: APIRoute = async ({ request, locals }) => {
  const { datos, error: e } = validarEntrada(await leerJson(request));
  if (!datos) return error(e ?? 'Datos no válidos.');
  const id = await crearEntrada(getDB(locals), datos);
  return json({ ok: true, id, mensaje: 'Entrada publicada.' }, 201);
};
