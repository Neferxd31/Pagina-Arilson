import type { APIRoute } from 'astro';
import { buildRobotsTxt } from '../lib/seo';

export const GET: APIRoute = ({ url }) =>
  new Response(buildRobotsTxt(url.origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
