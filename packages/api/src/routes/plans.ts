import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import {
  ensureUserExists,
  getStripeCustomerId,
  updateStripeCustomerId,
} from "../services/userService.js";
import {
  getAllActivePlans,
  getPlanById,
  getUserPlanWithDefinition,
  setPlanSubscriptionStatus,
  setPendingDowngrade,
  upsertPaidPlanSubscription,
  applyPendingListChanges,
} from "../services/planService.js";
import { resetPlanCredits, addPlanCredits } from "../services/creditService.js";
import { db } from "../config/database.js";

export async function plansRoutes(fastify: FastifyInstance) {
  // Public plan catalogue (landing + in-app pricing page)
  fastify.get("/", async () => {
    const plans = await getAllActivePlans();
    return {
      data: plans.map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.price_cents,
        currency: p.currency,
        maxLists: p.max_lists,
        monthlyCredits: p.monthly_credits,
      })),
    };
  });

  // Start Stripe Checkout for a plan
  fastify.post(
    "/checkout-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { planId } = request.body as { planId?: string };
      if (!planId) return reply.code(400).send({ error: "planId required" });

      const plan = await getPlanById(planId);
      if (!plan || plan.id === "trial" || plan.active === 0) {
        return reply.code(400).send({ error: "Invalid plan" });
      }
      if (!plan.stripe_price_id) {
        return reply
          .code(500)
          .send({ error: "Plan not synced with Stripe. Run stripe:seed." });
      }

      const userId = request.user.sub;
      const userEmail = request.user.email;
      await ensureUserExists(request.user);

      // Block checkout if user already has an active paid subscription
      const existingPlan = await getUserPlanWithDefinition(userId);
      if (existingPlan?.isActive && existingPlan.subscription.stripe_subscription_id) {
        return reply.code(400).send({
          error: "Ya tienes un plan de pago activo. Usa el endpoint de cambio de plan.",
        });
      }

      let customerId = await getStripeCustomerId(userId);
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (err: unknown) {
          const e = err as { statusCode?: number; code?: string };
          if (e?.statusCode === 404 || e?.code === "resource_missing") {
            customerId = null;
            await updateStripeCustomerId(userId, null as unknown as string);
          } else throw err;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
        await updateStripeCustomerId(userId, customerId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        metadata: { userId, planId },
        subscription_data: { metadata: { userId, planId } },
        success_url: `${env.FRONTEND_URL}/app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/app/plans?checkout=cancelled`,
        allow_promotion_codes: true,
      });

      return { url: session.url };
    },
  );

  // Verify a checkout session and activate the plan if the webhook hasn't
  // processed it yet (safety net for dev without `stripe listen`)
  fastify.post(
    "/verify-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { sessionId } = request.body as { sessionId?: string };
      if (!sessionId) {
        return reply.code(400).send({ error: "sessionId required" });
      }

      const userId = request.user.sub;

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });

        if (session.metadata?.userId !== userId) {
          return reply.code(403).send({ error: "Session not owned by user" });
        }
        if (session.status !== "complete") {
          return reply.code(400).send({ error: "Session not complete" });
        }

        const planId = session.metadata?.planId;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId = session.customer as string;

        if (!planId || !subscriptionId) {
          return reply
            .code(400)
            .send({ error: "Session missing plan or subscription" });
        }

        const plan = await getPlanById(planId);
        if (!plan) {
          return reply.code(400).send({ error: "Unknown plan" });
        }

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await upsertPaidPlanSubscription({
          userId,
          planId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        const already = await db.execute({
          sql: "SELECT 1 FROM credit_transactions WHERE related_stripe_id = ? LIMIT 1",
          args: [sessionId],
        });
        if (already.rows.length === 0) {
          await resetPlanCredits({
            userId,
            newAmount: plan.monthly_credits,
            relatedStripeId: sessionId,
            note: "plan_checkout",
          });
        }

        await applyPendingListChanges(userId);

        fastify.log.info(
          `Plan verified via verify-session: user=${userId}, plan=${planId}`,
        );

        return { success: true, planId };
      } catch (err) {
        fastify.log.error({ err }, "Failed to verify plan checkout session");
        return reply.code(500).send({ error: "Failed to verify session" });
      }
    },
  );

  // Change plan (upgrade = immediate, downgrade = scheduled for period end)
  fastify.post(
    "/change-plan",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { planId } = request.body as { planId?: string };
      if (!planId) return reply.code(400).send({ error: "planId required" });

      const userId = request.user.sub;
      await ensureUserExists(request.user);

      const userPlan = await getUserPlanWithDefinition(userId);
      if (!userPlan) {
        return reply.code(400).send({ error: "No tienes ningún plan activo" });
      }
      if (!userPlan.subscription.stripe_subscription_id) {
        return reply.code(400).send({
          error: "Los usuarios en periodo de prueba deben usar el checkout para contratar un plan.",
        });
      }
      if (!userPlan.isActive) {
        return reply.code(400).send({ error: "Tu plan no está activo" });
      }
      if (planId === userPlan.plan.id) {
        return reply.code(400).send({ error: "Ya estás en este plan" });
      }

      const newPlan = await getPlanById(planId);
      if (!newPlan || !newPlan.active || !newPlan.stripe_price_id || newPlan.id === "trial") {
        return reply.code(400).send({ error: "Plan no válido" });
      }

      const stripeSubId = userPlan.subscription.stripe_subscription_id;

      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const currentItem = stripeSub.items.data[0];
        const isUpgrade = newPlan.sort_order > userPlan.plan.sort_order;
        // If cancel_at_period_end is true the user was cancelling — treat any
        // plan change as a reactivation and clear the cancellation flag.
        const isReactivation = stripeSub.cancel_at_period_end;

        if (isReactivation || isUpgrade) {
          // Reactivation or upgrade: apply immediately and reset cancel flag.
          // When reactivating AND upgrading we need two separate calls: first
          // clear cancel_at_period_end, then change the price. If we combine
          // both in one call Stripe treats it as a reactivation and skips
          // proration, so the user never gets charged the difference.
          let updated: Awaited<ReturnType<typeof stripe.subscriptions.update>>;

          if (isReactivation && isUpgrade) {
            await stripe.subscriptions.update(stripeSubId, {
              cancel_at_period_end: false,
              metadata: { userId, planId: userPlan.plan.id },
            });
            updated = await stripe.subscriptions.update(stripeSubId, {
              items: [{ id: currentItem.id, price: newPlan.stripe_price_id }],
              proration_behavior: "always_invoice",
              metadata: { userId, planId: newPlan.id },
            });
          } else {
            updated = await stripe.subscriptions.update(stripeSubId, {
              items: [{ id: currentItem.id, price: newPlan.stripe_price_id }],
              proration_behavior: isUpgrade ? "always_invoice" : "none",
              cancel_at_period_end: false,
              metadata: { userId, planId: newPlan.id },
            });
          }

          // Safety net: pay any open proration invoice right away so the
          // charge doesn't sit as a draft waiting for Stripe's auto-advance.
          if (isUpgrade) {
            try {
              const openInvoices = await stripe.invoices.list({
                subscription: stripeSubId,
                status: "open",
              });
              for (const inv of openInvoices.data) {
                await stripe.invoices.pay(inv.id);
                fastify.log.info(`Paid proration invoice ${inv.id} for upgrade`);
              }
            } catch (err) {
              fastify.log.warn(
                { err },
                "Could not auto-pay proration invoice — may need manual payment",
              );
            }
          }

          const periodStart = updated.current_period_start
            ? new Date(updated.current_period_start * 1000).toISOString()
            : null;
          const periodEnd = updated.current_period_end
            ? new Date(updated.current_period_end * 1000).toISOString()
            : null;

          await upsertPaidPlanSubscription({
            userId,
            planId: newPlan.id,
            stripeSubscriptionId: updated.id,
            stripeCustomerId: updated.customer as string,
            status: "active",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          });

          // Add credits when upgrading; keep existing credits on reactivation to lower plan
          if (isUpgrade) {
            await addPlanCredits({
              userId,
              amount: newPlan.monthly_credits,
              relatedStripeId: stripeSubId,
              note: isReactivation ? "plan_reactivate_upgrade" : "plan_upgrade",
            });
          }

          fastify.log.info(
            `Plan ${isReactivation ? "reactivated" : "upgraded"}: user=${userId}, from=${userPlan.plan.id}, to=${newPlan.id}`,
          );

          return {
            type: "upgrade" as const,
            newPlanId: newPlan.id,
            newPlanName: newPlan.name,
            effective: "immediately",
            creditsAdded: isUpgrade ? newPlan.monthly_credits : undefined,
          };
        } else {
          // Downgrade on active plan: schedule change for end of current period
          await stripe.subscriptions.update(stripeSubId, {
            cancel_at_period_end: true,
            metadata: { ...stripeSub.metadata, planId: userPlan.plan.id, pendingPlanId: newPlan.id, userId },
          });

          await setPendingDowngrade(userId, newPlan.id);

          fastify.log.info(
            `Plan downgrade scheduled: user=${userId}, from=${userPlan.plan.id}, to=${newPlan.id}, at=${userPlan.subscription.current_period_end}`,
          );

          return {
            type: "downgrade" as const,
            newPlanId: newPlan.id,
            newPlanName: newPlan.name,
            effective: userPlan.subscription.current_period_end,
          };
        }
      } catch (err) {
        fastify.log.error({ err }, "Failed to change plan");
        return reply.code(500).send({ error: "No se pudo cambiar el plan" });
      }
    },
  );

  // Cancel current plan (at period end, via Stripe)
  fastify.post(
    "/cancel",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const userPlan = await getUserPlanWithDefinition(userId);
      if (!userPlan) {
        return reply.code(404).send({ error: "No active plan" });
      }
      if (!userPlan.subscription.stripe_subscription_id) {
        // Trial: just mark as expired (no Stripe side)
        await setPlanSubscriptionStatus(userId, "expired");
        return { message: "Trial cancelled" };
      }

      try {
        await stripe.subscriptions.update(
          userPlan.subscription.stripe_subscription_id,
          { cancel_at_period_end: true },
        );
        await setPlanSubscriptionStatus(userId, "canceling");
        return { message: "Plan cancelado. Continúas con acceso hasta el fin del ciclo." };
      } catch (err) {
        fastify.log.error({ err }, "Failed to cancel plan");
        return reply.code(500).send({ error: "Failed to cancel plan" });
      }
    },
  );
}
