import { db } from "../config/database.js";
import {
  spendCreditForReveal,
  NoCreditsError,
  type CreditBalance,
  type CreditBucket,
} from "./creditService.js";
import { canAccessList } from "./planService.js";

export interface RevealedContact {
  phone: string | null;
  sourceUrl: string | null;
  ownerName: string | null;
}

export type RevealResult =
  | {
      success: true;
      alreadyRevealed: boolean;
      bucket: CreditBucket | null;
      balance: CreditBalance;
      contact: RevealedContact;
    }
  | {
      success: false;
      reason: "property_not_found" | "no_list_access" | "no_credits";
      balance?: CreditBalance;
    };

interface PropertyContactRow {
  id: string;
  list_id: string;
  phone: string | null;
  source_url: string | null;
  owner_name: string | null;
}

/**
 * Reveal a property's contact for a user. Handles:
 *   - Existence check on property
 *   - Access check (plan covers this list)
 *   - Idempotency (already revealed → no spend)
 *   - Credit spend (plan → topup)
 */
export async function revealPropertyContact(params: {
  userId: string;
  propertyId: string;
}): Promise<RevealResult> {
  const { userId, propertyId } = params;

  const propertyResult = await db.execute({
    sql: "SELECT id, list_id, phone, source_url, owner_name FROM properties WHERE id = ?",
    args: [propertyId],
  });
  if (propertyResult.rows.length === 0) {
    return { success: false, reason: "property_not_found" };
  }
  const property = propertyResult.rows[0] as unknown as PropertyContactRow;

  const hasAccess = await canAccessList(userId, property.list_id);
  if (!hasAccess) {
    return { success: false, reason: "no_list_access" };
  }

  try {
    const spend = await spendCreditForReveal({ userId, propertyId });
    return {
      success: true,
      alreadyRevealed: spend.alreadyRevealed,
      bucket: spend.bucket,
      balance: spend.balance,
      contact: {
        phone: property.phone,
        sourceUrl: property.source_url,
        ownerName: property.owner_name,
      },
    };
  } catch (err) {
    if (err instanceof NoCreditsError) {
      return { success: false, reason: "no_credits" };
    }
    throw err;
  }
}
