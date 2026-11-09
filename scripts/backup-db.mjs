// Descarga una copia completa de la base de datos de producción en backups/respaldo-AAAA-MM-DD-HHMM.sql
// Los respaldos tienen datos de clientes: nunca se suben a Git (ver .gitignore) y deben guardarse en un lugar seguro.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const output = `backups/respaldo-${stamp}.sql`;

mkdirSync('backups', { recursive: true });
execSync(`npx wrangler d1 export DB --remote --output=${output}`, { stdio: 'inherit' });
console.log(`\nRespaldo guardado en ${output}`);
