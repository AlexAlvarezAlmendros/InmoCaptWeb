import { db } from "../config/database.js";
import type { AuthUser } from "../plugins/auth.js";

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
  email_notifications_on: number;
  stripe_customer_id: string | null;
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

    // Update email if changed
    if (authUser.email && user.email !== authUser.email) {
      await db.execute({
        sql: "UPDATE users SET email = ? WHERE id = ?",
        args: [authUser.email, authUser.sub],
      });
      return { ...user, email: authUser.email };
    }

    return user;
  }

  // Create new user
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO users (id, email, created_at, email_notifications_on)
      VALUES (?, ?, ?, 1)
    `,
    args: [authUser.sub, authUser.email || "", now],
  });

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
        (SELECT COUNT(*) FROM properties p 
         WHERE p.list_id = l.id 
         AND NOT EXISTS (
           SELECT 1 FROM property_agent_state pas 
           WHERE pas.property_id = p.id AND pas.user_id = ?
         )
        ) as new_properties_count
      FROM subscriptions s
      JOIN lists l ON l.id = s.list_id
      WHERE s.user_id = ?
        AND s.status IN ('active', 'past_due')
      ORDER BY s.created_at DESC
    `,
    args: [userId, userId],
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
