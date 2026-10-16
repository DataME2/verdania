// Runs the migrations + checks on in-memory Postgres (PGlite). No Docker, no Supabase stack.
//   npm i -D @electric-sql/pglite && node supabase/checks/run.mjs
// Pass 1: RLS + ledger checks on an empty schema. Pass 2: seed.sql loads and is readable.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'); // supabase/ dir
const migrations = readdirSync(join(root, 'migrations')).sort().map((f) => join(root, 'migrations', f));
const passes = [
  [join(root, 'checks', '00_auth_stub.sql'), ...migrations, join(root, 'checks', '10_rls_and_ledger.sql')],
  [join(root, 'checks', '00_auth_stub.sql'), ...migrations, join(root, 'seed.sql'), join(root, 'checks', '20_seed.sql')],
];

for (const files of passes) {
  const db = new PGlite();
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`missing ${file}`);
      process.exit(1);
    }
    try {
      const results = await db.exec(readFileSync(file, 'utf8'));
      const last = results.at(-1)?.rows?.[0];
      console.log(`ok  ${file.slice(root.length + 1)}${last?.result ? `  ${last.result}` : ''}`);
    } catch (err) {
      console.error(`FAILED in ${file.slice(root.length + 1)}: ${err.message}`);
      process.exit(1);
    }
  }
  await db.close();
}
