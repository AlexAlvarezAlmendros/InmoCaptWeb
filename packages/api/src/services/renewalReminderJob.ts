import {
  getSubscriptionsPendingRenewalReminder,
  markRenewalReminderSent,
} from "./planService.js";
import { sendFirstChargeReminderEmail } from "./emailService.js";

const RUN_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours

/** How many days before the first paid renewal the reminder goes out. */
export const REMINDER_DAYS_AHEAD = 3;

/**
 * Warn users whose promo-covered first month is about to end that the first
 * real charge is coming. Each subscription is stamped once
 * (renewal_reminder_sent_at) so the email is never sent twice.
 */
export async function runRenewalReminderSweep(): Promise<{
  sent: number;
  failed: number;
}> {
  const pending = await getSubscriptionsPendingRenewalReminder(
    REMINDER_DAYS_AHEAD,
  );

  let sent = 0;
  let failed = 0;

  for (const sub of pending) {
    try {
      const ok = await sendFirstChargeReminderEmail({
        to: sub.email,
        planName: sub.plan_name,
        priceCents: sub.price_cents,
        currency: sub.currency,
        chargeDate: new Date(sub.current_period_end),
      });

      if (ok) {
        // Only stamp on success so a transient email failure gets retried
        // on the next sweep.
        await markRenewalReminderSent(sub.user_id);
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(
        `[RenewalReminderJob] Failed for user ${sub.user_id}:`,
        err,
      );
      failed++;
    }
    // Resend rate limit: 2 req/s
    await new Promise((r) => setTimeout(r, 600));
  }

  return { sent, failed };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startRenewalReminderJob(
  logger: { info: (msg: string) => void; error: (err: unknown) => void },
): void {
  if (intervalHandle) return;

  const tick = async () => {
    try {
      const { sent, failed } = await runRenewalReminderSweep();
      if (sent > 0 || failed > 0) {
        logger.info(
          `[RenewalReminderJob] first-charge reminders: ${sent} sent, ${failed} failed`,
        );
      }
    } catch (err) {
      logger.error(err);
    }
  };

  tick();
  intervalHandle = setInterval(tick, RUN_EVERY_MS);
}

export function stopRenewalReminderJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
