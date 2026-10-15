// Recibe una foto ya comprimida en el navegador (WebP grande + miniatura) y la guarda en R2.
import type { APIRoute } from 'astro';
import { env } from '../../../lib/admin';
import { slugify } from '../../../lib/datos';
import { error, json } from '../../../lib/respuesta';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB por archivo (ya optimizado suele pesar ~200 KB)

export const POST: APIRoute = async ({ request, locals }) => {
  const e = env(locals);
  if (!e.FOTOS) return error('Falta la conexión "FOTOS" al almacenamiento R2 en Cloudflare.', 500);

  const form = await request.formData();
  const grande = form.get('grande');
  const mini = form.get('mini');
  const nombre = String(form.get('nombre') ?? 'foto');
  if (!(grande instanceof File) || !(mini instanceof File)) return error('No llegó la foto.');
  for (const f of [grande, mini]) {
    if (f.type !== 'image/webp') return error('Formato no permitido.');
    if (f.size > MAX_BYTES) return error('La foto es demasiado pesada.');
  }

  const hoy = new Date();
  const carpeta = `${hoy.getFullYear()}/${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const archivo = `${slugify(nombre.replace(/\.[a-z0-9]+$/i, '')).slice(0, 50)}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const clave = `fotos/${carpeta}/${archivo}`;
  const meta = { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } };

  await Promise.all([
    e.FOTOS.put(clave, await grande.arrayBuffer(), meta),
    e.FOTOS.put(`fotos/mini/${carpeta}/${archivo}`, await mini.arrayBuffer(), meta),
  ]);
  return json({ ok: true, nombre: clave });
};
