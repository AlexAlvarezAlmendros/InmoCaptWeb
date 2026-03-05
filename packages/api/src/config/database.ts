import { createClient } from "@libsql/client";
import { env } from "./env.js";

export const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

/**
 * Run any pending column migrations safely.
 * Uses try/catch so re-running on an already-migrated DB is safe.
 */
export async function runMigrations(): Promise<void> {
  const migrations: Array<{ sql: string; description: string }> = [
    {
      sql: "ALTER TABLE properties ADD COLUMN discontinued INTEGER DEFAULT 0",
      description: "Add discontinued column to properties",
    },
  ];

  for (const migration of migrations) {
    try {
      await db.execute(migration.sql);
      console.log(`✅ Migration applied: ${migration.description}`);
    } catch {
      // Column already exists or other benign error — skip silently
    }
  }
}

/**
 * Ensure the system automation user exists in the DB.
 * This prevents FK constraint errors when automation uploads
 * insert into list_updates with uploaded_by = 'system:automation'.
 */
export async function ensureSystemUser(): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, email_notifications_on) VALUES (?, ?, ?)`,
      args: ["system:automation", "automation@system.local", 0],
    });
  } catch (err) {
    console.warn("Could not ensure system user:", err);
  }
}
