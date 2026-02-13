import { db } from "../config/database.js";

export interface CreateSubscriptionParams {
  userId: string;
  listId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodEnd: string | null;
}

export interface UpdateSubscriptionParams {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
}

/**
 * Create a new subscription in the database
 */
export async function createSubscription(
  params: CreateSubscriptionParams,
): Promise<string> {
  const id = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO subscriptions (
        id, user_id, list_id, stripe_subscription_id, 
        stripe_customer_id, status, current_period_end, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, list_id) DO UPDATE SET
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_customer_id = excluded.stripe_customer_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end
    `,
    args: [
      id,
      params.userId,
      params.listId,
      params.stripeSubscriptionId,
      params.stripeCustomerId,
      params.status,
      params.currentPeriodEnd,
    ],
  });

  return id;
}

/**
 * Update subscription by Stripe subscription ID
 * Returns number of rows affected
 */
export async function updateSubscriptionByStripeId(
  params: UpdateSubscriptionParams,
): Promise<number> {
  const result = await db.execute({
    sql: `
      UPDATE subscriptions 
      SET status = ?, current_period_end = ?
      WHERE stripe_subscription_id = ?
    `,
    args: [params.status, params.currentPeriodEnd, params.stripeSubscriptionId],
  });

  return result.rowsAffected;
}

/**
 * Cancel (delete) subscription by Stripe subscription ID
 */
export async function cancelSubscriptionByStripeId(
  stripeSubscriptionId: string,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE subscriptions 
      SET status = 'canceled'
      WHERE stripe_subscription_id = ?
    `,
    args: [stripeSubscriptionId],
  });
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const result = await db.execute({
    sql: "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?",
    args: [stripeSubscriptionId],
  });

  return result.rows[0] || null;
}

/**
 * Get subscription by ID and user ID (for authorization)
 */
export async function getSubscriptionByIdAndUser(
  subscriptionId: string,
  userId: string,
) {
  const result = await db.execute({
    sql: "SELECT * FROM subscriptions WHERE id = ? AND user_id = ?",
    args: [subscriptionId, userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as {
    id: string;
    user_id: string;
    list_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: string;
    current_period_end: string | null;
    created_at: string;
  };
}

/**
 * Check if user has active subscription to a list
 */
/**
 * Get canceled subscriptions for a Stripe customer (for resubscription matching)
 */
export async function getCanceledSubscriptionsForCustomer(
  stripeCustomerId: string,
) {
  const result = await db.execute({
    sql: `
      SELECT * FROM subscriptions
      WHERE stripe_customer_id = ?
        AND status = 'canceled'
      ORDER BY created_at DESC
    `,
    args: [stripeCustomerId],
  });

  return result.rows as unknown as Array<{
    id: string;
    user_id: string;
    list_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: string;
    current_period_end: string | null;
    created_at: string;
  }>;
}

export async function hasActiveSubscription(
  userId: string,
  listId: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: `
      SELECT id FROM subscriptions 
      WHERE user_id = ? 
        AND list_id = ? 
        AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > datetime('now'))
      LIMIT 1
    `,
    args: [userId, listId],
  });

  return result.rows.length > 0;
}

/**
 * Get all subscriptions for a user (any status) — used for account deletion
 */
export async function getAllUserSubscriptions(userId: string) {
  const result = await db.execute({
    sql: "SELECT * FROM subscriptions WHERE user_id = ?",
    args: [userId],
  });

  return result.rows as unknown as Array<{
    id: string;
    user_id: string;
    list_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: string;
    current_period_end: string | null;
    created_at: string;
  }>;
}

/**
 * Get emails of active subscribers for a list who have email notifications enabled.
 * Used for sending list update notifications.
 */
export async function getListSubscribersWithNotifications(
  listId: string,
): Promise<Array<{ email: string; userId: string }>> {
  const result = await db.execute({
    sql: `
      SELECT u.id as user_id, u.email
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.list_id = ?
        AND s.status = 'active'
        AND u.email_notifications_on = 1
        AND u.email IS NOT NULL
        AND u.email != ''
    `,
    args: [listId],
  });

  return result.rows as unknown as Array<{ email: string; userId: string }>;
}
