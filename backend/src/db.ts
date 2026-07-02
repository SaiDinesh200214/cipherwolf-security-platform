import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg, { type QueryResultRow } from "pg";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaFile = join(__dirname, "..", "db", "schema.sql");
const databaseUrl = new URL(config.databaseUrl);
const useSsl = databaseUrl.searchParams.has("sslmode") && databaseUrl.searchParams.get("sslmode") !== "disable";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: config.databaseSslRejectUnauthorized } : undefined,
  max: 12,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function initDatabase() {
  const schema = await readFile(schemaFile, "utf8");
  await pool.query(schema);
}
