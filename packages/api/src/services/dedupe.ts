// ============================================
// Property identity inside a list
// ============================================
//
// Rule: a list never shows the same property twice, but the same property
// MAY appear in several lists. Two rows of the same list are the same
// property when:
//   - they are the same listing: same portal ad id (`listingKey`), whatever
//     the URL variant (slug, query string, trailing slash, host case); or
//   - both are active and share the owner's phone (`phoneKey`): the same flat
//     relisted, or published on several portals. One contact = one credit.

/** Portal ad-id patterns, matched against the URL path. */
const LISTING_PATTERNS: Array<{ portal: string; host: RegExp; path: RegExp }> = [
  { portal: "idealista", host: /(^|\.)idealista\.com$/, path: /\/inmueble\/(\d+)/ },
  { portal: "habitaclia", host: /(^|\.)habitaclia\.com$/, path: /[-/]i(\d{6,})\.htm/ },
  { portal: "pisoscom", host: /(^|\.)pisos\.com$/, path: /-(\d+_\d+)\/?$/ },
  { portal: "fotocasa", host: /(^|\.)fotocasa\.es$/, path: /\/(\d{6,})\/d(\/|$)/ },
  { portal: "milanuncios", host: /(^|\.)milanuncios\.com$/, path: /[-/]r?(\d{6,})\.htm/ },
];

/**
 * Stable identity of a listing URL: "<portal>:<ad id>" for known portals,
 * otherwise the URL without scheme, "www.", query string, fragment and
 * trailing slash (host lowercased). null for an empty URL.
 */
export function listingKey(url?: string | null): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname;
  for (const { portal, host: hostRe, path: pathRe } of LISTING_PATTERNS) {
    if (!hostRe.test(host)) continue;
    const match = path.match(pathRe);
    if (match) return `${portal}:${match[1]}`;
  }
  return `${host}${path.replace(/\/+$/, "")}`;
}

/**
 * Comparable form of a phone number: digits only, without the Spanish
 * prefix (+34 / 0034), so "685 12 34 56", "685123456" and "+34685123456"
 * match. null when there are fewer than 9 digits.
 */
export function phoneKey(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("0034")) {
    digits = digits.slice(4);
  } else if (digits.length === 11 && digits.startsWith("34")) {
    digits = digits.slice(2);
  }
  return digits.length >= 9 ? digits : null;
}

export interface DedupeCandidate {
  id: string;
  createdAt: string;
  hasInteractions: boolean;
}

/**
 * Which row survives among rows that are the same property: one with
 * interactions (reveals, agent state, credit spends) if any, else the oldest.
 * Rows with interactions are never removed; the rest are.
 */
export function pickSurvivor<T extends DedupeCandidate>(
  rows: T[],
): { keep: T; remove: T[]; keptWithInteractions: T[] } {
  const byAge = [...rows].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const keep = byAge.find((r) => r.hasInteractions) ?? byAge[0];
  const others = byAge.filter((r) => r !== keep);
  return {
    keep,
    remove: others.filter((r) => !r.hasInteractions),
    keptWithInteractions: others.filter((r) => r.hasInteractions),
  };
}
