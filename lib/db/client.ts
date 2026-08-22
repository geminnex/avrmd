import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for persistent AVRMD workflows.");
  }

  pool ??= new Pool({ connectionString, max: 10 });
  database ??= drizzle({ client: pool, schema });

  return database;
}

export async function closeDatabase() {
  await pool?.end();
  pool = undefined;
  database = undefined;
}
