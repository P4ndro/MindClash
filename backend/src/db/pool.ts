import { env } from "../config/env";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export const checkDBConnection = async () => {
  await pool.query("SELECT 1");
};