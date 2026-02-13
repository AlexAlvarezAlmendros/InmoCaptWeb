import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  ensureUserExists,
  getUserSubscriptions,
  updateUserPreferences,
  getUserById,
  deleteUser,
} from "../services/userService.js";
import {
  updateSubscriptionByStripeId,
  getAllUserSubscriptions,
} from "../services/subscriptionService.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { zodValidate, updatePreferencesSchema } from "../schemas/validation.js";

export async function meRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get("/", { preHandler: [authenticate] }, async (request, _reply) => {
    // Upsert user on every request to ensure sync
    const dbUser = await ensureUserExists(request.user);

    return {
      id: dbUser.id,
      email: dbUser.email,
      emailNotificationsOn: Boolean(dbUser.email_notifications_on),
      createdAt: dbUser.created_at,
    };
  });

  // Get user's subscriptions
  fastify.get(
    "/subscriptions",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      // Ensure user exists in DB
      await ensureUserExists(request.user);

      const subscriptions = await getUserSubscriptions(request.user.sub);

      // Enrich subscriptions missing current_period_end from Stripe
      const enriched = await Promise.all(
        subscriptions.map(async (sub) => {
          let periodEnd = sub.current_period_end;

          if (
            !periodEnd &&
            sub.status === "active" &&
            sub.stripe_subscription_id
          ) {
            try {
              const stripeSub = await stripe.subscriptions.retrieve(
                sub.stripe_subscription_id,
              );
              if (stripeSub.current_period_end) {
                periodEnd = new Date(
                  stripeSub.current_period_end * 1000,
                ).toISOString();
                // Backfill DB so future requests don't need the Stripe call
                await updateSubscriptionByStripeId({
                  stripeSubscriptionId: sub.stripe_subscription_id,
                  status: sub.status,
                  currentPeriodEnd: periodEnd,
                });
              }
            } catch (err) {
              fastify.log.warn(
                `Failed to fetch period end from Stripe for ${sub.stripe_subscription_id}`,
              );
            }
          }

          return {
            id: sub.id,
            listId: sub.list_id,
            listName: sub.list_name,
            listLocation: sub.list_location,
            status: sub.status,
            currentPeriodEnd: periodEnd,
            priceCents: sub.price_cents,
            currency: sub.currency,
            lastUpdatedAt: sub.last_updated_at,
            totalProperties: sub.total_properties,
            newPropertiesCount: sub.new_properties_count,
          };
        }),
      );

      return { data: enriched };
    },
  );

  // Update user preferences
  fastify.patch(
    "/preferences",
    { preHandler: [authenticate] },
    async (request, reply) => {
      // Validate body
      const result = zodValidate(updatePreferencesSchema, request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error });
      }

      const userId = request.user.sub;

      await updateUserPreferences(userId, result.data);

      return {
        message: "Preferences updated",
        data: result.data,
      };
    },
  );

  // Delete user account
  fastify.delete(
    "/",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      try {
        // 1. Cancel all active Stripe subscriptions
        const allSubs = await getAllUserSubscriptions(userId);
        const activeSubs = allSubs.filter(
          (s) =>
            s.status === "active" &&
            s.stripe_subscription_id?.startsWith("sub_"),
        );

        for (const sub of activeSubs) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            fastify.log.info(
              `Canceled Stripe subscription ${sub.stripe_subscription_id} for account deletion`,
            );
          } catch (err) {
            // Subscription may already be canceled in Stripe — continue
            fastify.log.warn(
              `Failed to cancel Stripe sub ${sub.stripe_subscription_id} during account deletion`,
            );
          }
        }

        // 2. Delete all user data from database
        await deleteUser(userId);
        fastify.log.info(`Deleted DB data for user ${userId}`);

        // 3. Delete Auth0 user (if M2M credentials are configured)
        if (env.AUTH0_M2M_CLIENT_ID && env.AUTH0_M2M_CLIENT_SECRET) {
          try {
            // Get Management API token
            const tokenRes = await fetch(
              `https://${env.AUTH0_DOMAIN}/oauth/token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  grant_type: "client_credentials",
                  client_id: env.AUTH0_M2M_CLIENT_ID,
                  client_secret: env.AUTH0_M2M_CLIENT_SECRET,
                  audience: `https://${env.AUTH0_DOMAIN}/api/v2/`,
                }),
              },
            );

            if (tokenRes.ok) {
              const { access_token } = (await tokenRes.json()) as {
                access_token: string;
              };

              // Delete user from Auth0
              const deleteRes = await fetch(
                `https://${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${access_token}` },
                },
              );

              if (deleteRes.ok || deleteRes.status === 204) {
                fastify.log.info(`Deleted Auth0 user ${userId}`);
              } else {
                const errBody = await deleteRes.text();
                fastify.log.warn(
                  `Failed to delete Auth0 user: ${deleteRes.status} ${errBody}`,
                );
              }
            } else {
              fastify.log.warn(
                "Failed to get Auth0 Management API token for account deletion",
              );
            }
          } catch (err) {
            fastify.log.error(
              { err },
              "Error deleting Auth0 user during account deletion",
            );
          }
        } else {
          fastify.log.info(
            "Auth0 M2M credentials not configured — skipping Auth0 user deletion",
          );
        }

        return { message: "Account deleted successfully" };
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to delete account");
        return reply.code(500).send({ error: "Failed to delete account" });
      }
    },
  );
}
