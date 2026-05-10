import { db } from "../config/database.js";

export type CreditTxType =
  | "grant_plan"
  | "grant_topup"
  | "spend_reveal"
  | "expire"
  | "refund"
  | "admin_adjust";

export type CreditBucket = "plan" | "topup";

export interface CreditBalance {
  planCredits: number;
  topupCredits: number;
  total: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTxType;
  amount: number;
  bucket: CreditBucket;
  balance_plan_after: number;
  balance_topup_after: number;
  related_property_id: string | null;
  related_stripe_id: string | null;
  metadata: string | null;
  created_at: string;
}

export class NoCreditsError extends Error {
  constructor() {
    super("Insufficient credits to reveal contact");
    this.name = "NoCreditsError";
  }
}

async function ensureCreditsRow(userId: string): Promise<void> {
  await db.execute({
    sql: `
      INSERT OR IGNORE INTO user_credits (user_id, plan_credits, topup_credits)
      VALUES (?, 0, 0)
    `,
    args: [userId],
  });
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  await ensureCreditsRow(userId);
  const result = await db.execute({
    sql: "SELECT plan_credits, topup_credits FROM user_credits WHERE user_id = ?",
    args: [userId],
  });
  const row = result.rows[0] as unknown as {
    plan_credits: number;
    topup_credits: number;
  };
  return {
    planCredits: row.plan_credits,
    topupCredits: row.topup_credits,
    total: row.plan_credits + row.topup_credits,
  };
}

async function logTransaction(params: {
  userId: string;
  type: CreditTxType;
  amount: number;
  bucket: CreditBucket;
  balancePlanAfter: number;
  balanceTopupAfter: number;
  relatedPropertyId?: string | null;
  relatedStripeId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO credit_transactions (
        id, user_id, type, amount, bucket,
        balance_plan_after, balance_topup_after,
        related_property_id, related_stripe_id, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      params.userId,
      params.type,
      params.amount,
      params.bucket,
      params.balancePlanAfter,
      params.balanceTopupAfter,
      params.relatedPropertyId ?? null,
      params.relatedStripeId ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  });
  return id;
}

/**
 * Reset plan_credits to a new amount (monthly renewal or trial grant).
 * Logs the previous balance as 'expire' if positive, then 'grant_plan' for the new amount.
 */
export async function resetPlanCredits(params: {
  userId: string;
  newAmount: number;
  relatedStripeId?: string | null;
  note?: string;
}): Promise<CreditBalance> {
  const { userId, newAmount } = params;
  await ensureCreditsRow(userId);

  const current = await getBalance(userId);

  if (current.planCredits > 0) {
    await db.execute({
      sql: "UPDATE user_credits SET plan_credits = 0, updated_at = datetime('now') WHERE user_id = ?",
      args: [userId],
    });
    await logTransaction({
      userId,
      type: "expire",
      amount: -current.planCredits,
      bucket: "plan",
      balancePlanAfter: 0,
      balanceTopupAfter: current.topupCredits,
      relatedStripeId: params.relatedStripeId,
      metadata: params.note ? { note: params.note } : undefined,
    });
  }

  if (newAmount > 0) {
    await db.execute({
      sql: `
        UPDATE user_credits
        SET plan_credits = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `,
      args: [newAmount, userId],
    });
    await logTransaction({
      userId,
      type: "grant_plan",
      amount: newAmount,
      bucket: "plan",
      balancePlanAfter: newAmount,
      balanceTopupAfter: current.topupCredits,
      relatedStripeId: params.relatedStripeId,
      metadata: params.note ? { note: params.note } : undefined,
    });
  }

  return {
    planCredits: newAmount,
    topupCredits: current.topupCredits,
    total: newAmount + current.topupCredits,
  };
}

/**
 * Add credits to the plan bucket without resetting (used on plan upgrade).
 * Unlike resetPlanCredits, existing plan credits are preserved.
 */
export async function addPlanCredits(params: {
  userId: string;
  amount: number;
  relatedStripeId?: string | null;
  note?: string;
}): Promise<CreditBalance> {
  const { userId, amount } = params;
  if (amount <= 0) return getBalance(userId);
  await ensureCreditsRow(userId);

  const result = await db.execute({
    sql: `
      UPDATE user_credits
      SET plan_credits = plan_credits + ?, updated_at = datetime('now')
      WHERE user_id = ?
      RETURNING plan_credits, topup_credits
    `,
    args: [amount, userId],
  });
  const row = result.rows[0] as unknown as {
    plan_credits: number;
    topup_credits: number;
  };

  await logTransaction({
    userId,
    type: "grant_plan",
    amount,
    bucket: "plan",
    balancePlanAfter: row.plan_credits,
    balanceTopupAfter: row.topup_credits,
    relatedStripeId: params.relatedStripeId,
    metadata: params.note ? { note: params.note } : undefined,
  });

  return {
    planCredits: row.plan_credits,
    topupCredits: row.topup_credits,
    total: row.plan_credits + row.topup_credits,
  };
}

export async function grantTopupCredits(params: {
  userId: string;
  amount: number;
  relatedStripeId: string;
  packId: string;
}): Promise<CreditBalance> {
  const { userId, amount } = params;
  if (amount <= 0) throw new Error("Topup amount must be positive");
  await ensureCreditsRow(userId);

  const result = await db.execute({
    sql: `
      UPDATE user_credits
      SET topup_credits = topup_credits + ?, updated_at = datetime('now')
      WHERE user_id = ?
      RETURNING plan_credits, topup_credits
    `,
    args: [amount, userId],
  });
  const row = result.rows[0] as unknown as {
    plan_credits: number;
    topup_credits: number;
  };

  await logTransaction({
    userId,
    type: "grant_topup",
    amount,
    bucket: "topup",
    balancePlanAfter: row.plan_credits,
    balanceTopupAfter: row.topup_credits,
    relatedStripeId: params.relatedStripeId,
    metadata: { packId: params.packId },
  });

  return {
    planCredits: row.plan_credits,
    topupCredits: row.topup_credits,
    total: row.plan_credits + row.topup_credits,
  };
}

/**
 * Spend 1 credit to reveal a property's contact. Priority: plan → topup.
 * Idempotent: if user_property_reveals already has this (user, property), no spend.
 * Throws NoCreditsError if both buckets are at 0.
 *
 * Returns { alreadyRevealed, bucket, balance }
 */
export async function spendCreditForReveal(params: {
  userId: string;
  propertyId: string;
}): Promise<{
  alreadyRevealed: boolean;
  bucket: CreditBucket | null;
  balance: CreditBalance;
  transactionId: string | null;
}> {
  const { userId, propertyId } = params;

  const existing = await db.execute({
    sql: "SELECT 1 FROM user_property_reveals WHERE user_id = ? AND property_id = ? LIMIT 1",
    args: [userId, propertyId],
  });
  if (existing.rows.length > 0) {
    const balance = await getBalance(userId);
    return {
      alreadyRevealed: true,
      bucket: null,
      balance,
      transactionId: null,
    };
  }

  await ensureCreditsRow(userId);

  // Atomic decrement with WHERE guard (priority to plan)
  const tryPlan = await db.execute({
    sql: `
      UPDATE user_credits
      SET plan_credits = plan_credits - 1, updated_at = datetime('now')
      WHERE user_id = ? AND plan_credits > 0
      RETURNING plan_credits, topup_credits
    `,
    args: [userId],
  });

  let bucket: CreditBucket;
  let balanceAfter: { plan_credits: number; topup_credits: number };

  if (tryPlan.rows.length > 0) {
    bucket = "plan";
    balanceAfter = tryPlan.rows[0] as unknown as {
      plan_credits: number;
      topup_credits: number;
    };
  } else {
    const tryTopup = await db.execute({
      sql: `
        UPDATE user_credits
        SET topup_credits = topup_credits - 1, updated_at = datetime('now')
        WHERE user_id = ? AND topup_credits > 0
        RETURNING plan_credits, topup_credits
      `,
      args: [userId],
    });
    if (tryTopup.rows.length === 0) {
      throw new NoCreditsError();
    }
    bucket = "topup";
    balanceAfter = tryTopup.rows[0] as unknown as {
      plan_credits: number;
      topup_credits: number;
    };
  }

  const txId = await logTransaction({
    userId,
    type: "spend_reveal",
    amount: -1,
    bucket,
    balancePlanAfter: balanceAfter.plan_credits,
    balanceTopupAfter: balanceAfter.topup_credits,
    relatedPropertyId: propertyId,
  });

  await db.execute({
    sql: `
      INSERT INTO user_property_reveals (user_id, property_id, credit_transaction_id)
      VALUES (?, ?, ?)
    `,
    args: [userId, propertyId, txId],
  });

  return {
    alreadyRevealed: false,
    bucket,
    balance: {
      planCredits: balanceAfter.plan_credits,
      topupCredits: balanceAfter.topup_credits,
      total: balanceAfter.plan_credits + balanceAfter.topup_credits,
    },
    transactionId: txId,
  };
}

/**
 * Expire all plan_credits (used when trial ends or plan is canceled).
 * Topup credits are NOT touched — they belong to the user regardless.
 */
export async function expirePlanCredits(
  userId: string,
  reason: string,
): Promise<void> {
  await ensureCreditsRow(userId);
  const current = await getBalance(userId);
  if (current.planCredits === 0) return;

  await db.execute({
    sql: "UPDATE user_credits SET plan_credits = 0, updated_at = datetime('now') WHERE user_id = ?",
    args: [userId],
  });
  await logTransaction({
    userId,
    type: "expire",
    amount: -current.planCredits,
    bucket: "plan",
    balancePlanAfter: 0,
    balanceTopupAfter: current.topupCredits,
    metadata: { reason },
  });
}

export async function adminAdjustCredits(params: {
  userId: string;
  bucket: CreditBucket;
  amount: number;
  note: string;
}): Promise<CreditBalance> {
  const { userId, bucket, amount, note } = params;
  await ensureCreditsRow(userId);

  const column = bucket === "plan" ? "plan_credits" : "topup_credits";
  const sql = `
    UPDATE user_credits
    SET ${column} = MAX(0, ${column} + ?), updated_at = datetime('now')
    WHERE user_id = ?
    RETURNING plan_credits, topup_credits
  `;
  const result = await db.execute({ sql, args: [amount, userId] });
  const row = result.rows[0] as unknown as {
    plan_credits: number;
    topup_credits: number;
  };

  await logTransaction({
    userId,
    type: "admin_adjust",
    amount,
    bucket,
    balancePlanAfter: row.plan_credits,
    balanceTopupAfter: row.topup_credits,
    metadata: { note },
  });

  return {
    planCredits: row.plan_credits,
    topupCredits: row.topup_credits,
    total: row.plan_credits + row.topup_credits,
  };
}

export async function getTransactionHistory(
  userId: string,
  limit = 50,
): Promise<CreditTransaction[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM credit_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  return result.rows as unknown as CreditTransaction[];
}

/**
 * Return the set of property IDs the user has already revealed (cheap lookup).
 */
export async function getRevealedPropertyIds(
  userId: string,
  propertyIds: string[],
): Promise<Set<string>> {
  if (propertyIds.length === 0) return new Set();
  const placeholders = propertyIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `
      SELECT property_id FROM user_property_reveals
      WHERE user_id = ? AND property_id IN (${placeholders})
    `,
    args: [userId, ...propertyIds],
  });
  return new Set(
    result.rows.map(
      (r) => (r as unknown as { property_id: string }).property_id,
    ),
  );
}
