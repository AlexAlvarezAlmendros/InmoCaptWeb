import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { db } from "../config/database.js";
import {
  ensureUserExists,
  getStripeCustomerId,
  updateStripeCustomerId,
} from "../services/userService.js";
import {
  getBalance,
  getTransactionHistory,
  grantTopupCredits,
} from "../services/creditService.js";

interface CreditPackRow {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  active: number;
  sort_order: number;
}

export async function creditsRoutes(fastify: FastifyInstance) {
  // Public pack catalogue
  fastify.get("/packs", async () => {
    const result = await db.execute(
      "SELECT * FROM credit_packs WHERE active = 1 ORDER BY sort_order ASC",
    );
    const packs = result.rows as unknown as CreditPackRow[];
    return {
      data: packs.map((p) => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        priceCents: p.price_cents,
        currency: p.currency,
      })),
    };
  });

  // Create Stripe Checkout for a one-off credit pack
  fastify.post(
    "/checkout-session",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { packId } = request.body as { packId?: string };
      if (!packId) return reply.code(400).send({ error: "packId required" });

      const packResult = await db.execute({
        sql: "SELECT * FROM credit_packs WHERE id = ? AND active = 1",
        args: [packId],
      });
      const pack = packResult.rows[0] as unknown as CreditPackRow | undefined;
      if (!pack) return reply.code(400).send({ error: "Invalid pack" });
      if (!pack.stripe_price_id) {
        return reply
          .code(500)
          .send({ error: "Pack not synced with Stripe. Run stripe:seed." });
      }

      const userId = request.user.sub;
      const userEmail = request.user.email;
      await ensureUserExists(request.user);

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
        mode: "payment",
        line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
        metadata: { userId, packId, credits: String(pack.credits) },
        payment_intent_data: {
          metadata: { userId, packId, credits: String(pack.credits) },
        },
        success_url: `${env.FRONTEND_URL}/app/credits?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/app/credits?checkout=cancelled`,
        allow_promotion_codes: true,
      });

      return { url: session.url };
    },
  );

  // Verify a completed pack session and grant credits if the webhook hasn't
  // fired yet (safety net for dev without `stripe listen`).
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
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.metadata?.userId !== userId) {
          return reply.code(403).send({ error: "Session not owned by user" });
        }
        if (session.status !== "complete") {
          return reply.code(400).send({ error: "Session not complete" });
        }
        if (session.mode !== "payment") {
          return reply.code(400).send({ error: "Not a credit-pack session" });
        }

        const packId = session.metadata?.packId;
        const creditsStr = session.metadata?.credits;
        const credits = creditsStr ? parseInt(creditsStr, 10) : NaN;

        if (!packId || !Number.isFinite(credits) || credits <= 0) {
          return reply
            .code(400)
            .send({ error: "Session missing pack metadata" });
        }

        const already = await db.execute({
          sql: "SELECT 1 FROM credit_transactions WHERE related_stripe_id = ? LIMIT 1",
          args: [sessionId],
        });

        if (already.rows.length === 0) {
          await grantTopupCredits({
            userId,
            amount: credits,
            relatedStripeId: sessionId,
            packId,
          });
          fastify.log.info(
            `Credit pack granted via verify-session: user=${userId}, pack=${packId}, credits=${credits}`,
          );
        }

        return { success: true, packId, credits };
      } catch (err) {
        fastify.log.error({ err }, "Failed to verify credit pack session");
        return reply.code(500).send({ error: "Failed to verify session" });
      }
    },
  );

  // Current user balance
  fastify.get(
    "/balance",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      await ensureUserExists(request.user);
      const balance = await getBalance(request.user.sub);
      return { data: balance };
    },
  );

  // Transaction history
  fastify.get(
    "/transactions",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      await ensureUserExists(request.user);
      const limit = Math.min(
        parseInt((request.query as { limit?: string }).limit || "50", 10) || 50,
        200,
      );
      const txs = await getTransactionHistory(request.user.sub, limit);
      return {
        data: txs.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          bucket: t.bucket,
          balancePlanAfter: t.balance_plan_after,
          balanceTopupAfter: t.balance_topup_after,
          relatedPropertyId: t.related_property_id,
          metadata: t.metadata ? JSON.parse(t.metadata) : null,
          createdAt: t.created_at,
        })),
      };
    },
  );
}
