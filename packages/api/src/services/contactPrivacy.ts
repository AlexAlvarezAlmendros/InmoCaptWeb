// ============================================
// Owners who object to being contacted ("no_contactar")
// ============================================
//
// The scraper flags a listing `no_contactar: true` when its owner objects to
// agencies (e.g. "abstenerse inmobiliarias") or asked to be erased. Such a
// property keeps no phone here, its free text is redacted, and the flag is
// sticky: a later upload can never bring the phone back.

// Same markers as the scraper (HomeScrapper portales/runner.py)
export const PHONE_REDACTED = "[teléfono oculto]";
export const EMAIL_REDACTED = "[email oculto]";

/** Spanish phone numbers, with optional +34/0034 and . - or space separators. */
const PHONE_RE = /(?<![\d+])(?:(?:\+|00)\s*34[\s.-]*)?[6789](?:[\s.-]*\d){8}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Free-text fields of raw_payload that may contain contact details. */
const TEXT_FIELDS = ["titulo", "descripcion"] as const;

export function redactContactText(text: string): string {
  return text.replace(EMAIL_RE, EMAIL_REDACTED).replace(PHONE_RE, PHONE_REDACTED);
}

/** Copy of `payload` flagged no_contactar, with its free text redacted. */
export function redactPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload, no_contactar: true };
  for (const field of TEXT_FIELDS) {
    const value = out[field];
    if (typeof value === "string") out[field] = redactContactText(value);
  }
  return out;
}
