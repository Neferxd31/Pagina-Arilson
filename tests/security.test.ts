import { describe, expect, it } from 'vitest';
import { applySecurityHeaders } from '../src/lib/security';
import { verifyTurnstile } from '../src/lib/turnstile';

function fakeFetch(body: unknown, calls: FormData[] = []): typeof fetch {
  return (async (_url: string, init: RequestInit) => {
    calls.push(init.body as FormData);
    return new Response(JSON.stringify(body));
  }) as unknown as typeof fetch;
}

describe('verifyTurnstile', () => {
  it('accepts tokens Cloudflare confirms and sends secret, token and IP', async () => {
    const calls: FormData[] = [];
    expect(await verifyTurnstile('token', 'secret', '1.2.3.4', fakeFetch({ success: true }, calls))).toBe(true);
    expect(calls[0].get('secret')).toBe('secret');
    expect(calls[0].get('response')).toBe('token');
    expect(calls[0].get('remoteip')).toBe('1.2.3.4');
  });

  it('rejects tokens Cloudflare refuses', async () => {
    expect(await verifyTurnstile('token', 'secret', null, fakeFetch({ success: false }))).toBe(false);
  });

  it('rejects without calling Cloudflare when the token or the secret is missing', async () => {
    const calls: FormData[] = [];
    expect(await verifyTurnstile('', 'secret', null, fakeFetch({ success: true }, calls))).toBe(false);
    expect(await verifyTurnstile('token', '', null, fakeFetch({ success: true }, calls))).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('rejects when Cloudflare cannot be reached', async () => {
    const failingFetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile('token', 'secret', null, failingFetch)).toBe(false);
  });
});

describe('applySecurityHeaders', () => {
  it('sets the protective headers on the published site', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { isDev: false, isHttps: true });

    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    const csp = headers.get('Content-Security-Policy')!;
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://challenges.cloudflare.com');
  });

  it('skips the CSP in local development and HSTS without https', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { isDev: true, isHttps: false });

    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Content-Security-Policy')).toBeNull();
    expect(headers.get('Strict-Transport-Security')).toBeNull();
  });
});
