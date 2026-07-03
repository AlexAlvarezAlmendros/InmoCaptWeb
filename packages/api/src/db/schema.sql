-- InmoCapt Database Schema
-- SQLite / Turso

-- Users table (Auth0 users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Auth0 sub
  email TEXT NOT NULL UNIQUE,
  email_notifications_on INTEGER DEFAULT 1,
  stripe_customer_id TEXT,  -- Stripe customer ID for billing
  last_login TEXT,
  is_test_user INTEGER DEFAULT 0,
  trial_used INTEGER DEFAULT 0,  -- 1 once the free trial has been consumed
  blocked INTEGER DEFAULT 0,  -- 1 = access revoked by an admin
  created_at TEXT DEFAULT (datetime('now'))
);

-- Lists table
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  last_updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  m2 INTEGER,
  bedrooms INTEGER,
  phone TEXT,
  owner_name TEXT,
  source_url TEXT,
  raw_payload TEXT,  -- JSON string for additional data
  discontinued INTEGER DEFAULT 0,  -- 1 = delisted, excluded from price calculation
  created_at TEXT DEFAULT (datetime('now'))
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active',  -- active, canceled, past_due
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, list_id)
);

-- Property agent state (user-specific state for properties)
CREATE TABLE IF NOT EXISTS property_agent_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  state TEXT DEFAULT 'new',  -- new, contacted, captured, rejected
  comment TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, property_id)
);

-- List requests table
CREATE TABLE IF NOT EXISTS list_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected
  created_list_id TEXT REFERENCES lists(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- List updates history
CREATE TABLE IF NOT EXISTS list_updates (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  added_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Settings table (platform configuration key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Default platform settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('price_per_property_cents', '100');

-- ─────────────────────────────────────────────────────────────
-- Subscription model v2: plans + credits
-- ─────────────────────────────────────────────────────────────

-- Plan catalogue (editable from admin)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,              -- 'trial', 'starter', 'pro', 'unlimited'
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,     -- 0 for trial
  currency TEXT DEFAULT 'EUR',
  max_lists INTEGER,                -- NULL = unlimited
  monthly_credits INTEGER NOT NULL, -- granted on each renewal (trial: granted once)
  stripe_price_id TEXT,             -- NULL for trial
  trial_duration_days INTEGER,      -- only set for trial plan
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- One active plan per user (replaces per-list subscriptions going forward)
CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active',     -- active, canceled, past_due, expired
  current_period_start TEXT,
  current_period_end TEXT,
  pending_plan_id TEXT REFERENCES plans(id), -- set when downgrade is scheduled
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

-- Which lists a user has activated within their plan quota
-- (Unlimited users do not need rows here: access is derived from plan)
CREATE TABLE IF NOT EXISTS user_list_access (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  activated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, list_id)
);

-- Credit balance (plan_credits expire on renewal, topup_credits do not)
CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_credits INTEGER DEFAULT 0,
  topup_credits INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Immutable ledger of every credit movement
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,               -- grant_plan, grant_topup, spend_reveal, expire, refund, admin_adjust
  amount INTEGER NOT NULL,          -- signed: +grants, -spends
  bucket TEXT NOT NULL,             -- 'plan' or 'topup' (which bucket was touched)
  balance_plan_after INTEGER NOT NULL,
  balance_topup_after INTEGER NOT NULL,
  related_property_id TEXT,
  related_stripe_id TEXT,
  metadata TEXT,                    -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);

-- Permanent unlock of a property's contact info for a user
CREATE TABLE IF NOT EXISTS user_property_reveals (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  revealed_at TEXT DEFAULT (datetime('now')),
  credit_transaction_id TEXT REFERENCES credit_transactions(id),
  PRIMARY KEY (user_id, property_id)
);

-- One-off credit packs (top-ups)
CREATE TABLE IF NOT EXISTS credit_packs (
  id TEXT PRIMARY KEY,              -- 'pack_s', 'pack_m', 'pack_l'
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  stripe_price_id TEXT,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

-- Scheduled list changes for Starter/Pro users (applied on next period renewal)
CREATE TABLE IF NOT EXISTS pending_list_changes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,             -- 'add', 'remove', 'swap'
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,         -- the new list
  replace_list_id TEXT REFERENCES lists(id) ON DELETE CASCADE,          -- only for 'swap'
  apply_at TEXT NOT NULL,
  applied_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed: initial plans. max_lists NULL = unlimited. price_cents in EUR cents.
INSERT OR IGNORE INTO plans (id, name, price_cents, max_lists, monthly_credits, trial_duration_days, sort_order)
VALUES
  ('trial',     'Prueba gratuita', 0,     1,    3,   7, 0),
  ('starter',   'Starter',         2900,  1,    30,  NULL, 1),
  ('pro',       'Pro',             6900,  2,    100, NULL, 2),
  ('unlimited', 'Unlimited',       14900, NULL, 300, NULL, 3);

-- Seed: credit packs
INSERT OR IGNORE INTO credit_packs (id, name, credits, price_cents, sort_order)
VALUES
  ('pack_s', 'Pack S', 20,  1200, 1),
  ('pack_m', 'Pack M', 60,  3000, 2),
  ('pack_l', 'Pack L', 150, 6000, 3);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_list_id ON properties(list_id);
CREATE INDEX IF NOT EXISTS idx_properties_list_created ON properties(list_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_list_id ON subscriptions(list_id);
CREATE INDEX IF NOT EXISTS idx_property_agent_state_user ON property_agent_state(user_id);
CREATE INDEX IF NOT EXISTS idx_list_requests_status ON list_requests(status);
CREATE INDEX IF NOT EXISTS idx_list_requests_user ON list_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_sub_status ON user_plan_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_user_list_access_user ON user_list_access(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reveals_user ON user_property_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_list_changes_user ON pending_list_changes(user_id, applied_at);
