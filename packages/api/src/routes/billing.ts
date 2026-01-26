import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";

export async function billingRoutes(fastify: FastifyInstance) {
  // Create checkout session for subscribing to a list
  fastify.post(
    "/checkout-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const userEmail = request.user.email;
      const { listId, priceId } = request.body as {
        listId: string;
        priceId: string;
      };

      try {
        const session = await stripe.checkout.sessions.create({
          customer_email: userEmail,
          mode: "subscription",
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          metadata: {
            userId,
            listId,
          },
          success_url: `${env.CORS_ORIGIN}/app/dashboard?checkout=success`,
          cancel_url: `${env.CORS_ORIGIN}/app/subscriptions?checkout=cancelled`,
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
      const _userId = request.user.sub;
      void _userId; // Will be used to fetch stripeCustomerId from DB

      // TODO: Get Stripe customer ID from database
      const stripeCustomerId = ""; // Placeholder

      if (!stripeCustomerId) {
        return reply.code(400).send({ error: "No billing account found" });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${env.CORS_ORIGIN}/app/subscriptions`,
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

  // Stripe webhook handler
  fastify.post(
    "/webhook",
    {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sig = request.headers["stripe-signature"] as string;
      const rawBody = (request as any).rawBody;

      let event;

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

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          fastify.log.info(
            `Checkout completed for user: ${session.metadata?.userId}`,
          );
          // TODO: Create subscription in database
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          fastify.log.info(`Subscription ${event.type}: ${subscription.id}`);
          // TODO: Update subscription status in database
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          fastify.log.warn(`Payment failed for invoice: ${invoice.id}`);
          // TODO: Update subscription status, notify user
          break;
        }
        default:
          fastify.log.info(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    },
  );
}
