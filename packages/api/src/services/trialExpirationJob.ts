import { db } from "../config/database.js";
import {
  clearUserListAccess,
  setPlanSubscriptionStatus,
} from "./planService.js";
import { expirePlanCredits } from "./creditService.js";

const RUN_EVERY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Find all users whose trial or expired-paid subscription has run past its
 * current_period_end and mark them as expired:
 *   - status = 'expired'
 *   - zero out plan_credits (topup_credits remain)
 *   - clear user_list_access rows
 *
 * Topup credits and user_property_reveals are preserved.
 */
export async function runTrialExpirationSweep(): Promise<{
  expiredCount: number;
}> {
  const result = await db.execute(`
    SELECT user_id FROM user_plan_subscriptions
    WHERE status = 'active'
      AND current_period_end IS NOT NULL
      AND current_period_end < datetime('now')
      AND (stripe_subscription_id IS NULL OR plan_id = 'trial')
  `);

  const userIds = result.rows.map(
    (r) => (r as unknown as { user_id: string }).user_id,
  );

  for (const userId of userIds) {
    await setPlanSubscriptionStatus(userId, "expired");
    await expirePlanCredits(userId, "trial_or_unpaid_expired");
    await clearUserListAccess(userId);
  }

  return { expiredCount: userIds.length };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startTrialExpirationJob(
  logger: { info: (msg: string) => void; error: (err: unknown) => void },
): void {
  if (intervalHandle) return;

  const tick = async () => {
    try {
      const { expiredCount } = await runTrialExpirationSweep();
      if (expiredCount > 0) {
        logger.info(
          `[TrialExpirationJob] expired ${expiredCount} subscription(s)`,
        );
      }
    } catch (err) {
      logger.error(err);
    }
  };

  // Run once at startup, then on interval
  tick();
  intervalHandle = setInterval(tick, RUN_EVERY_MS);
}

export function stopTrialExpirationJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
