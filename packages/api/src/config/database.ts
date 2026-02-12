import { createClient } from "@libsql/client";
import { env } from "./env.js";

export const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

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
