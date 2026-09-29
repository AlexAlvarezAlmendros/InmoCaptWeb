import { db } from "../config/database.js";
import { randomUUID } from "crypto";
import {
  updateListTimestamp,
  updateListPriceByPropertyCount,
} from "./listService.js";
import { listingKey, phoneKey, pickSurvivor } from "./dedupe.js";

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

export interface DuplicateInfo {
  index: number;
  sourceUrl: string | null;
  /**
   * batch: repeated inside this upload; listing: same listing already in the
   * list (concurrent upload); phone: another active property of the list has
   * the same phone.
   */
  reason: "batch" | "listing" | "phone";
  duplicateOf?: string;
}

export interface UploadResult {
  success: boolean;
  listId: string;
  stats: {
    total: number;
    new: number;
    updated: number;
    duplicates: number;
    duplicatesRemoved: number;
    errors: number;
  };
  duplicates: DuplicateInfo[];
  removedDuplicateIds: string[];
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
// List index (dedupe within one list)
// ============================================

interface IndexedProperty {
  id: string;
  key: string | null;
  phoneKey: string | null;
  active: boolean;
  createdAt: string;
}

/**
 * In-memory view of one list's properties for deduplication: by listing
 * identity (listingKey) and, for active properties, by phone (phoneKey).
 * Other lists are never looked at: the same property may be in several lists.
 */
class ListIndex {
  private byKey = new Map<string, IndexedProperty>();
  private activeByPhone = new Map<string, IndexedProperty[]>();

  static async load(listId: string): Promise<ListIndex> {
    const result = await db.execute({
      sql: "SELECT id, source_url, phone, discontinued, created_at FROM properties WHERE list_id = ?",
      args: [listId],
    });
    const index = new ListIndex();
    for (const row of result.rows) {
      index.add({
        id: row.id as string,
        key: listingKey(row.source_url as string | null),
        phoneKey: phoneKey(row.phone as string | null),
        active: !row.discontinued,
        createdAt: (row.created_at as string | null) ?? "",
      });
    }
    return index;
  }

  add(row: IndexedProperty): void {
    if (row.key && !this.byKey.has(row.key)) this.byKey.set(row.key, row);
    if (row.active && row.phoneKey) {
      const rows = this.activeByPhone.get(row.phoneKey) ?? [];
      rows.push(row);
      this.activeByPhone.set(row.phoneKey, rows);
    }
  }

  remove(row: IndexedProperty): void {
    if (row.key && this.byKey.get(row.key) === row) this.byKey.delete(row.key);
    this.dropPhone(row);
  }

  setPhone(row: IndexedProperty, key: string | null): void {
    this.dropPhone(row);
    row.phoneKey = key;
    if (row.active && key) {
      const rows = this.activeByPhone.get(key) ?? [];
      rows.push(row);
      this.activeByPhone.set(key, rows);
    }
  }

  get(key: string | null): IndexedProperty | undefined {
    return key ? this.byKey.get(key) : undefined;
  }

  activeWithPhone(key: string | null, exceptId?: string): IndexedProperty[] {
    if (!key) return [];
    return (this.activeByPhone.get(key) ?? []).filter((r) => r.id !== exceptId);
  }

  private dropPhone(row: IndexedProperty): void {
    if (!row.phoneKey) return;
    const rows = (this.activeByPhone.get(row.phoneKey) ?? []).filter(
      (r) => r !== row,
    );
    if (rows.length > 0) this.activeByPhone.set(row.phoneKey, rows);
    else this.activeByPhone.delete(row.phoneKey);
  }
}

const SQL_CHUNK = 200;

function chunks<T>(items: T[], size: number = SQL_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Ids (of `ids`) with reveals, agent state or credit movements. */
async function propertiesWithInteractions(ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const part of chunks(ids)) {
    const marks = part.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `
        SELECT property_id AS id FROM user_property_reveals WHERE property_id IN (${marks})
        UNION SELECT property_id FROM property_agent_state WHERE property_id IN (${marks})
        UNION SELECT related_property_id FROM credit_transactions WHERE related_property_id IN (${marks})
      `,
      args: [...part, ...part, ...part],
    });
    for (const row of result.rows) found.add(row.id as string);
  }
  return found;
}

/**
 * Delete duplicate properties. The interaction check is repeated inside the
 * DELETE, so a reveal that lands in between is never lost. Returns the ids
 * actually deleted.
 */
async function deleteDuplicates(ids: string[]): Promise<string[]> {
  const deleted: string[] = [];
  for (const part of chunks(ids)) {
    const marks = part.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `
        DELETE FROM properties
        WHERE id IN (${marks})
          AND id NOT IN (SELECT property_id FROM user_property_reveals)
          AND id NOT IN (SELECT property_id FROM property_agent_state)
          AND id NOT IN (SELECT related_property_id FROM credit_transactions
                         WHERE related_property_id IS NOT NULL)
        RETURNING id
      `,
      args: part,
    });
    for (const row of result.rows) deleted.push(row.id as string);
  }
  return deleted;
}

/**
 * An active property is about to get phone `key`. If other active properties
 * of the same list already have it, they are the same property: keep one
 * (pickSurvivor) and delete the others that nobody has interacted with.
 */
async function resolvePhoneCollision(
  index: ListIndex,
  row: IndexedProperty,
  key: string,
): Promise<{ rowRemoved: boolean; survivorId: string; removedIds: string[] }> {
  const others = index.activeWithPhone(key, row.id);
  if (others.length === 0) {
    return { rowRemoved: false, survivorId: row.id, removedIds: [] };
  }
  const rows = [row, ...others];
  const withInteractions = await propertiesWithInteractions(rows.map((r) => r.id));
  const { keep, remove } = pickSurvivor(
    rows.map((r) => ({ ...r, row: r, hasInteractions: withInteractions.has(r.id) })),
  );
  const removedIds = await deleteDuplicates(remove.map((r) => r.id));
  const removed = new Set(removedIds);
  for (const r of rows) {
    if (removed.has(r.id)) index.remove(r);
  }
  return { rowRemoved: removed.has(row.id), survivorId: keep.id, removedIds };
}

// ============================================
// Service Functions
// ============================================

/**
 * Upload properties to a list with deduplication.
 *
 * Within the list, a property is new unless it is the same listing
 * (listingKey) or an active property already has its phone (phoneKey); the
 * same property may exist in other lists. An existing listing is updated; if
 * it gets a phone that another active property of the list already has, the
 * duplicate nobody has interacted with is deleted (the older one survives).
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
    duplicatesRemoved: 0,
    errors: 0,
  };
  const errors: Array<{ index: number; message: string }> = [];
  const duplicates: DuplicateInfo[] = [];
  const removedDuplicateIds: string[] = [];

  const index = await ListIndex.load(listId);

  // Listings already seen in this upload
  const batchKeys = new Set<string>();

  const duplicate = (info: DuplicateInfo) => {
    stats.duplicates++;
    duplicates.push(info);
  };

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];

    try {
      // Normalize data
      const normalizedPhone = normalizePhone(prop.phone);
      const normalizedUrl = prop.sourceUrl?.trim() || null;
      const rawPayloadJson = prop.rawPayload
        ? JSON.stringify(prop.rawPayload)
        : null;
      const key = listingKey(normalizedUrl);
      const phone = phoneKey(normalizedPhone);

      // Check for duplicates within current batch
      if (key && batchKeys.has(key)) {
        duplicate({ index: i, sourceUrl: normalizedUrl, reason: "batch" });
        continue;
      }
      if (key) {
        batchKeys.add(key);
      }

      const existing = index.get(key);
      if (existing) {
        // Same listing: update it
        if (existing.active && phone && phone !== existing.phoneKey) {
          const collision = await resolvePhoneCollision(index, existing, phone);
          stats.duplicatesRemoved += collision.removedIds.length;
          removedDuplicateIds.push(...collision.removedIds);
          if (collision.rowRemoved) {
            duplicate({
              index: i,
              sourceUrl: normalizedUrl,
              reason: "phone",
              duplicateOf: collision.survivorId,
            });
            continue;
          }
        }
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
            existing.id,
          ],
        });
        index.setPhone(existing, phone);
        stats.updated++;
        continue;
      }

      // Another active property of this list has the same phone
      const samePhone = index.activeWithPhone(phone);
      if (samePhone.length > 0) {
        duplicate({
          index: i,
          sourceUrl: normalizedUrl,
          reason: "phone",
          duplicateOf: samePhone[0].id,
        });
        continue;
      }

      // Insert new property (the NOT EXISTS guard covers a concurrent
      // upload of the same URL to the same list)
      const id = randomUUID();
      const now = new Date().toISOString();
      const inserted = await db.execute({
        sql: `
          INSERT INTO properties (id, list_id, price, m2, bedrooms, phone, owner_name, source_url, raw_payload, created_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE ? IS NULL
             OR NOT EXISTS (SELECT 1 FROM properties WHERE list_id = ? AND source_url = ?)
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
          normalizedUrl,
          listId,
          normalizedUrl,
        ],
      });
      if (inserted.rowsAffected === 0) {
        duplicate({ index: i, sourceUrl: normalizedUrl, reason: "listing" });
        continue;
      }
      stats.new++;

      // Add to the index in case of duplicates later in the batch
      index.add({ id, key, phoneKey: phone, active: true, createdAt: now });
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
    duplicates,
    removedDuplicateIds,
    errors,
  };
}

export interface UpdateResult {
  success: boolean;
  listId: string;
  stats: {
    total: number;
    updated: number;
    duplicates: number;
    duplicatesRemoved: number;
    notFound: number;
    errors: number;
  };
  notFound: string[];
  removedDuplicateIds: string[];
  errors: Array<{
    index: number;
    message: string;
  }>;
}

/**
 * Update existing properties in a list, matching by listing (listingKey of
 * the sourceUrl). Properties not found are reported in `notFound` and never
 * inserted (update-only, no upsert). A phone that another active property
 * of the list already has resolves the duplicate as in uploadProperties.
 */
export async function updateProperties(
  listId: string,
  properties: PropertyInput[],
): Promise<UpdateResult> {
  const stats = {
    total: properties.length,
    updated: 0,
    duplicates: 0,
    duplicatesRemoved: 0,
    notFound: 0,
    errors: 0,
  };
  const notFound: string[] = [];
  const removedDuplicateIds: string[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  const index = await ListIndex.load(listId);

  // Listings already handled in this batch
  const batchKeys = new Set<string>();

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];

    try {
      const normalizedUrl = prop.sourceUrl?.trim() || null;
      const key = listingKey(normalizedUrl);

      // Without a sourceUrl we cannot match an existing property
      if (!normalizedUrl || !key) {
        stats.notFound++;
        notFound.push(`(index ${i}: missing sourceUrl)`);
        continue;
      }

      // Skip duplicates within the current batch
      if (batchKeys.has(key)) {
        stats.duplicates++;
        continue;
      }
      batchKeys.add(key);

      const existing = index.get(key);
      if (!existing) {
        stats.notFound++;
        notFound.push(normalizedUrl);
        continue;
      }

      const normalizedPhone = normalizePhone(prop.phone);
      const phone = phoneKey(normalizedPhone);
      const rawPayloadJson = prop.rawPayload
        ? JSON.stringify(prop.rawPayload)
        : null;

      if (existing.active && phone && phone !== existing.phoneKey) {
        const collision = await resolvePhoneCollision(index, existing, phone);
        stats.duplicatesRemoved += collision.removedIds.length;
        removedDuplicateIds.push(...collision.removedIds);
        if (collision.rowRemoved) continue;
      }

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
          existing.id,
        ],
      });
      index.setPhone(existing, phone);
      stats.updated++;
    } catch (error) {
      stats.errors++;
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Touch the list timestamp if anything actually changed
  if (stats.updated > 0 || stats.duplicatesRemoved > 0) {
    await updateListTimestamp(listId);
  }
  if (stats.duplicatesRemoved > 0) {
    await updateListPriceByPropertyCount(listId);
  }

  return {
    success: stats.errors === 0,
    listId,
    stats,
    notFound,
    removedDuplicateIds,
    errors,
  };
}

// ============================================
// Consolidate existing duplicates
// ============================================

export interface ListDedupeReport {
  listId: string;
  listName: string;
  groups: number;
  duplicateRows: number;
  removed: number;
  keptWithInteractions: number;
  sample: Array<{ keep: string | null; remove: Array<string | null> }>;
}

export interface DedupeListsResult {
  dryRun: boolean;
  lists: ListDedupeReport[];
  totals: { groups: number; duplicateRows: number; removed: number; keptWithInteractions: number };
}

const DEDUPE_SAMPLE = 20;

/**
 * Find (and unless dryRun, delete) duplicates already stored inside each
 * list: active properties that are the same listing or share a phone, joined
 * transitively. Per group, pickSurvivor keeps one; rows with interactions are
 * always kept. Only lists with duplicates are reported.
 */
export async function dedupeLists(
  options: { listId?: string; dryRun?: boolean } = {},
): Promise<DedupeListsResult> {
  const dryRun = options.dryRun ?? true;
  const listsResult = options.listId
    ? await db.execute({ sql: "SELECT id, name FROM lists WHERE id = ?", args: [options.listId] })
    : await db.execute("SELECT id, name FROM lists ORDER BY name");

  const totals = { groups: 0, duplicateRows: 0, removed: 0, keptWithInteractions: 0 };
  const lists: ListDedupeReport[] = [];

  for (const listRow of listsResult.rows) {
    const listId = listRow.id as string;
    const rowsResult = await db.execute({
      sql: `SELECT id, source_url, phone, created_at FROM properties
            WHERE list_id = ? AND (discontinued = 0 OR discontinued IS NULL)`,
      args: [listId],
    });
    const rows = rowsResult.rows.map((r) => ({
      id: r.id as string,
      sourceUrl: r.source_url as string | null,
      createdAt: (r.created_at as string | null) ?? "",
      keys: [
        listingKey(r.source_url as string | null),
        phoneKey(r.phone as string | null),
      ].map((k, n) => (k ? `${n}:${k}` : null)),
    }));

    // Union-find over shared listing keys and phone keys
    const parent = rows.map((_, n) => n);
    const find = (n: number): number => {
      while (parent[n] !== n) {
        parent[n] = parent[parent[n]];
        n = parent[n];
      }
      return n;
    };
    const firstWithKey = new Map<string, number>();
    rows.forEach((row, n) => {
      for (const k of row.keys) {
        if (!k) continue;
        const first = firstWithKey.get(k);
        if (first === undefined) firstWithKey.set(k, n);
        else parent[find(n)] = find(first);
      }
    });
    const groups = new Map<number, typeof rows>();
    rows.forEach((row, n) => {
      const root = find(n);
      groups.set(root, [...(groups.get(root) ?? []), row]);
    });
    const dupGroups = [...groups.values()].filter((g) => g.length > 1);
    if (dupGroups.length === 0) continue;

    const withInteractions = await propertiesWithInteractions(
      dupGroups.flat().map((r) => r.id),
    );
    const report: ListDedupeReport = {
      listId,
      listName: listRow.name as string,
      groups: dupGroups.length,
      duplicateRows: 0,
      removed: 0,
      keptWithInteractions: 0,
      sample: [],
    };
    const toRemove: string[] = [];
    for (const group of dupGroups) {
      const { keep, remove, keptWithInteractions } = pickSurvivor(
        group.map((r) => ({ ...r, hasInteractions: withInteractions.has(r.id) })),
      );
      report.duplicateRows += group.length - 1;
      report.keptWithInteractions += keptWithInteractions.length;
      toRemove.push(...remove.map((r) => r.id));
      if (report.sample.length < DEDUPE_SAMPLE) {
        report.sample.push({ keep: keep.sourceUrl, remove: remove.map((r) => r.sourceUrl) });
      }
    }
    if (dryRun) {
      report.removed = toRemove.length;
    } else {
      report.removed = (await deleteDuplicates(toRemove)).length;
      if (report.removed > 0) {
        await updateListTimestamp(listId);
        await updateListPriceByPropertyCount(listId);
      }
    }

    totals.groups += report.groups;
    totals.duplicateRows += report.duplicateRows;
    totals.removed += report.removed;
    totals.keptWithInteractions += report.keptWithInteractions;
    lists.push(report);
  }

  return { dryRun, lists, totals };
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
  telefono?: string | null; // "+34621194093" or "621194093" or null
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

// ============================================
// Bulk Discontinue by URLs
// ============================================

export interface BulkDiscontinueResult {
  total: number;
  matched: number;
  alreadyDiscontinued: number;
  updated: number;
  notFound: string[];
  affectedListIds: string[];
}

/**
 * Mark properties as discontinued by matching their source_url, in EVERY list
 * that has the listing (the same property may be in several lists).
 * `matched`/`alreadyDiscontinued`/`notFound` count URLs; `updated` counts
 * properties. Recalculates prices for all affected lists.
 */
export async function bulkDiscontinueByUrls(
  urls: string[],
): Promise<BulkDiscontinueResult> {
  const notFound: string[] = [];
  const affectedListIdsSet = new Set<string>();
  let matched = 0;
  let alreadyDiscontinued = 0;
  let updated = 0;

  for (const url of urls) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) continue;

    // Find the property in all lists by source_url
    const result = await db.execute({
      sql: "SELECT id, list_id, discontinued FROM properties WHERE source_url = ?",
      args: [trimmedUrl],
    });

    if (result.rows.length === 0) {
      notFound.push(trimmedUrl);
      continue;
    }

    matched++;
    const pending = result.rows.filter((row) => !row.discontinued);
    if (pending.length === 0) {
      alreadyDiscontinued++;
      continue;
    }

    // Mark as discontinued
    for (const row of pending) {
      await db.execute({
        sql: "UPDATE properties SET discontinued = 1 WHERE id = ?",
        args: [row.id as string],
      });
      updated++;
      affectedListIdsSet.add(row.list_id as string);
    }
  }

  // Recalculate prices for all affected lists
  const affectedListIds = Array.from(affectedListIdsSet);
  for (const listId of affectedListIds) {
    await updateListPriceByPropertyCount(listId);
  }

  return {
    total: urls.length,
    matched,
    alreadyDiscontinued,
    updated,
    notFound,
    affectedListIds,
  };
}
