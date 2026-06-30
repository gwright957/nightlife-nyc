import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const migrationPath = path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20250625000000_init",
    "migration.sql"
  );

  const sql = fs.readFileSync(migrationPath, "utf-8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(
      `
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
      VALUES ($1, $2, now(), $3, 1)
      ON CONFLICT DO NOTHING
      `,
      [
        "20250625000000_init",
        "manual",
        "20250625000000_init",
      ]
    );

    console.log("Migration applied successfully");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
