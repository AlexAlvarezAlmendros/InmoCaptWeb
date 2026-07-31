import type Stripe from "stripe";

/**
 * True when a completed subscription checkout was fully covered by a discount
 * (e.g. the "first month free" 100% promo code). In that case the subscription
 * is active but nothing was charged yet, so the next renewal is the user's
 * first real payment and deserves a heads-up email.
 */
export function isFirstInvoiceFullyDiscounted(
  session: Stripe.Checkout.Session,
): boolean {
  if (session.mode !== "subscription") return false;
  const discount = session.total_details?.amount_discount ?? 0;
  return discount > 0 && session.amount_total === 0;
}
