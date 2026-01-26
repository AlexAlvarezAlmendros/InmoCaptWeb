-- InmoCapt Database Schema
-- SQLite / Turso

-- Users table (Auth0 users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Auth0 sub
  email TEXT NOT NULL UNIQUE,
  email_notifications_on INTEGER DEFAULT 1,
  stripe_customer_id TEXT,  -- Stripe customer ID for billing
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_list_id ON properties(list_id);
CREATE INDEX IF NOT EXISTS idx_properties_list_created ON properties(list_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_list_id ON subscriptions(list_id);
CREATE INDEX IF NOT EXISTS idx_property_agent_state_user ON property_agent_state(user_id);
CREATE INDEX IF NOT EXISTS idx_list_requests_status ON list_requests(status);
CREATE INDEX IF NOT EXISTS idx_list_requests_user ON list_requests(user_id);
