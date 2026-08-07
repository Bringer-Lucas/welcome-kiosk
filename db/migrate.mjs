// Applies db/migrations/*.sql in filename order, once each.
//
//   npm run migrate                     # against DATABASE_URL
//   railway run npm run migrate         # against the Railway Postgres
//
// Deliberately not an ORM migration tool. Three tables and a handful of
// indexes do not need one.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  // Railway's Postgres presents a self-signed cert on the public proxy.
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  let ran = 0;
  for (const filename of files) {
    if (applied.has(filename)) continue;

    const sql = await readFile(join(MIGRATIONS_DIR, filename), "utf8");

    // Each migration is one transaction: a failure half-way leaves nothing behind.
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`✗ ${filename}`);
      throw err;
    }

    console.log(`✓ ${filename}`);
    ran++;
  }

  console.log(ran === 0 ? "Already up to date." : `Applied ${ran} migration(s).`);
} finally {
  await client.end();
}
