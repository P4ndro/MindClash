import { pool } from "../../db/pool";

export type UserRow = {
  id: string | number;
  clerk_id: string;
  username: string;
  rating: number;
  created_at: string;
};

export const findUserByClerkId = async (
  clerkId: string,
): Promise<UserRow | null> => {
  const result = await pool.query<UserRow>(
    `SELECT id, clerk_id, username, rating, created_at
     FROM users
     WHERE clerk_id = $1
     LIMIT 1`,
    [clerkId],
  );

  return result.rows[0] ?? null;
};

export const createUser = async (
  clerkId: string,
  username: string,
): Promise<UserRow> => {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (clerk_id, username)
     VALUES ($1, $2)
     RETURNING id, clerk_id, username, rating, created_at`,
    [clerkId, username],
  );

  return result.rows[0];
};

export const listUsers = async (): Promise<UserRow[]> => {
  const result = await pool.query<UserRow>(
    `SELECT id, clerk_id, username, rating, created_at
     FROM users
     ORDER BY created_at DESC`,
  );

  return result.rows;
};

