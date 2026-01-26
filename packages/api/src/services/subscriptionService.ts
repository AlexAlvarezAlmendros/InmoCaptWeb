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
 */
export async function updateSubscriptionByStripeId(
  params: UpdateSubscriptionParams,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE subscriptions 
      SET status = ?, current_period_end = ?
      WHERE stripe_subscription_id = ?
    `,
    args: [params.status, params.currentPeriodEnd, params.stripeSubscriptionId],
  });
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
 * Check if user has active subscription to a list
 */
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
