// Runs every migration (schema + reference data) and the checks on in-memory Postgres (PGlite).
// No Docker, no Supabase stack.
//   npm i -D @electric-sql/pglite && node supabase/checks/run.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'); // supabase/ dir
const files = [
  join(root, 'checks', '00_auth_stub.sql'),
  ...readdirSync(join(root, 'migrations')).sort().map((f) => join(root, 'migrations', f)),
  join(root, 'checks', '20_seed.sql'), // reference data first, before fixtures are added
  join(root, 'checks', '10_rls_and_ledger.sql'),
];

const db = new PGlite();
for (const file of files) {
  try {
    const results = await db.exec(readFileSync(file, 'utf8'));
    const last = results.at(-1)?.rows?.[0];
    console.log(`ok  ${file.slice(root.length + 1)}${last?.result ? `  ${last.result}` : ''}`);
  } catch (err) {
    console.error(`FAILED in ${file.slice(root.length + 1)}: ${err.message}`);
    process.exit(1);
  }
}
