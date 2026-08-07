import { Pool, type PoolClient } from "pg";

// One pool per process, reused across hot reloads in dev so we don't exhaust
// Postgres connections. Railway's smallest Postgres has a modest limit.
//
// Created lazily: the build machine has no DATABASE_URL, and connecting at
// module load would fail the build rather than the request.
const globalForDb = globalThis as unknown as { pool?: Pool };

export function getPool(): Pool {
  if (globalForDb.pool) return globalForDb.pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. See .env.example.");

  const pool = new Pool({
    connectionString,
    // Railway's Postgres presents a self-signed cert on the public proxy.
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 5,
  });

  globalForDb.pool = pool;
  return pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/**
 * Runs `fn` inside a transaction on a single connection. A check-in writes a
 * photo, a visit and a print job; a visitor with no badge queued, or a badge
 * for a visit that doesn't exist, are both worse than a failed check-in.
 */
export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
