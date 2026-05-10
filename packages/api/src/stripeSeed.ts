import "dotenv/config";
import { stripe } from "./config/stripe.js";
import { db } from "./config/database.js";

/**
 * Idempotent script: syncs Stripe products and prices with the plans and
 * credit_packs seeded in the database. Reads current rows, creates missing
 * Stripe products/prices, and writes stripe_price_id back.
 *
 * Usage: npm run stripe:seed
 *
 * Behaviour:
 *  - Trial plan is skipped (no Stripe product).
 *  - If a plan/pack already has stripe_price_id set and it exists in Stripe,
 *    nothing is done for that row.
 *  - If stripe_price_id is stale (not found in Stripe), a new price is created
 *    and the DB is updated.
 */

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  monthly_credits: number;
  max_lists: number | null;
  stripe_price_id: string | null;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
}

async function verifyPriceExists(priceId: string): Promise<boolean> {
  try {
    await stripe.prices.retrieve(priceId);
    return true;
  } catch {
    return false;
  }
}

async function syncPlan(plan: Plan): Promise<void> {
  if (plan.id === "trial") {
    console.log(`[plan:trial] skipping (no Stripe product needed)`);
    return;
  }

  if (plan.stripe_price_id && (await verifyPriceExists(plan.stripe_price_id))) {
    console.log(`[plan:${plan.id}] already synced (${plan.stripe_price_id})`);
    return;
  }

  // Find or create the Stripe Product (by metadata.plan_id)
  const existingProducts = await stripe.products.search({
    query: `active:'true' AND metadata['plan_id']:'${plan.id}'`,
  });
  let productId: string;
  if (existingProducts.data[0]) {
    productId = existingProducts.data[0].id;
    console.log(`[plan:${plan.id}] using existing product ${productId}`);
  } else {
    const description =
      plan.max_lists === null
        ? `Listas ilimitadas + ${plan.monthly_credits} créditos/mes`
        : `${plan.max_lists} lista${plan.max_lists > 1 ? "s" : ""} + ${plan.monthly_credits} créditos/mes`;
    const product = await stripe.products.create({
      name: `InmoCapt · ${plan.name}`,
      description,
      metadata: { plan_id: plan.id },
    });
    productId = product.id;
    console.log(`[plan:${plan.id}] created product ${productId}`);
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.price_cents,
    currency: plan.currency.toLowerCase(),
    recurring: { interval: "month" },
    metadata: { plan_id: plan.id },
  });

  await db.execute({
    sql: "UPDATE plans SET stripe_price_id = ? WHERE id = ?",
    args: [price.id, plan.id],
  });
  console.log(`[plan:${plan.id}] created price ${price.id}`);
}

async function syncPack(pack: CreditPack): Promise<void> {
  if (pack.stripe_price_id && (await verifyPriceExists(pack.stripe_price_id))) {
    console.log(`[pack:${pack.id}] already synced (${pack.stripe_price_id})`);
    return;
  }

  const existingProducts = await stripe.products.search({
    query: `active:'true' AND metadata['pack_id']:'${pack.id}'`,
  });
  let productId: string;
  if (existingProducts.data[0]) {
    productId = existingProducts.data[0].id;
    console.log(`[pack:${pack.id}] using existing product ${productId}`);
  } else {
    const product = await stripe.products.create({
      name: `InmoCapt · ${pack.name}`,
      description: `${pack.credits} créditos para revelar contactos (pago único, no caducan)`,
      metadata: { pack_id: pack.id },
    });
    productId = product.id;
    console.log(`[pack:${pack.id}] created product ${productId}`);
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: pack.price_cents,
    currency: pack.currency.toLowerCase(),
    metadata: { pack_id: pack.id },
  });

  await db.execute({
    sql: "UPDATE credit_packs SET stripe_price_id = ? WHERE id = ?",
    args: [price.id, pack.id],
  });
  console.log(`[pack:${pack.id}] created price ${price.id}`);
}

async function main() {
  console.log("Syncing plans to Stripe...\n");
  const plans = await db.execute("SELECT * FROM plans ORDER BY sort_order");
  for (const row of plans.rows) {
    await syncPlan(row as unknown as Plan);
  }

  console.log("\nSyncing credit packs to Stripe...\n");
  const packs = await db.execute(
    "SELECT * FROM credit_packs ORDER BY sort_order",
  );
  for (const row of packs.rows) {
    await syncPack(row as unknown as CreditPack);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
