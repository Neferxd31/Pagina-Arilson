import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const MAX_BYTES = 3 * 1024 * 1024;

// The admin page compresses every photo to JPEG before sending it, so only JPEG is accepted here
export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type') !== 'image/jpeg') {
    return Response.json({ error: 'Formato no permitido.' }, { status: 415 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return Response.json({ error: 'La foto debe pesar menos de 3 MB.' }, { status: 413 });
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) return Response.json({ error: 'El archivo no es una imagen JPEG.' }, { status: 415 });

  const key = `p/${crypto.randomUUID()}.jpg`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
  return Response.json({ key }, { status: 201 });
};
