import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/datos';
import { crearItem, validarItem } from '../../../../lib/admin';
import { error, json, leerJson } from '../../../../lib/respuesta';

export const POST: APIRoute = async ({ request, locals }) => {
  const { datos, error: e } = validarItem(await leerJson(request));
  if (!datos) return error(e ?? 'Datos no válidos.');
  const id = await crearItem(getDB(locals), datos);
  return json({ ok: true, id, mensaje: 'Publicado.' }, 201);
};
