import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const object = await env.MEDIA.get(params.key ?? '');
  if (!object) return new Response('Imagen no encontrada', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      // Keys are random UUIDs that never get overwritten, so browsers can cache them forever
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    },
  });
};
