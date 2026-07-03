import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Stripe from "stripe";
import { authenticate } from "../plugins/auth.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import {
  getStripeCustomerId,
  updateStripeCustomerId,
  ensureUserExists,
  getUserByStripeCustomerId,
  getUserById,
} from "../services/userService.js";
import {
  createSubscription,
  updateSubscriptionByStripeId,
  cancelSubscriptionByStripeId,
  getSubscriptionByIdAndUser,
  getCanceledSubscriptionsForCustomer,
  getSubscriptionByStripeId,
} from "../services/subscriptionService.js";
import { zodValidate, checkoutSessionSchema } from "../schemas/validation.js";
import { getListById } from "../services/listService.js";
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendAdminPaymentEmail,
} from "../services/emailService.js";
import {
  getPlanById,
  upsertPaidPlanSubscription,
  setPlanPeriodEnd,
  applyPendingListChanges,
} from "../services/planService.js";
import {
  grantTopupCredits,
  resetPlanCredits,
} from "../services/creditService.js";
import { db } from "../config/database.js";

export async function billingRoutes(fastify: FastifyInstance) {
  // Create checkout session for subscribing to a list
  fastify.post(
    "/checkout-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      // Validate body
      const result = zodValidate(checkoutSessionSchema, request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error });
      }

      const userId = request.user.sub;
      const userEmail = request.user.email;
      const { listId } = result.data;

      // Ensure user exists in DB
      await ensureUserExists(request.user);

      // Get list details to get the price
      const list = await getListById(listId);
      if (!list) {
        return reply.code(404).send({ error: "List not found" });
      }

      try {
        // Check if user already has a Stripe customer ID
        let customerId = await getStripeCustomerId(userId);

        // Verify the customer still exists in Stripe (may have been from test mode)
        if (customerId) {
          try {
            await stripe.customers.retrieve(customerId);
          } catch (err: unknown) {
            const stripeErr = err as { statusCode?: number; code?: string };
            if (
              stripeErr?.statusCode === 404 ||
              stripeErr?.code === "resource_missing"
            ) {
              customerId = null;
              await updateStripeCustomerId(userId, null as unknown as string);
            } else {
              throw err;
            }
          }
        }

        // If not, create a new customer
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
          line_items: [
            {
              price_data: {
                currency: list.currency.toLowerCase(),
                product_data: {
                  name: `Suscripción: ${list.name}`,
                  description: `Acceso a listados de particulares en ${list.location}`,
                  metadata: {
                    listId,
                  },
                },
                unit_amount: list.priceCents,
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            userId,
            listId,
          },
          subscription_data: {
            metadata: {
              userId,
              listId,
            },
          },
          success_url: `${env.FRONTEND_URL}/app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.FRONTEND_URL}/app/subscriptions?checkout=cancelled`,
          allow_promotion_codes: true,
        });

        return { url: session.url };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to create checkout session" });
      }
    },
  );

  // Create portal session for managing subscriptions
  fastify.post(
    "/portal-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      // Get Stripe customer ID from database
      let stripeCustomerId = await getStripeCustomerId(userId);

      if (!stripeCustomerId) {
        return reply.code(400).send({ error: "No billing account found" });
      }

      // Verify the customer still exists in Stripe
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (err: unknown) {
        const stripeErr = err as { statusCode?: number; code?: string };
        if (
          stripeErr?.statusCode === 404 ||
          stripeErr?.code === "resource_missing"
        ) {
          await updateStripeCustomerId(userId, null as unknown as string);
          return reply.code(400).send({
            error:
              "No billing account found. Please subscribe to a list first.",
          });
        }
        throw err;
      }

      try {
        const portalConfig = await stripe.billingPortal.configurations.create({
          business_profile: {
            headline: "Gestiona tus suscripciones",
          },
          features: {
            subscription_cancel: {
              enabled: true,
              mode: "at_period_end",
              proration_behavior: "none",
            },
            payment_method_update: { enabled: true },
            invoice_history: { enabled: true },
          },
        });

        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${env.FRONTEND_URL}/app/account`,
          configuration: portalConfig.id,
        });

        return { url: session.url };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to create portal session" });
      }
    },
  );

  // Cancel a subscription
  fastify.post(
    "/cancel-subscription",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const { subscriptionId } = request.body as { subscriptionId: string };

      if (!subscriptionId) {
        return reply.code(400).send({ error: "Subscription ID is required" });
      }

      // Get the subscription and verify it belongs to this user
      const subscription = await getSubscriptionByIdAndUser(
        subscriptionId,
        userId,
      );

      if (!subscription) {
        return reply.code(404).send({ error: "Subscription not found" });
      }

      if (subscription.status !== "active") {
        return reply.code(400).send({ error: "Subscription is not active" });
      }

      try {
        const stripeSubId = subscription.stripe_subscription_id;

        fastify.log.info(
          `Attempting to cancel Stripe subscription: ${stripeSubId} for DB subscription: ${subscriptionId}`,
        );

        if (!stripeSubId || !stripeSubId.startsWith("sub_")) {
          fastify.log.error(`Invalid Stripe subscription ID: ${stripeSubId}`);
          return reply
            .code(400)
            .send({ error: "Invalid Stripe subscription ID in database" });
        }

        // Cancel subscription in Stripe (immediately)
        const canceledSub = await stripe.subscriptions.cancel(stripeSubId);

        fastify.log.info(
          `Stripe subscription ${stripeSubId} canceled. Status: ${canceledSub.status}`,
        );

        // The webhook will handle updating the DB status
        // But we can also update it here for immediate feedback
        await cancelSubscriptionByStripeId(stripeSubId);

        fastify.log.info(
          `DB subscription ${subscriptionId} marked as canceled`,
        );

        return { message: "Subscription canceled successfully" };
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to cancel subscription");
        return reply.code(500).send({ error: "Failed to cancel subscription" });
      }
    },
  );

  // Verify a checkout session and create subscription if missing
  // This is the fallback mechanism when the webhook doesn't fire
  fastify.post(
    "/verify-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { sessionId } = request.body as { sessionId: string };
      const userId = request.user.sub;

      if (!sessionId) {
        return reply.code(400).send({ error: "sessionId is required" });
      }

      try {
        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });

        // Verify this session belongs to the requesting user
        if (session.metadata?.userId !== userId) {
          return reply
            .code(403)
            .send({ error: "Session does not belong to this user" });
        }

        // Only process completed sessions
        if (session.status !== "complete") {
          return reply
            .code(400)
            .send({ error: "Checkout session is not complete" });
        }

        const listId = session.metadata?.listId;
        const stripeSubscription = session.subscription as Stripe.Subscription;
        const customerId = session.customer as string;

        if (!listId || !stripeSubscription) {
          return reply
            .code(400)
            .send({ error: "Session missing required data" });
        }

        const subscriptionId =
          typeof stripeSubscription === "string"
            ? stripeSubscription
            : stripeSubscription.id;

        // Retrieve full subscription to get period end
        const fullSub =
          typeof stripeSubscription === "string"
            ? await stripe.subscriptions.retrieve(stripeSubscription)
            : stripeSubscription;

        const periodEnd = fullSub.current_period_end
          ? new Date(fullSub.current_period_end * 1000).toISOString()
          : null;

        // Create subscription (idempotent — ON CONFLICT updates)
        await createSubscription({
          userId,
          listId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          status: "active",
          currentPeriodEnd: periodEnd,
        });

        fastify.log.info(
          `Subscription verified/created via verify-session: user=${userId}, list=${listId}`,
        );

        return { success: true, listId };
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to verify checkout session");
        return reply
          .code(500)
          .send({ error: "Failed to verify checkout session" });
      }
    },
  );

  // Stripe webhook handler
  fastify.post(
    "/webhook",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sig = request.headers["stripe-signature"] as string;
      const rawBody = request.rawBody;

      if (!rawBody) {
        fastify.log.error("No raw body found in request");
        return reply.code(400).send({ error: "No raw body" });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        fastify.log.error("Webhook signature verification failed");
        return reply
          .code(400)
          .send({ error: "Webhook signature verification failed" });
      }

      // Idempotency: has this stripe id already produced a credit transaction?
      async function stripeEventAlreadyProcessed(
        stripeId: string,
      ): Promise<boolean> {
        const r = await db.execute({
          sql: "SELECT 1 FROM credit_transactions WHERE related_stripe_id = ? LIMIT 1",
          args: [stripeId],
        });
        return r.rows.length > 0;
      }

      // Helper: resolve userId and listId from a Stripe subscription
      // Checks metadata, then customer lookup, then product metadata, then canceled sub fallback
      async function resolveSubscriptionOwnership(
        subscription: Stripe.Subscription,
      ): Promise<{ userId: string | null; listId: string | null }> {
        const customerId = subscription.customer as string;
        let userId = subscription.metadata?.userId || null;
        let listId = subscription.metadata?.listId || null;

        // If no userId in metadata, look up user by Stripe customer ID
        if (!userId && customerId) {
          const user = await getUserByStripeCustomerId(customerId);
          if (user) {
            userId = user.id;
          }
        }

        // If no listId in metadata, try product metadata
        if (!listId) {
          try {
            const item = subscription.items?.data?.[0];
            if (item?.price?.product) {
              const productId =
                typeof item.price.product === "string"
                  ? item.price.product
                  : item.price.product.id;
              const product = await stripe.products.retrieve(productId);
              if (product.metadata?.listId) {
                listId = product.metadata.listId;
              }
            }
          } catch {
            fastify.log.warn(
              "Failed to retrieve product metadata for subscription",
            );
          }
        }

        // If still no listId, look for last canceled subscription for this customer
        if (!listId && customerId) {
          const canceledSubs =
            await getCanceledSubscriptionsForCustomer(customerId);
          if (canceledSubs.length > 0) {
            listId = canceledSubs[0].list_id;
            // Also fill userId if still missing
            if (!userId) {
              userId = canceledSubs[0].user_id;
            }
          }
        }

        return { userId, listId };
      }

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const listId = session.metadata?.listId;
          const planId = session.metadata?.planId;
          const packId = session.metadata?.packId;
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          // New: v2 plan subscription checkout
          if (userId && planId && subscriptionId) {
            const plan = await getPlanById(planId);
            if (!plan) {
              fastify.log.error(
                `Checkout completed for unknown planId: ${planId}`,
              );
              break;
            }

            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);
            const periodStart = subscription.current_period_start
              ? new Date(
                  subscription.current_period_start * 1000,
                ).toISOString()
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

            if (!(await stripeEventAlreadyProcessed(session.id))) {
              await resetPlanCredits({
                userId,
                newAmount: plan.monthly_credits,
                relatedStripeId: session.id,
                note: "plan_checkout",
              });
            }

            await applyPendingListChanges(userId);

            fastify.log.info(
              `Plan subscription activated: user=${userId}, plan=${planId}, stripeSub=${subscriptionId}`,
            );

            // Notify admin of the payment (fire-and-forget)
            try {
              const buyerEmail =
                session.customer_details?.email ||
                (await getUserById(userId))?.email ||
                null;
              await sendAdminPaymentEmail({
                userEmail: buyerEmail,
                kind: "plan",
                description: `Plan: ${plan.name}`,
                amountCents: session.amount_total,
                currency: session.currency,
              });
            } catch (emailErr) {
              fastify.log.warn(
                { err: emailErr },
                "Failed to send admin plan-payment notification",
              );
            }
            break;
          }

          // New: v2 credit pack one-off checkout
          if (userId && packId && session.mode === "payment") {
            if (await stripeEventAlreadyProcessed(session.id)) {
              fastify.log.info(
                `Credit pack session already processed: ${session.id}`,
              );
              break;
            }
            const creditsStr = session.metadata?.credits;
            const credits = creditsStr ? parseInt(creditsStr, 10) : NaN;
            if (!Number.isFinite(credits) || credits <= 0) {
              fastify.log.error(
                `Invalid credits metadata in pack checkout: ${creditsStr}`,
              );
              break;
            }
            await grantTopupCredits({
              userId,
              amount: credits,
              relatedStripeId: session.id,
              packId,
            });
            fastify.log.info(
              `Credit pack granted: user=${userId}, pack=${packId}, credits=${credits}`,
            );

            // Notify admin of the payment (fire-and-forget)
            try {
              const buyerEmail =
                session.customer_details?.email ||
                (await getUserById(userId))?.email ||
                null;
              await sendAdminPaymentEmail({
                userEmail: buyerEmail,
                kind: "credits",
                description: `${credits} créditos`,
                amountCents: session.amount_total,
                currency: session.currency,
              });
            } catch (emailErr) {
              fastify.log.warn(
                { err: emailErr },
                "Failed to send admin credit-payment notification",
              );
            }
            break;
          }

          if (userId && listId && subscriptionId) {
            // Get subscription details from Stripe
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);

            fastify.log.info(
              `Stripe subscription period end timestamp: ${subscription.current_period_end}`,
            );

            const periodEnd = new Date(
              subscription.current_period_end * 1000,
            ).toISOString();

            fastify.log.info(`Converted period end: ${periodEnd}`);

            await createSubscription({
              userId,
              listId,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              status: "active",
              currentPeriodEnd: periodEnd,
            });

            fastify.log.info(
              `Subscription created for user ${userId} to list ${listId}`,
            );

            // Send subscription activated email
            try {
              const user = await ensureUserExists({
                sub: userId,
                email: session.customer_details?.email || "",
              } as import("../plugins/auth.js").AuthUser);
              const list = await getListById(listId);
              if (user?.email && list) {
                await sendSubscriptionActivatedEmail(
                  user.email,
                  list.name,
                  listId,
                );
              }
            } catch (emailErr) {
              fastify.log.warn(
                { err: emailErr },
                "Failed to send subscription activated email",
              );
            }
          }
          break;
        }

        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;

          // v2 plan subscriptions are handled by checkout.session.completed or
          // by the customer.subscription.deleted handler (downgrade activation)
          if (subscription.metadata?.planId) {
            fastify.log.info(
              `subscription.created for plan sub ${subscription.id} — handled elsewhere`,
            );
            break;
          }

          // Skip if this came from a checkout session (handled by checkout.session.completed)
          if (subscription.metadata?.userId && subscription.metadata?.listId) {
            fastify.log.info(
              `subscription.created with metadata — will be handled by checkout.session.completed`,
            );
            break;
          }

          // This handles portal resubscriptions and other external subscription creation
          const { userId: resolvedUserId, listId: resolvedListId } =
            await resolveSubscriptionOwnership(subscription);

          if (resolvedUserId && resolvedListId) {
            const periodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;

            await createSubscription({
              userId: resolvedUserId,
              listId: resolvedListId,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              status:
                subscription.status === "active" ? "active" : "incomplete",
              currentPeriodEnd: periodEnd,
            });

            fastify.log.info(
              `Subscription created via portal resubscription: user=${resolvedUserId}, list=${resolvedListId}, stripeSubId=${subscription.id}`,
            );
          } else {
            fastify.log.warn(
              `Could not resolve ownership for subscription.created: subId=${subscription.id}, customerId=${subscription.customer}`,
            );
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;

          // Safely handle period end date
          const periodEndTimestamp = subscription.current_period_end;
          const periodEnd = periodEndTimestamp
            ? new Date(periodEndTimestamp * 1000).toISOString()
            : null;

          // Map Stripe status to our status
          // Business rule: cancellation = immediate loss of access
          // When cancel_at_period_end is true (e.g. user canceled via Stripe portal),
          // treat as canceled immediately.
          let status = "active";
          if (
            subscription.cancel_at_period_end ||
            subscription.status === "canceled" ||
            subscription.status === "unpaid"
          ) {
            status = "canceled";
          } else if (subscription.status === "past_due") {
            status = "past_due";
          }

          // v2 plan subscription branch: route to user_plan_subscriptions
          if (subscription.metadata?.planId) {
            let effectiveStatus: string;
            if (
              subscription.cancel_at_period_end &&
              subscription.metadata?.pendingPlanId
            ) {
              // Downgrade scheduled — keep active so user doesn't lose access
              effectiveStatus = "active";
            } else if (subscription.cancel_at_period_end) {
              // Cancelled via portal or cancel button — active until period end
              effectiveStatus = "canceling";
            } else {
              effectiveStatus = status;
            }
            await setPlanPeriodEnd(subscription.id, periodEnd, effectiveStatus);
            fastify.log.info(
              `Plan subscription ${subscription.id} updated: status=${effectiveStatus}`,
            );
            break;
          }

          const rowsAffected = await updateSubscriptionByStripeId({
            stripeSubscriptionId: subscription.id,
            status,
            currentPeriodEnd: periodEnd,
          });

          // If no rows were updated, the subscription might be new (e.g. portal resubscription)
          // Try to create a record so the user regains access
          if (rowsAffected === 0 && status === "active") {
            const { userId: subUserId, listId: subListId } =
              await resolveSubscriptionOwnership(subscription);

            if (subUserId && subListId) {
              await createSubscription({
                userId: subUserId,
                listId: subListId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                status: "active",
                currentPeriodEnd: periodEnd,
              });

              fastify.log.info(
                `Subscription created via subscription.updated fallback: user=${subUserId}, list=${subListId}`,
              );
            }
          }

          fastify.log.info(
            `Subscription ${subscription.id} updated to status: ${status} (cancel_at_period_end: ${subscription.cancel_at_period_end})`,
          );
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;

          // v2 plan subscription branch
          if (subscription.metadata?.planId) {
            const pendingPlanId = subscription.metadata?.pendingPlanId;
            const subUserId = subscription.metadata?.userId;

            if (pendingPlanId && subUserId) {
              // This was a scheduled downgrade — activate the new (lower) plan
              const newPlan = await getPlanById(pendingPlanId);
              const customerId = subscription.customer as string;

              if (newPlan?.stripe_price_id) {
                try {
                  const newSub = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: newPlan.stripe_price_id }],
                    metadata: { userId: subUserId, planId: newPlan.id },
                  });

                  const newPeriodStart = newSub.current_period_start
                    ? new Date(newSub.current_period_start * 1000).toISOString()
                    : null;
                  const newPeriodEnd = newSub.current_period_end
                    ? new Date(newSub.current_period_end * 1000).toISOString()
                    : null;

                  await upsertPaidPlanSubscription({
                    userId: subUserId,
                    planId: newPlan.id,
                    stripeSubscriptionId: newSub.id,
                    stripeCustomerId: customerId,
                    status: "active",
                    currentPeriodStart: newPeriodStart,
                    currentPeriodEnd: newPeriodEnd,
                  });

                  if (!(await stripeEventAlreadyProcessed(subscription.id))) {
                    await resetPlanCredits({
                      userId: subUserId,
                      newAmount: newPlan.monthly_credits,
                      relatedStripeId: subscription.id,
                      note: "plan_downgrade_activated",
                    });
                  }

                  await applyPendingListChanges(subUserId);

                  fastify.log.info(
                    `Plan downgrade activated: user=${subUserId}, newPlan=${pendingPlanId}, newSub=${newSub.id}`,
                  );
                } catch (err) {
                  fastify.log.error(
                    { err },
                    `Failed to activate downgraded plan for user=${subUserId}, pendingPlan=${pendingPlanId}`,
                  );
                  // Mark as canceled so the user isn't left in a broken state
                  await setPlanPeriodEnd(subscription.id, null, "canceled");
                }
              } else {
                fastify.log.error(
                  `Pending plan ${pendingPlanId} not found or has no stripe_price_id`,
                );
                await setPlanPeriodEnd(subscription.id, null, "canceled");
              }
            } else {
              // Regular cancellation
              const rows = await setPlanPeriodEnd(subscription.id, null, "canceled");
              fastify.log.info(
                `Plan subscription ${subscription.id} deleted (rows=${rows})`,
              );
            }
            break;
          }

          // Get subscription info before cancelling to send email
          const subRecord = await getSubscriptionByStripeId(subscription.id);
          let cancelledListName: string | null = null;
          let cancelledUserEmail: string | null = null;

          if (subRecord) {
            const cancelledList = await getListById(
              (subRecord as unknown as { list_id: string }).list_id,
            );
            cancelledListName = cancelledList?.name || null;
            const cancelledUser = await getUserByStripeCustomerId(
              subscription.customer as string,
            );
            cancelledUserEmail = cancelledUser?.email || null;
          }

          await cancelSubscriptionByStripeId(subscription.id);

          // Send cancellation email
          if (cancelledUserEmail && cancelledListName) {
            try {
              await sendSubscriptionCancelledEmail(
                cancelledUserEmail,
                cancelledListName,
              );
            } catch (emailErr) {
              fastify.log.warn(
                { err: emailErr },
                "Failed to send subscription cancelled email",
              );
            }
          }

          fastify.log.info(`Subscription ${subscription.id} canceled`);
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string | null;
          const billingReason = invoice.billing_reason;

          // Only act on renewals — initial payment is handled by checkout.session.completed
          if (
            !subscriptionId ||
            (billingReason !== "subscription_cycle" &&
              billingReason !== "subscription_update")
          ) {
            break;
          }

          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const planId = subscription.metadata?.planId;
          const userId = subscription.metadata?.userId;

          if (!planId || !userId) break;

          const plan = await getPlanById(planId);
          if (!plan) {
            fastify.log.error(
              `invoice.payment_succeeded for unknown planId: ${planId}`,
            );
            break;
          }

          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
          await setPlanPeriodEnd(subscriptionId, periodEnd, "active");

          // Only reset credits on monthly renewals. Upgrade proration invoices
          // (subscription_update) are charged mid-cycle; credits were already
          // added by addPlanCredits() in the change-plan endpoint, so resetting
          // here would erase them.
          if (billingReason === "subscription_cycle") {
            if (!(await stripeEventAlreadyProcessed(invoice.id))) {
              await resetPlanCredits({
                userId,
                newAmount: plan.monthly_credits,
                relatedStripeId: invoice.id,
                note: "plan_renewal",
              });
            }
          }

          await applyPendingListChanges(userId);

          fastify.log.info(
            `Plan invoice paid: user=${userId}, plan=${planId}, invoice=${invoice.id}, reason=${billingReason}`,
          );
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;

          if (subscriptionId) {
            await updateSubscriptionByStripeId({
              stripeSubscriptionId: subscriptionId,
              status: "past_due",
              currentPeriodEnd: null,
            });
          }

          fastify.log.warn(`Payment failed for invoice: ${invoice.id}`);
          break;
        }

        default:
          fastify.log.info(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    },
  );
}
