import { db } from "../config/database.js";
import { randomUUID } from "crypto";

// ============================================
// Types
// ============================================

export interface List {
  id: string;
  name: string;
  location: string;
  priceCents: number;
  currency: string;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface ListWithStats extends List {
  subscriberCount: number;
  totalProperties: number;
}

export interface CreateListInput {
  name: string;
  location: string;
  priceCents: number;
  currency?: string;
}

export interface UpdateListInput {
  name?: string;
  location?: string;
  priceCents?: number;
  currency?: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all lists with subscriber count and property count
 */
export async function getAllLists(): Promise<ListWithStats[]> {
  const result = await db.execute(`
    SELECT 
      l.id,
      l.name,
      l.location,
      l.price_cents as priceCents,
      l.currency,
      l.last_updated_at as lastUpdatedAt,
      l.created_at as createdAt,
      COALESCE(sub_count.count, 0) as subscriberCount,
      COALESCE(prop_count.count, 0) as totalProperties
    FROM lists l
    LEFT JOIN (
      SELECT list_id, COUNT(*) as count 
      FROM subscriptions 
      WHERE status = 'active'
      GROUP BY list_id
    ) sub_count ON l.id = sub_count.list_id
    LEFT JOIN (
      SELECT list_id, COUNT(*) as count 
      FROM properties 
      GROUP BY list_id
    ) prop_count ON l.id = prop_count.list_id
    ORDER BY l.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    location: row.location as string,
    priceCents: row.priceCents as number,
    currency: row.currency as string,
    lastUpdatedAt: row.lastUpdatedAt as string,
    createdAt: row.createdAt as string,
    subscriberCount: Number(row.subscriberCount),
    totalProperties: Number(row.totalProperties),
  }));
}

/**
 * Get lists available for a user to subscribe to (excluding already subscribed)
 */
export async function getAvailableListsForUser(
  userId: string,
): Promise<ListWithStats[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        l.id,
        l.name,
        l.location,
        l.price_cents as priceCents,
        l.currency,
        l.last_updated_at as lastUpdatedAt,
        l.created_at as createdAt,
        COALESCE(sub_count.count, 0) as subscriberCount,
        COALESCE(prop_count.count, 0) as totalProperties
      FROM lists l
      LEFT JOIN (
        SELECT list_id, COUNT(*) as count 
        FROM subscriptions 
        WHERE status = 'active'
        GROUP BY list_id
      ) sub_count ON l.id = sub_count.list_id
      LEFT JOIN (
        SELECT list_id, COUNT(*) as count 
        FROM properties 
        GROUP BY list_id
      ) prop_count ON l.id = prop_count.list_id
      WHERE l.id NOT IN (
        SELECT list_id FROM subscriptions 
        WHERE user_id = ? AND status = 'active'
      )
      ORDER BY l.created_at DESC
    `,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    location: row.location as string,
    priceCents: row.priceCents as number,
    currency: row.currency as string,
    lastUpdatedAt: row.lastUpdatedAt as string,
    createdAt: row.createdAt as string,
    subscriberCount: Number(row.subscriberCount),
    totalProperties: Number(row.totalProperties),
  }));
}

/**
 * Get a single list by ID
 */
export async function getListById(listId: string): Promise<List | null> {
  const result = await db.execute({
    sql: `
      SELECT 
        id,
        name,
        location,
        price_cents as priceCents,
        currency,
        last_updated_at as lastUpdatedAt,
        created_at as createdAt
      FROM lists
      WHERE id = ?
    `,
    args: [listId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    location: row.location as string,
    priceCents: row.priceCents as number,
    currency: row.currency as string,
    lastUpdatedAt: row.lastUpdatedAt as string,
    createdAt: row.createdAt as string,
  };
}

/**
 * Get list with stats by ID
 */
export async function getListWithStats(
  listId: string,
): Promise<ListWithStats | null> {
  const result = await db.execute({
    sql: `
      SELECT 
        l.id,
        l.name,
        l.location,
        l.price_cents as priceCents,
        l.currency,
        l.last_updated_at as lastUpdatedAt,
        l.created_at as createdAt,
        COALESCE(sub_count.count, 0) as subscriberCount,
        COALESCE(prop_count.count, 0) as totalProperties
      FROM lists l
      LEFT JOIN (
        SELECT list_id, COUNT(*) as count 
        FROM subscriptions 
        WHERE status = 'active' AND list_id = ?
        GROUP BY list_id
      ) sub_count ON l.id = sub_count.list_id
      LEFT JOIN (
        SELECT list_id, COUNT(*) as count 
        FROM properties 
        WHERE list_id = ?
        GROUP BY list_id
      ) prop_count ON l.id = prop_count.list_id
      WHERE l.id = ?
    `,
    args: [listId, listId, listId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    location: row.location as string,
    priceCents: row.priceCents as number,
    currency: row.currency as string,
    lastUpdatedAt: row.lastUpdatedAt as string,
    createdAt: row.createdAt as string,
    subscriberCount: Number(row.subscriberCount),
    totalProperties: Number(row.totalProperties),
  };
}

/**
 * Create a new list
 */
export async function createList(input: CreateListInput): Promise<List> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const currency = input.currency || "EUR";

  await db.execute({
    sql: `
      INSERT INTO lists (id, name, location, price_cents, currency, last_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.name,
      input.location,
      input.priceCents,
      currency,
      now,
      now,
    ],
  });

  return {
    id,
    name: input.name,
    location: input.location,
    priceCents: input.priceCents,
    currency,
    lastUpdatedAt: now,
    createdAt: now,
  };
}

/**
 * Update an existing list
 */
export async function updateList(
  listId: string,
  input: UpdateListInput,
): Promise<List | null> {
  // First check if the list exists
  const existing = await getListById(listId);
  if (!existing) {
    return null;
  }

  // Build dynamic update query
  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    args.push(input.name);
  }
  if (input.location !== undefined) {
    updates.push("location = ?");
    args.push(input.location);
  }
  if (input.priceCents !== undefined) {
    updates.push("price_cents = ?");
    args.push(input.priceCents);
  }
  if (input.currency !== undefined) {
    updates.push("currency = ?");
    args.push(input.currency);
  }

  if (updates.length === 0) {
    return existing; // Nothing to update
  }

  args.push(listId);

  await db.execute({
    sql: `UPDATE lists SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });

  // Return updated list
  return getListById(listId);
}

/**
 * Delete a list (and cascade to properties, subscriptions)
 */
export async function deleteList(listId: string): Promise<boolean> {
  const existing = await getListById(listId);
  if (!existing) {
    return false;
  }

  await db.execute({
    sql: "DELETE FROM lists WHERE id = ?",
    args: [listId],
  });

  return true;
}

/**
 * Update the last_updated_at timestamp for a list
 */
export async function updateListTimestamp(listId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE lists SET last_updated_at = ? WHERE id = ?",
    args: [now, listId],
  });
}

/**
 * Get subscriber emails for a list (for notifications)
 */
export async function getListSubscriberEmails(
  listId: string,
): Promise<string[]> {
  const result = await db.execute({
    sql: `
      SELECT u.email
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id
      WHERE s.list_id = ? AND s.status = 'active' AND u.email_notifications_on = 1
    `,
    args: [listId],
  });

  return result.rows.map((row) => row.email as string);
}

/**
 * Find a list by name and location (case-insensitive)
 */
export async function findListByNameAndLocation(
  name: string,
  location: string,
): Promise<List | null> {
  const result = await db.execute({
    sql: `
      SELECT 
        id,
        name,
        location,
        price_cents as priceCents,
        currency,
        last_updated_at as lastUpdatedAt,
        created_at as createdAt
      FROM lists
      WHERE LOWER(name) = LOWER(?) AND LOWER(location) = LOWER(?)
      LIMIT 1
    `,
    args: [name, location],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    location: row.location as string,
    priceCents: row.priceCents as number,
    currency: row.currency as string,
    lastUpdatedAt: row.lastUpdatedAt as string,
    createdAt: row.createdAt as string,
  };
}

/**
 * Find or create a list by name and location
 */
export async function findOrCreateList(
  name: string,
  location: string,
  defaultPriceCents: number = 0,
): Promise<{ list: List; created: boolean }> {
  // Try to find existing list
  const existing = await findListByNameAndLocation(name, location);
  if (existing) {
    return { list: existing, created: false };
  }

  // Create new list
  const newList = await createList({
    name,
    location,
    priceCents: defaultPriceCents,
    currency: "EUR",
  });

  return { list: newList, created: true };
}
