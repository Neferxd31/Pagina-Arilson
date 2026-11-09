import { describe, expect, it } from 'vitest';
import { describeActivity } from '../src/lib/activity';
import { isAllowedAdmin, parseAdminEmails } from '../src/lib/auth';
import { hashClientIp, isOverOrderLimit, ORDER_LIMIT_PER_HOUR } from '../src/lib/rate-limit';
import { isSameOriginRequest } from '../src/lib/security';

describe('admin allowlist', () => {
  it('parses the comma separated list ignoring spaces, case and junk', () => {
    expect(parseAdminEmails(' Arilson@Gmail.com, otro@correo.co ,, no-es-correo ')).toEqual([
      'arilson@gmail.com',
      'otro@correo.co',
    ]);
  });

  it('only lets listed emails in', () => {
    const allowed = parseAdminEmails('arilson@gmail.com');
    expect(isAllowedAdmin('ARILSON@gmail.com', allowed)).toBe(true);
    expect(isAllowedAdmin('intruso@gmail.com', allowed)).toBe(false);
    expect(isAllowedAdmin(null, allowed)).toBe(false);
  });

  it('keeps everyone out when the list is empty', () => {
    expect(isAllowedAdmin('arilson@gmail.com', parseAdminEmails(''))).toBe(false);
  });
});

describe('isSameOriginRequest', () => {
  const origin = 'https://esencialescol.com';

  it('always allows reading pages', () => {
    expect(isSameOriginRequest('GET', null, origin)).toBe(true);
  });

  it('allows changes only from our own pages', () => {
    expect(isSameOriginRequest('POST', origin, origin)).toBe(true);
    expect(isSameOriginRequest('delete', origin, origin)).toBe(true);
    expect(isSameOriginRequest('POST', 'https://sitio-malicioso.com', origin)).toBe(false);
    expect(isSameOriginRequest('PUT', null, origin)).toBe(false);
  });
});

describe('order rate limit', () => {
  it('blocks from the limit on', () => {
    expect(isOverOrderLimit(ORDER_LIMIT_PER_HOUR - 1)).toBe(false);
    expect(isOverOrderLimit(ORDER_LIMIT_PER_HOUR)).toBe(true);
  });

  it('never exposes the IP and depends on the secret salt', async () => {
    const hash = await hashClientIp('181.50.10.20', 'secreto');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('181');
    expect(await hashClientIp('181.50.10.20', 'secreto')).toBe(hash);
    expect(await hashClientIp('181.50.10.20', 'otro-secreto')).not.toBe(hash);
  });
});

describe('describeActivity', () => {
  it('turns action codes into Spanish text', () => {
    expect(describeActivity('order.confirmed')).toBe('Confirmó el pedido');
    expect(describeActivity('algo.raro')).toBe('algo.raro');
  });
});
