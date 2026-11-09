// Revisa que el proyecto esté listo para producción antes de publicar en Cloudflare.
// Corre solo con `npm run deploy` (y a mano con `npm run check:deploy`). Si encuentra errores, detiene la publicación.
// Uso: node scripts/check-deploy.mjs [--config ruta/a/wrangler.jsonc]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Cloudflare's public Turnstile test keys start with 1x, 2x or 3x followed by zeros
const TEST_TURNSTILE_KEY = /^[123]x0{5,}/;
const PLACEHOLDER = /Lorem ipsum|\[Pendiente/;

// wrangler.jsonc allows // comments; remove them without touching "//" inside strings (like https://)
function stripJsonComments(text) {
  let output = '';
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && text[index - 1] !== '\\') inString = !inString;
    if (!inString && char === '/' && text[index + 1] === '/') {
      while (index < text.length && text[index] !== '\n') index++;
    }
    output += text[index] ?? '';
  }
  return output;
}

function findConfigErrors(config) {
  const errors = [];
  const vars = config.vars ?? {};

  if (!config.d1_databases?.[0]?.database_id) {
    errors.push('Falta "database_id" en d1_databases. Créala con: npx wrangler d1 create esencialescol');
  }
  if (!/\.cloudflareaccess\.com$/.test(vars.ACCESS_TEAM_DOMAIN ?? '')) {
    errors.push('ACCESS_TEAM_DOMAIN debe ser tu dominio de equipo de Zero Trust (algo.cloudflareaccess.com).');
  }
  if (!/^[a-f0-9]{64}$/.test(vars.ACCESS_AUD ?? '')) {
    errors.push('ACCESS_AUD debe ser el "Application Audience (AUD) Tag" de la aplicación de Access (64 caracteres).');
  }
  const adminEmails = (vars.ADMIN_EMAILS ?? '').split(',').filter((email) => email.includes('@'));
  if (adminEmails.length === 0) {
    errors.push('ADMIN_EMAILS está vacío: nadie podría entrar al admin. Pon el correo de Arilson.');
  }
  if (!vars.TURNSTILE_SITE_KEY || TEST_TURNSTILE_KEY.test(vars.TURNSTILE_SITE_KEY)) {
    errors.push('TURNSTILE_SITE_KEY tiene la clave de prueba: reemplázala por la Site Key real del widget de Turnstile.');
  }
  return errors;
}

function findPlaceholderFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true })
    .map((file) => join(directory, String(file)))
    .filter((path) => path.endsWith('.astro') && PLACEHOLDER.test(readFileSync(path, 'utf8')));
}

const configFlag = process.argv.indexOf('--config');
const configPath = configFlag > -1 ? process.argv[configFlag + 1] : 'wrangler.jsonc';
const config = JSON.parse(stripJsonComments(readFileSync(configPath, 'utf8')));

const errors = findConfigErrors(config);
const warnings = findPlaceholderFiles('src').map((path) => `Texto de ejemplo (lorem o [Pendiente]) en ${path}`);
if (existsSync('netlify.toml')) warnings.push('La vista previa de Netlify sigue en el proyecto (ver DEPLOY.md, fase 5).');

console.log('Revisión antes de publicar\n');
for (const warning of warnings) console.log(`  ⚠ ${warning}`);
for (const error of errors) console.log(`  ✗ ${error}`);
console.log('\n  Recuerda: la clave secreta de Turnstile se guarda con "npx wrangler secret put TURNSTILE_SECRET_KEY".');

if (errors.length > 0) {
  console.log(`\nPublicación detenida: ${errors.length} problema(s) en ${configPath}. Revisa DEPLOY.md.`);
  process.exit(1);
}
console.log(`\nConfiguración lista${warnings.length > 0 ? ' (revisa las advertencias)' : ''}.`);
