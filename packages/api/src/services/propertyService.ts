import { db } from "../config/database.js";
import { randomUUID } from "crypto";
import {
  updateListTimestamp,
  updateListPriceByPropertyCount,
} from "./listService.js";

// ============================================
// Types
// ============================================

export interface Property {
  id: string;
  listId: string;
  price: number;
  m2: number | null;
  bedrooms: number | null;
  phone: string | null;
  ownerName: string | null;
  sourceUrl: string | null;
  rawPayload: string | null;
  createdAt: string;
}

export interface PropertyInput {
  price: number;
  m2?: number;
  bedrooms?: number;
  phone?: string;
  ownerName?: string;
  sourceUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  listId: string;
  stats: {
    total: number;
    new: number;
    updated: number;
    duplicates: number;
    errors: number;
  };
  errors: Array<{
    index: number;
    message: string;
  }>;
}

export interface ListUpdate {
  id: string;
  listId: string;
  uploadedBy: string;
  addedCount: number;
  updatedAt: string;
  createdAt: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Upload properties to a list with deduplication
 */
export async function uploadProperties(
  listId: string,
  properties: PropertyInput[],
  uploadedBy: string,
): Promise<UploadResult> {
  const stats = {
    total: properties.length,
    new: 0,
    updated: 0,
    duplicates: 0,
    errors: 0,
  };
  const errors: Array<{ index: number; message: string }> = [];

  // Get existing properties by sourceUrl for deduplication
  const existingResult = await db.execute({
    sql: "SELECT id, source_url FROM properties WHERE list_id = ? AND source_url IS NOT NULL",
    args: [listId],
  });

  const existingByUrl = new Map<string, string>();
  for (const row of existingResult.rows) {
    if (row.source_url) {
      existingByUrl.set(row.source_url as string, row.id as string);
    }
  }

  // Track URLs in current batch to detect duplicates within the upload
  const batchUrls = new Set<string>();

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];

    try {
      // Normalize data
      const normalizedPhone = normalizePhone(prop.phone);
      const normalizedUrl = prop.sourceUrl?.trim() || null;
      const rawPayloadJson = prop.rawPayload
        ? JSON.stringify(prop.rawPayload)
        : null;

      // Check for duplicates within current batch
      if (normalizedUrl && batchUrls.has(normalizedUrl)) {
        stats.duplicates++;
        continue;
      }

      if (normalizedUrl) {
        batchUrls.add(normalizedUrl);
      }

      // Check if property already exists (by sourceUrl)
      if (normalizedUrl && existingByUrl.has(normalizedUrl)) {
        // Update existing property
        const existingId = existingByUrl.get(normalizedUrl)!;
        await db.execute({
          sql: `
            UPDATE properties 
            SET price = ?, m2 = ?, bedrooms = ?, phone = ?, owner_name = ?, raw_payload = ?
            WHERE id = ?
          `,
          args: [
            prop.price,
            prop.m2 ?? null,
            prop.bedrooms ?? null,
            normalizedPhone,
            prop.ownerName?.trim() ?? null,
            rawPayloadJson,
            existingId,
          ],
        });
        stats.updated++;
      } else {
        // Insert new property
        const id = randomUUID();
        const now = new Date().toISOString();

        await db.execute({
          sql: `
            INSERT INTO properties (id, list_id, price, m2, bedrooms, phone, owner_name, source_url, raw_payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            id,
            listId,
            prop.price,
            prop.m2 ?? null,
            prop.bedrooms ?? null,
            normalizedPhone,
            prop.ownerName?.trim() ?? null,
            normalizedUrl,
            rawPayloadJson,
            now,
          ],
        });
        stats.new++;

        // Add to existing map in case of duplicates later in the batch
        if (normalizedUrl) {
          existingByUrl.set(normalizedUrl, id);
        }
      }
    } catch (error) {
      stats.errors++;
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Record the upload in list_updates
  const updateId = randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO list_updates (id, list_id, uploaded_by, added_count, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [updateId, listId, uploadedBy, stats.new, now, now],
  });

  // Update list timestamp
  await updateListTimestamp(listId);

  // Update list price based on total property count (2€ per property)
  await updateListPriceByPropertyCount(listId);

  return {
    success: stats.errors === 0,
    listId,
    stats,
    errors,
  };
}

/**
 * Get properties for a list with pagination
 */
export async function getPropertiesByList(
  listId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{
  data: Property[];
  cursor: string | null;
  hasMore: boolean;
}> {
  const limit = options.limit || 50;
  const cursor = options.cursor;

  let sql = `
    SELECT 
      id, list_id as listId, price, m2, bedrooms, phone, 
      owner_name as ownerName, source_url as sourceUrl, 
      raw_payload as rawPayload, created_at as createdAt
    FROM properties
    WHERE list_id = ?
  `;
  const args: (string | number)[] = [listId];

  if (cursor) {
    sql += " AND created_at < ?";
    args.push(cursor);
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  args.push(limit + 1); // Fetch one extra to determine hasMore

  const result = await db.execute({ sql, args });

  const hasMore = result.rows.length > limit;
  const data = result.rows.slice(0, limit).map((row) => ({
    id: row.id as string,
    listId: row.listId as string,
    price: row.price as number,
    m2: row.m2 as number | null,
    bedrooms: row.bedrooms as number | null,
    phone: row.phone as string | null,
    ownerName: row.ownerName as string | null,
    sourceUrl: row.sourceUrl as string | null,
    rawPayload: row.rawPayload as string | null,
    createdAt: row.createdAt as string,
  }));

  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1].createdAt : null;

  return {
    data,
    cursor: nextCursor,
    hasMore,
  };
}

/**
 * Count properties added after a certain date
 */
export async function countNewProperties(
  listId: string,
  since: string,
): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM properties WHERE list_id = ? AND created_at > ?",
    args: [listId, since],
  });

  return Number(result.rows[0].count);
}

/**
 * Get total property count for a list
 */
export async function countProperties(listId: string): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM properties WHERE list_id = ?",
    args: [listId],
  });

  return Number(result.rows[0].count);
}

/**
 * Get recent list updates
 */
export async function getListUpdates(
  listId: string,
  limit: number = 10,
): Promise<ListUpdate[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        id, list_id as listId, uploaded_by as uploadedBy, 
        added_count as addedCount, updated_at as updatedAt, created_at as createdAt
      FROM list_updates
      WHERE list_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    args: [listId, limit],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    listId: row.listId as string,
    uploadedBy: row.uploadedBy as string,
    addedCount: Number(row.addedCount),
    updatedAt: row.updatedAt as string,
    createdAt: row.createdAt as string,
  }));
}

/**
 * Delete a property
 */
export async function deleteProperty(propertyId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "DELETE FROM properties WHERE id = ?",
    args: [propertyId],
  });

  return result.rowsAffected > 0;
}

/**
 * Delete all properties from a list
 */
export async function deleteAllPropertiesFromList(
  listId: string,
): Promise<number> {
  const result = await db.execute({
    sql: "DELETE FROM properties WHERE list_id = ?",
    args: [listId],
  });

  return result.rowsAffected;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize phone number
 */
function normalizePhone(phone?: string): string | null {
  if (!phone) return null;

  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, "");

  // Ensure it starts with + if it has country code
  if (normalized.length > 9 && !normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }

  return normalized || null;
}

// ============================================
// Idealista Format Parsing
// ============================================

export interface IdealistaRawProperty {
  titulo?: string;
  precio: string; // "90.000€"
  ubicacion?: string;
  habitaciones?: string | null; // "3 hab." or null
  metros?: string | null; // "70 m²"
  url: string;
  descripcion?: string | null;
  anunciante?: string;
  fecha_scraping?: string;
}

export interface IdealistaUpload {
  timestamp?: string;
  url?: string;
  total?: number;
  particulares?: number;
  inmobiliarias?: number;
  viviendas: {
    todas: IdealistaRawProperty[];
  };
}

/**
 * Parse price from Idealista format (e.g., "90.000€" -> 90000)
 */
function parseIdealistaPrice(priceStr: string): number {
  // Remove currency symbols, dots as thousand separators, and spaces
  const cleaned = priceStr
    .replace(/[€$\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");
  const price = parseInt(cleaned, 10);
  return isNaN(price) ? 0 : price;
}

/**
 * Parse square meters from Idealista format (e.g., "70 m²" -> 70)
 */
function parseIdealistaM2(metrosStr?: string | null): number | undefined {
  if (!metrosStr) return undefined;
  const match = metrosStr.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return undefined;
  const m2 = parseInt(match[1].replace(",", "."), 10);
  return isNaN(m2) ? undefined : m2;
}

/**
 * Parse bedrooms from Idealista format (e.g., "3 hab." -> 3)
 */
function parseIdealistaBedrooms(habStr?: string | null): number | undefined {
  if (!habStr) return undefined;
  const match = habStr.match(/(\d+)/);
  if (!match) return undefined;
  const bedrooms = parseInt(match[1], 10);
  return isNaN(bedrooms) ? undefined : bedrooms;
}

/**
 * Convert Idealista raw property to internal PropertyInput format
 */
export function parseIdealistaProperty(
  raw: IdealistaRawProperty,
): PropertyInput {
  return {
    price: parseIdealistaPrice(raw.precio),
    m2: parseIdealistaM2(raw.metros),
    bedrooms: parseIdealistaBedrooms(raw.habitaciones),
    sourceUrl: raw.url,
    ownerName: raw.anunciante,
    // Store the full raw data for reference
    rawPayload: {
      titulo: raw.titulo,
      ubicacion: raw.ubicacion,
      descripcion: raw.descripcion,
      fecha_scraping: raw.fecha_scraping,
      precio_original: raw.precio,
      habitaciones_original: raw.habitaciones,
      metros_original: raw.metros,
    },
  };
}

/**
 * Convert Idealista upload format to array of PropertyInput
 */
export function parseIdealistaUpload(data: IdealistaUpload): PropertyInput[] {
  return data.viviendas.todas.map(parseIdealistaProperty);
}

/**
 * Detect if the JSON data is in Idealista format
 */
export function isIdealistaFormat(data: unknown): data is IdealistaUpload {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.viviendas === "object" &&
    obj.viviendas !== null &&
    Array.isArray((obj.viviendas as Record<string, unknown>).todas)
  );
}

// ============================================
// Fotocasa Format Parsing
// ============================================

export interface FotocasaRawProperty {
  titulo?: string;
  precio: string; // "60.000 €"
  ubicacion?: string;
  habitaciones?: string | null; // "3 habs" or null
  metros?: string | null; // "65 m²"
  url: string;
  descripcion?: string | null;
  anunciante?: string;
  fecha_scraping?: string;
  telefono?: string | null; // "+34636517189" or "636517189" or null
}

export interface FotocasaUpload {
  timestamp?: string;
  ubicacion: string; // Used as listName and location
  url?: string;
  total?: number;
  viviendas: FotocasaRawProperty[];
}

/**
 * Convert Fotocasa raw property to internal PropertyInput format
 */
export function parseFotocasaProperty(raw: FotocasaRawProperty): PropertyInput {
  return {
    price: parseIdealistaPrice(raw.precio), // Same format "X.XXX €"
    m2: parseIdealistaM2(raw.metros),
    bedrooms: parseIdealistaBedrooms(raw.habitaciones), // Works for both "3 hab." and "3 habs"
    phone: raw.telefono ?? undefined,
    sourceUrl: raw.url,
    ownerName: raw.anunciante,
    // Store the full raw data for reference
    rawPayload: {
      titulo: raw.titulo,
      ubicacion: raw.ubicacion,
      descripcion: raw.descripcion,
      fecha_scraping: raw.fecha_scraping,
      precio_original: raw.precio,
      habitaciones_original: raw.habitaciones,
      metros_original: raw.metros,
    },
  };
}

/**
 * Convert Fotocasa upload format to array of PropertyInput
 */
export function parseFotocasaUpload(data: FotocasaUpload): PropertyInput[] {
  return data.viviendas.map(parseFotocasaProperty);
}

/**
 * Detect if the JSON data is in Fotocasa format
 * Fotocasa has: viviendas as direct array (not viviendas.todas) + ubicacion at root level
 */
export function isFotocasaFormat(data: unknown): data is FotocasaUpload {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.ubicacion === "string" && Array.isArray(obj.viviendas);
}
