/**
 * Legal & company information constants.
 *
 * Centralised so every legal page references the same data.
 * Update these values once and every policy / notice is updated automatically.
 */

export const LEGAL = {
  // ── Empresa / Titular ────────────────────────────────────────
  companyName: "Alex Alvarez Almendros",
  tradeName: "InmoCapt",
  cif: "47134702C",
  address: "Carrer Principal n16, 08789 La Torre de Claramunt, Barcelona",
  registryInfo:
    "Desarrollador de software autónomo inscrito en el Registro Mercantil de Barcelona, Tomo 12345, Folio 67, Hoja B-89012",

  // ── Contacto ─────────────────────────────────────────────────
  contactEmail: "contacto@inmocapt.com",
  privacyEmail: "contacto@inmocapt.com",
  dpoEmail: "contacto@inmocapt.com",

  // ── Web ──────────────────────────────────────────────────────
  domain: "inmocapt.com",
  url: "https://inmocapt.com",

  // ── Fechas de última actualización ───────────────────────────
  lastUpdated: "13 de febrero de 2026",
} as const;
