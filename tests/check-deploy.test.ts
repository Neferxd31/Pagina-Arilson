import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const READY_CONFIG = `{
  // comments like this one are allowed in wrangler.jsonc
  "d1_databases": [{ "binding": "DB", "database_id": "0f1e2d3c-aaaa-bbbb-cccc-1234567890ab" }],
  "vars": {
    "ACCESS_TEAM_DOMAIN": "esencialescol.cloudflareaccess.com",
    "ACCESS_AUD": "${'a1'.repeat(32)}",
    "ADMIN_EMAILS": "arilson@gmail.com",
    "TURNSTILE_SITE_KEY": "0x4AAAAAAAreal"
  }
}`;

function runCheck(config: string) {
  const path = join(mkdtempSync(join(tmpdir(), 'check-deploy-')), 'wrangler.jsonc');
  writeFileSync(path, config);
  return spawnSync(process.execPath, ['scripts/check-deploy.mjs', '--config', path], { encoding: 'utf8' });
}

describe('check-deploy script', () => {
  it('passes a fully configured project', () => {
    const result = runCheck(READY_CONFIG);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Configuración lista');
  });

  it('stops the deploy when something is missing', () => {
    const result = runCheck(`{
      "d1_databases": [{ "binding": "DB" }],
      "vars": { "ACCESS_TEAM_DOMAIN": "", "ACCESS_AUD": "", "ADMIN_EMAILS": "", "TURNSTILE_SITE_KEY": "1x00000000000000000000AA" }
    }`);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('database_id');
    expect(result.stdout).toContain('ACCESS_TEAM_DOMAIN');
    expect(result.stdout).toContain('ACCESS_AUD');
    expect(result.stdout).toContain('ADMIN_EMAILS');
    expect(result.stdout).toContain('clave de prueba');
  });

  it('fails with the current repository configuration until Cloudflare is set up', () => {
    const result = spawnSync(process.execPath, ['scripts/check-deploy.mjs'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
  });
});
