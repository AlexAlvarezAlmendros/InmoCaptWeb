import { db } from "../config/database.js";

export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  max_lists: number | null;
  monthly_credits: number;
  stripe_price_id: string | null;
  trial_duration_days: number | null;
  active: number;
  sort_order: number;
  created_at: string;
}

export interface UserPlanSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  pending_plan_id: string | null;
  first_month_free: number;
  renewal_reminder_sent_at: string | null;
  created_at: string;
}

export interface PendingListChange {
  id: string;
  user_id: string;
  action: "add" | "remove" | "swap";
  list_id: string;
  replace_list_id: string | null;
  apply_at: string;
  applied_at: string | null;
  created_at: string;
}

export const TRIAL_PLAN_ID = "trial";

export async function getPlanById(planId: string): Promise<Plan | null> {
  const result = await db.execute({
    sql: "SELECT * FROM plans WHERE id = ?",
    args: [planId],
  });
  return (result.rows[0] as unknown as Plan) || null;
}

export async function getAllActivePlans(): Promise<Plan[]> {
  const result = await db.execute(
    "SELECT * FROM plans WHERE active = 1 AND id != 'trial' ORDER BY sort_order ASC",
  );
  return result.rows as unknown as Plan[];
}

export async function getAllPlansIncludingTrial(): Promise<Plan[]> {
  const result = await db.execute(
    "SELECT * FROM plans ORDER BY sort_order ASC",
  );
  return result.rows as unknown as Plan[];
}

export async function getUserActivePlanSubscription(
  userId: string,
): Promise<UserPlanSubscription | null> {
  const result = await db.execute({
    sql: "SELECT * FROM user_plan_subscriptions WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  return (result.rows[0] as unknown as UserPlanSubscription) || null;
}

export interface UserPlanWithDefinition {
  subscription: UserPlanSubscription;
  plan: Plan;
  isActive: boolean;
}

export async function getUserPlanWithDefinition(
  userId: string,
): Promise<UserPlanWithDefinition | null> {
  const sub = await getUserActivePlanSubscription(userId);
  if (!sub) return null;
  const plan = await getPlanById(sub.plan_id);
  if (!plan) return null;
  const isActive =
    (sub.status === "active" || sub.status === "canceling") &&
    (!sub.current_period_end ||
      new Date(sub.current_period_end) > new Date());
  return { subscription: sub, plan, isActive };
}

/**
 * Create a trial subscription + grant initial credits. Idempotent:
 * - If the user already has any user_plan_subscriptions row → no-op.
 * - If users.trial_used = 1 → no-op (user already consumed their trial).
 */
export async function createTrialForUser(userId: string): Promise<{
  created: boolean;
  subscription?: UserPlanSubscription;
}> {
  const existing = await getUserActivePlanSubscription(userId);
  if (existing) return { created: false };

  const userRow = await db.execute({
    sql: "SELECT trial_used FROM users WHERE id = ?",
    args: [userId],
  });
  if (userRow.rows.length === 0) return { created: false };
  const trialUsed = (userRow.rows[0] as unknown as { trial_used: number })
    .trial_used;
  if (trialUsed === 1) return { created: false };

  const trial = await getPlanById(TRIAL_PLAN_ID);
  if (!trial) {
    throw new Error("Trial plan not found in plans table");
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const end = new Date(
    now.getTime() + (trial.trial_duration_days ?? 7) * 24 * 60 * 60 * 1000,
  );

  await db.execute({
    sql: `
      INSERT INTO user_plan_subscriptions (
        id, user_id, plan_id, status,
        current_period_start, current_period_end
      )
      VALUES (?, ?, ?, 'active', ?, ?)
    `,
    args: [id, userId, TRIAL_PLAN_ID, now.toISOString(), end.toISOString()],
  });

  await db.execute({
    sql: "UPDATE users SET trial_used = 1 WHERE id = ?",
    args: [userId],
  });

  return {
    created: true,
    subscription: {
      id,
      user_id: userId,
      plan_id: TRIAL_PLAN_ID,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      pending_plan_id: null,
      first_month_free: 0,
      renewal_reminder_sent_at: null,
      created_at: now.toISOString(),
    },
  };
}

/**
 * Upsert a paid plan subscription. Called from Stripe webhook after checkout.
 * Replaces any existing subscription row (including expired trial).
 *
 * `firstMonthFree` marks subscriptions whose first invoice was fully covered by
 * a promo code: their next renewal is the first real charge, so the reminder job
 * warns them beforehand. Any new upsert resets the flag and the reminder stamp.
 */
export async function upsertPaidPlanSubscription(params: {
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  firstMonthFree?: boolean;
}): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO user_plan_subscriptions (
        id, user_id, plan_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end, first_month_free,
        renewal_reminder_sent_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_customer_id = excluded.stripe_customer_id,
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        pending_plan_id = NULL,
        first_month_free = excluded.first_month_free,
        renewal_reminder_sent_at = NULL
    `,
    args: [
      id,
      params.userId,
      params.planId,
      params.stripeSubscriptionId,
      params.stripeCustomerId,
      params.status,
      params.currentPeriodStart,
      params.currentPeriodEnd,
      params.firstMonthFree ? 1 : 0,
    ],
  });
}

/* ─── First month free (promo) ──────────────────────────────── */

export interface PendingRenewalReminder {
  user_id: string;
  email: string;
  plan_id: string;
  plan_name: string;
  price_cents: number;
  currency: string;
  current_period_end: string;
}

/**
 * Subscriptions whose free first month ends within `daysAhead` days and that
 * haven't been warned yet. Users who already cancelled ('canceling') are
 * excluded: they won't be charged, so the notice would be misleading.
 */
export async function getSubscriptionsPendingRenewalReminder(
  daysAhead: number,
): Promise<PendingRenewalReminder[]> {
  const result = await db.execute({
    sql: `
      SELECT
        s.user_id,
        u.email,
        s.plan_id,
        p.name AS plan_name,
        p.price_cents,
        p.currency,
        s.current_period_end
      FROM user_plan_subscriptions s
      JOIN users u ON u.id = s.user_id
      JOIN plans p ON p.id = s.plan_id
      WHERE s.first_month_free = 1
        AND s.renewal_reminder_sent_at IS NULL
        AND s.status = 'active'
        AND s.stripe_subscription_id IS NOT NULL
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end > datetime('now')
        AND s.current_period_end <= datetime('now', ?)
        AND u.email IS NOT NULL
    `,
    args: [`+${daysAhead} days`],
  });
  return result.rows as unknown as PendingRenewalReminder[];
}

export async function markRenewalReminderSent(userId: string): Promise<void> {
  await db.execute({
    sql: `
      UPDATE user_plan_subscriptions
      SET renewal_reminder_sent_at = datetime('now')
      WHERE user_id = ?
    `,
    args: [userId],
  });
}

/**
 * Clear the promo flag once the first real charge has gone through, so the
 * reminder can never fire again for later renewals.
 */
export async function clearFirstMonthFree(
  stripeSubscriptionId: string,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE user_plan_subscriptions
      SET first_month_free = 0
      WHERE stripe_subscription_id = ?
    `,
    args: [stripeSubscriptionId],
  });
}

export async function setPendingDowngrade(
  userId: string,
  pendingPlanId: string | null,
): Promise<void> {
  await db.execute({
    sql: "UPDATE user_plan_subscriptions SET pending_plan_id = ? WHERE user_id = ?",
    args: [pendingPlanId, userId],
  });
}

export async function setPlanSubscriptionStatus(
  userId: string,
  status: string,
): Promise<void> {
  await db.execute({
    sql: "UPDATE user_plan_subscriptions SET status = ? WHERE user_id = ?",
    args: [status, userId],
  });
}

export async function setPlanPeriodEnd(
  stripeSubscriptionId: string,
  periodEnd: string | null,
  status: string,
): Promise<number> {
  const result = await db.execute({
    sql: `
      UPDATE user_plan_subscriptions
      SET current_period_end = ?, status = ?
      WHERE stripe_subscription_id = ?
    `,
    args: [periodEnd, status, stripeSubscriptionId],
  });
  return result.rowsAffected;
}

/* ─── List access ───────────────────────────────────────────── */

export async function getUserListAccessIds(userId: string): Promise<string[]> {
  const result = await db.execute({
    sql: "SELECT list_id FROM user_list_access WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.map((r) => (r as unknown as { list_id: string }).list_id);
}

/**
 * Checks if the user can access a given list based on their active plan.
 * Unlimited (max_lists IS NULL) → true. Starter/Pro/Trial → check user_list_access.
 */
export async function canAccessList(
  userId: string,
  listId: string,
): Promise<boolean> {
  const userPlan = await getUserPlanWithDefinition(userId);
  if (!userPlan || !userPlan.isActive) return false;

  if (userPlan.plan.max_lists === null) return true;

  const result = await db.execute({
    sql: "SELECT 1 FROM user_list_access WHERE user_id = ? AND list_id = ? LIMIT 1",
    args: [userId, listId],
  });
  return result.rows.length > 0;
}

/**
 * Add a list to the user's access. Validates against plan.max_lists.
 * Used during trial activation and first-time slot fill. After that, changes
 * must go through pending_list_changes.
 */
export async function addUserListAccess(
  userId: string,
  listId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const userPlan = await getUserPlanWithDefinition(userId);
  if (!userPlan) return { ok: false, reason: "no_plan" };
  if (!userPlan.isActive) return { ok: false, reason: "plan_inactive" };
  const current = await getUserListAccessIds(userId);
  if (current.includes(listId)) return { ok: true };
  if (userPlan.plan.max_lists !== null && current.length >= userPlan.plan.max_lists) {
    return { ok: false, reason: "quota_full" };
  }

  await db.execute({
    sql: "INSERT OR IGNORE INTO user_list_access (user_id, list_id) VALUES (?, ?)",
    args: [userId, listId],
  });
  return { ok: true };
}

export async function removeUserListAccess(
  userId: string,
  listId: string,
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM user_list_access WHERE user_id = ? AND list_id = ?",
    args: [userId, listId],
  });
}

export async function clearUserListAccess(userId: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM user_list_access WHERE user_id = ?",
    args: [userId],
  });
}

/* ─── Pending list changes ──────────────────────────────────── */

export async function requestListChange(params: {
  userId: string;
  action: "add" | "remove" | "swap";
  listId: string;
  replaceListId?: string;
  applyAt: string;
}): Promise<PendingListChange> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO pending_list_changes (id, user_id, action, list_id, replace_list_id, apply_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      params.userId,
      params.action,
      params.listId,
      params.replaceListId ?? null,
      params.applyAt,
    ],
  });
  return {
    id,
    user_id: params.userId,
    action: params.action,
    list_id: params.listId,
    replace_list_id: params.replaceListId ?? null,
    apply_at: params.applyAt,
    applied_at: null,
    created_at: new Date().toISOString(),
  };
}

export async function getPendingListChanges(
  userId: string,
): Promise<PendingListChange[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM pending_list_changes
      WHERE user_id = ? AND applied_at IS NULL
      ORDER BY created_at ASC
    `,
    args: [userId],
  });
  return result.rows as unknown as PendingListChange[];
}

export async function cancelPendingListChange(
  userId: string,
  changeId: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: "DELETE FROM pending_list_changes WHERE id = ? AND user_id = ? AND applied_at IS NULL",
    args: [changeId, userId],
  });
  return result.rowsAffected > 0;
}

/**
 * Apply all pending list changes for a user (called on plan renewal).
 */
export async function applyPendingListChanges(userId: string): Promise<number> {
  const pending = await getPendingListChanges(userId);
  for (const change of pending) {
    if (change.action === "add") {
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_list_access (user_id, list_id) VALUES (?, ?)",
        args: [userId, change.list_id],
      });
    } else if (change.action === "remove") {
      await removeUserListAccess(userId, change.list_id);
    } else if (change.action === "swap" && change.replace_list_id) {
      await removeUserListAccess(userId, change.replace_list_id);
      await db.execute({
        sql: "INSERT OR IGNORE INTO user_list_access (user_id, list_id) VALUES (?, ?)",
        args: [userId, change.list_id],
      });
    }
    await db.execute({
      sql: "UPDATE pending_list_changes SET applied_at = datetime('now') WHERE id = ?",
      args: [change.id],
    });
  }
  return pending.length;
}
