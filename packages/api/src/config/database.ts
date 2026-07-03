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
    {
      sql: `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      description: "Create settings table",
    },
    {
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('price_per_property_cents', '100')`,
      description: "Seed default price_per_property_cents setting",
    },
    {
      sql: "ALTER TABLE users ADD COLUMN last_login TEXT",
      description: "Add last_login column to users",
    },
    {
      sql: "ALTER TABLE users ADD COLUMN is_test_user INTEGER DEFAULT 0",
      description: "Add is_test_user column to users",
    },
    {
      sql: "ALTER TABLE users ADD COLUMN trial_used INTEGER DEFAULT 0",
      description: "Add trial_used column to users (subscription model v2)",
    },
    {
      sql: "ALTER TABLE users ADD COLUMN blocked INTEGER DEFAULT 0",
      description: "Add blocked column to users (revoke site access)",
    },
    {
      sql: "ALTER TABLE user_plan_subscriptions ADD COLUMN pending_plan_id TEXT REFERENCES plans(id)",
      description: "Add pending_plan_id for scheduled plan downgrades",
    },
    // ── Subscription model v2: create tables that may not exist yet ──────────
    {
      sql: `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        currency TEXT DEFAULT 'EUR',
        max_lists INTEGER,
        monthly_credits INTEGER NOT NULL,
        stripe_price_id TEXT,
        trial_duration_days INTEGER,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      description: "Create plans table (v2)",
    },
    {
      sql: `INSERT OR IGNORE INTO plans (id, name, price_cents, max_lists, monthly_credits, trial_duration_days, sort_order)
        VALUES
          ('trial',     'Prueba gratuita', 0,     1,    3,   7, 0),
          ('starter',   'Starter',         2900,  1,    30,  NULL, 1),
          ('pro',       'Pro',             6900,  2,    100, NULL, 2),
          ('unlimited', 'Unlimited',       14900, NULL, 300, NULL, 3)`,
      description: "Seed default plans (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES plans(id),
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        status TEXT DEFAULT 'active',
        current_period_start TEXT,
        current_period_end TEXT,
        pending_plan_id TEXT REFERENCES plans(id),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id)
      )`,
      description: "Create user_plan_subscriptions table (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_list_access (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        activated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, list_id)
      )`,
      description: "Create user_list_access table (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_credits (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        plan_credits INTEGER DEFAULT 0,
        topup_credits INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      description: "Create user_credits table (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        bucket TEXT NOT NULL,
        balance_plan_after INTEGER NOT NULL,
        balance_topup_after INTEGER NOT NULL,
        related_property_id TEXT,
        related_stripe_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      description: "Create credit_transactions table (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_property_reveals (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        revealed_at TEXT DEFAULT (datetime('now')),
        credit_transaction_id TEXT REFERENCES credit_transactions(id),
        PRIMARY KEY (user_id, property_id)
      )`,
      description: "Create user_property_reveals table (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS credit_packs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        credits INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        currency TEXT DEFAULT 'EUR',
        stripe_price_id TEXT,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      )`,
      description: "Create credit_packs table (v2)",
    },
    {
      sql: `INSERT OR IGNORE INTO credit_packs (id, name, credits, price_cents, sort_order)
        VALUES
          ('pack_s', 'Pack S', 20,  1200, 1),
          ('pack_m', 'Pack M', 60,  3000, 2),
          ('pack_l', 'Pack L', 150, 6000, 3)`,
      description: "Seed default credit packs (v2)",
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS pending_list_changes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        replace_list_id TEXT REFERENCES lists(id) ON DELETE CASCADE,
        apply_at TEXT NOT NULL,
        applied_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      description: "Create pending_list_changes table (v2)",
    },
    // ── Indexes ──────────────────────────────────────────────────────────────
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_user_plan_sub_status ON user_plan_subscriptions(status, current_period_end)",
      description: "Index user_plan_subscriptions by status",
    },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_user_list_access_user ON user_list_access(user_id)",
      description: "Index user_list_access by user",
    },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at)",
      description: "Index credit_transactions by user",
    },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_reveals_user ON user_property_reveals(user_id)",
      description: "Index user_property_reveals by user",
    },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_pending_list_changes_user ON pending_list_changes(user_id, applied_at)",
      description: "Index pending_list_changes by user",
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
