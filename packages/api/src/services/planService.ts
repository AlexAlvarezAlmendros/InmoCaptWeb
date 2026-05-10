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
      created_at: now.toISOString(),
    },
  };
}

/**
 * Upsert a paid plan subscription. Called from Stripe webhook after checkout.
 * Replaces any existing subscription row (including expired trial).
 */
export async function upsertPaidPlanSubscription(params: {
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO user_plan_subscriptions (
        id, user_id, plan_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_customer_id = excluded.stripe_customer_id,
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        pending_plan_id = NULL
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
    ],
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
  if (userPlan.plan.max_lists === null) {
    return { ok: true };
  }

  const current = await getUserListAccessIds(userId);
  if (current.includes(listId)) return { ok: true };
  if (current.length >= userPlan.plan.max_lists) {
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
