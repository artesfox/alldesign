// Entrega las fotos subidas desde el panel (guardadas en R2), con caché larga.
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals, request }) => {
  const ruta = params.ruta ?? '';
  if (!/^(mini\/)?\d{4}\/\d{2}\/[a-z0-9._-]+\.webp$/i.test(ruta)) return new Response('No encontrado', { status: 404 });
  const bucket = (locals as App.Locals).runtime.env.FOTOS;
  const obj = bucket ? await bucket.get(`fotos/${ruta}`) : null;
  if (!obj) return new Response('No encontrado', { status: 404 });
  if (request.headers.get('if-none-match') === obj.httpEtag) return new Response(null, { status: 304 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: obj.httpEtag,
    },
  });
};
