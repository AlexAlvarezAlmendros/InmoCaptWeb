import { db } from "../config/database.js";
import type { AuthUser } from "../plugins/auth.js";
import { sendWelcomeEmail } from "./emailService.js";

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
  last_login: string | null;
  email_notifications_on: number;
  stripe_customer_id: string | null;
  is_test_user: number;
}

export interface AdminUserWithStats extends DbUser {
  active_subscription_count: number;
  total_subscription_count: number;
  estimated_monthly_spend_cents: number;
}

export interface AdminUserSubscription {
  id: string;
  list_id: string;
  list_name: string;
  list_location: string;
  status: string;
  price_cents: number;
  currency: string;
  current_period_end: string | null;
  created_at: string;
  stripe_subscription_id: string | null;
}

export interface AdminUserDetail extends AdminUserWithStats {
  subscriptions: AdminUserSubscription[];
}

export interface UserSubscription {
  id: string;
  list_id: string;
  list_name: string;
  list_location: string;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  price_cents: number;
  currency: string;
  last_updated_at: string;
  total_properties: number;
  new_properties_count: number;
}

/**
 * Upsert user on first authenticated request
 * Creates user if doesn't exist, updates email if changed
 */
export async function ensureUserExists(authUser: AuthUser): Promise<DbUser> {
  // Check if user exists
  const existing = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [authUser.sub],
  });

  if (existing.rows.length > 0) {
    const user = existing.rows[0] as unknown as DbUser;

    // Update email if changed and last_login timestamp
    const updatedEmail =
      authUser.email && user.email !== authUser.email
        ? authUser.email
        : user.email;

    await db.execute({
      sql: "UPDATE users SET email = ?, last_login = datetime('now') WHERE id = ?",
      args: [updatedEmail, authUser.sub],
    });

    return { ...user, email: updatedEmail };
  }

  // Create new user
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO users (id, email, created_at, email_notifications_on, last_login)
      VALUES (?, ?, ?, 1, datetime('now'))
    `,
    args: [authUser.sub, authUser.email || "", now],
  });

  // Send welcome email (fire-and-forget)
  if (authUser.email) {
    sendWelcomeEmail(authUser.email).catch((err) =>
      console.warn("[Email] Failed to send welcome email:", err),
    );
  }

  return {
    id: authUser.sub,
    email: authUser.email || "",
    created_at: now,
    email_notifications_on: 1,
    stripe_customer_id: null,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<DbUser | null> {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as DbUser;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: { emailNotificationsOn?: boolean },
): Promise<void> {
  if (preferences.emailNotificationsOn !== undefined) {
    await db.execute({
      sql: "UPDATE users SET email_notifications_on = ? WHERE id = ?",
      args: [preferences.emailNotificationsOn ? 1 : 0, userId],
    });
  }
}

/**
 * Update user's Stripe customer ID
 */
export async function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await db.execute({
    sql: "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
    args: [stripeCustomerId, userId],
  });
}

/**
 * Get user's active subscriptions with list details and property stats
 */
export async function getUserSubscriptions(
  userId: string,
): Promise<UserSubscription[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        s.id,
        s.list_id,
        l.name as list_name,
        l.location as list_location,
        s.status,
        s.current_period_end,
        s.stripe_subscription_id,
        l.price_cents,
        l.currency,
        l.last_updated_at,
        (SELECT COUNT(*) FROM properties WHERE list_id = l.id) as total_properties,
        COALESCE(
          (SELECT added_count FROM list_updates 
           WHERE list_id = l.id 
           ORDER BY created_at DESC LIMIT 1),
          0
        ) as new_properties_count
      FROM subscriptions s
      JOIN lists l ON l.id = s.list_id
      WHERE s.user_id = ?
        AND s.status IN ('active', 'past_due')
      ORDER BY s.created_at DESC
    `,
    args: [userId],
  });

  return result.rows as unknown as UserSubscription[];
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<DbUser | null> {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE stripe_customer_id = ?",
    args: [stripeCustomerId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as DbUser;
}

/**
 * Get user's Stripe customer ID
 */
export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const result = await db.execute({
    sql: "SELECT stripe_customer_id FROM users WHERE id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return (result.rows[0] as unknown as DbUser).stripe_customer_id;
}

/**
 * Delete a user and all their related data from the database.
 * Tables with ON DELETE CASCADE (subscriptions, property_agent_state, list_requests)
 * will be cleaned up automatically, but we delete explicitly for clarity.
 */
export async function deleteUser(userId: string): Promise<void> {
  // Delete property agent states
  await db.execute({
    sql: "DELETE FROM property_agent_state WHERE user_id = ?",
    args: [userId],
  });

  // Delete list requests
  await db.execute({
    sql: "DELETE FROM list_requests WHERE user_id = ?",
    args: [userId],
  });

  // Delete subscriptions
  await db.execute({
    sql: "DELETE FROM subscriptions WHERE user_id = ?",
    args: [userId],
  });

  // Delete the user
  await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [userId],
  });
}

/**
 * Get all users with subscription stats for admin panel
 */
/**
 * Set or unset a user as a test user
 */
export async function setUserTestStatus(
  userId: string,
  isTestUser: boolean,
): Promise<void> {
  await db.execute({
    sql: "UPDATE users SET is_test_user = ? WHERE id = ?",
    args: [isTestUser ? 1 : 0, userId],
  });
}

export async function getAllUsersWithStats(): Promise<AdminUserWithStats[]> {
  const result = await db.execute(`
    SELECT
      u.id,
      u.email,
      u.email_notifications_on,
      u.stripe_customer_id,
      u.last_login,
      u.is_test_user,
      u.created_at,
      COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_subscription_count,
      COUNT(DISTINCT s.id) AS total_subscription_count,
      COALESCE(SUM(CASE WHEN s.status = 'active' THEN l.price_cents ELSE 0 END), 0) AS estimated_monthly_spend_cents
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN lists l ON l.id = s.list_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);

  return result.rows as unknown as AdminUserWithStats[];
}

/**
 * Get a single user with their full subscription details for admin panel
 */
export async function getUserWithSubscriptions(
  userId: string,
): Promise<AdminUserDetail | null> {
  const userResult = await db.execute({
    sql: `
      SELECT
        u.id,
        u.email,
        u.email_notifications_on,
        u.stripe_customer_id,
        u.last_login,
        u.is_test_user,
        u.created_at,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_subscription_count,
        COUNT(DISTINCT s.id) AS total_subscription_count,
        COALESCE(SUM(CASE WHEN s.status = 'active' THEN l.price_cents ELSE 0 END), 0) AS estimated_monthly_spend_cents
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN lists l ON l.id = s.list_id
      WHERE u.id = ?
      GROUP BY u.id
    `,
    args: [userId],
  });

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0] as unknown as AdminUserWithStats;

  const subsResult = await db.execute({
    sql: `
      SELECT
        s.id,
        s.list_id,
        l.name AS list_name,
        l.location AS list_location,
        s.status,
        l.price_cents,
        l.currency,
        s.current_period_end,
        s.created_at,
        s.stripe_subscription_id
      FROM subscriptions s
      JOIN lists l ON l.id = s.list_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `,
    args: [userId],
  });

  return {
    ...user,
    subscriptions: subsResult.rows as unknown as AdminUserSubscription[],
  };
}
