// Shared test setup: a throwaway SQLite file built from src/db/schema.sql.
// Env vars are set before the app modules are imported (config/env.ts
// validates them at import time).
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dir = mkdtempSync(join(tmpdir(), "inmocapt-test-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.AUTH0_DOMAIN ??= "test.local";
process.env.AUTH0_AUDIENCE ??= "test";
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dummy";

const { db, runMigrations } = await import("../src/config/database.js");
export { db };

export const UPLOADER = "system:automation";
export const AGENT = "auth0|agent";

export async function initDb(): Promise<void> {
  await db.executeMultiple(
    readFileSync(new URL("../src/db/schema.sql", import.meta.url), "utf-8"),
  );
  await runMigrations();
  await db.execute({
    sql: "INSERT INTO users (id, email) VALUES (?, ?), (?, ?)",
    args: [UPLOADER, "automation@system.local", AGENT, "agent@example.com"],
  });
}

export async function resetData(): Promise<void> {
  await db.execute("DELETE FROM user_property_reveals");
  await db.execute("DELETE FROM properties");
  await db.execute("DELETE FROM list_updates");
  await db.execute("DELETE FROM lists");
}

export function closeDb(): void {
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

export async function createList(name: string): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO lists (id, name, location, price_cents) VALUES (?, ?, ?, 0)",
    args: [id, name, name],
  });
  return id;
}

export async function rows(listId: string) {
  const result = await db.execute({
    sql: `SELECT id, source_url, phone, discontinued, price, m2, bedrooms, raw_payload
          FROM properties WHERE list_id = ? ORDER BY created_at, id`,
    args: [listId],
  });
  return result.rows;
}

export async function insertRaw(
  listId: string,
  url: string,
  phone: string | null,
  createdAt: string,
  discontinued = 0,
  rawPayload: Record<string, unknown> | null = null,
): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO properties (id, list_id, price, m2, bedrooms, phone, source_url,
                                  raw_payload, discontinued, created_at)
          VALUES (?, ?, 100000, 80, 3, ?, ?, ?, ?, ?)`,
    args: [id, listId, phone, url, rawPayload ? JSON.stringify(rawPayload) : null,
           discontinued, createdAt],
  });
  return id;
}

export async function reveal(propertyId: string): Promise<void> {
  await db.execute({
    sql: "INSERT INTO user_property_reveals (user_id, property_id) VALUES (?, ?)",
    args: [AGENT, propertyId],
  });
}
