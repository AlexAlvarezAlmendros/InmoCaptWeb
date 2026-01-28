import { db } from "../config/database.js";

// ============================================
// Types
// ============================================

export type PropertyState = "new" | "contacted" | "captured" | "rejected";

export interface PropertyAgentState {
  userId: string;
  propertyId: string;
  state: PropertyState;
  comment: string | null;
  updatedAt: string;
}

export interface PropertyWithAgentState {
  id: string;
  listId: string;
  price: number;
  m2: number | null;
  bedrooms: number | null;
  phone: string | null;
  ownerName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  // Parsed from rawPayload (Idealista data)
  title: string | null;
  location: string | null;
  description: string | null;
  // Agent-specific state
  state: PropertyState;
  comment: string | null;
  stateUpdatedAt: string | null;
}

export interface GetPropertiesOptions {
  cursor?: string;
  limit?: number;
  stateFilter?: PropertyState | "all";
}

export interface StateCounts {
  new: number;
  contacted: number;
  captured: number;
  rejected: number;
}

export interface PaginatedProperties {
  data: PropertyWithAgentState[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
  stateCounts: StateCounts;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get a property's agent state
 */
export async function getPropertyAgentState(
  userId: string,
  propertyId: string,
): Promise<PropertyAgentState | null> {
  const result = await db.execute({
    sql: `
      SELECT user_id, property_id, state, comment, updated_at
      FROM property_agent_state
      WHERE user_id = ? AND property_id = ?
    `,
    args: [userId, propertyId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.user_id as string,
    propertyId: row.property_id as string,
    state: row.state as PropertyState,
    comment: row.comment as string | null,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Update property state (upsert)
 */
export async function updatePropertyState(
  userId: string,
  propertyId: string,
  state: PropertyState,
): Promise<PropertyAgentState> {
  const now = new Date().toISOString();

  // Upsert: insert or update
  await db.execute({
    sql: `
      INSERT INTO property_agent_state (user_id, property_id, state, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, property_id) 
      DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
    `,
    args: [userId, propertyId, state, now],
  });

  return {
    userId,
    propertyId,
    state,
    comment: null, // Will be fetched if needed
    updatedAt: now,
  };
}

/**
 * Update property comment (upsert)
 */
export async function updatePropertyComment(
  userId: string,
  propertyId: string,
  comment: string,
): Promise<PropertyAgentState> {
  const now = new Date().toISOString();

  // Upsert: insert or update
  await db.execute({
    sql: `
      INSERT INTO property_agent_state (user_id, property_id, state, comment, updated_at)
      VALUES (?, ?, 'new', ?, ?)
      ON CONFLICT (user_id, property_id) 
      DO UPDATE SET comment = excluded.comment, updated_at = excluded.updated_at
    `,
    args: [userId, propertyId, comment, now],
  });

  // Fetch the current state
  const current = await getPropertyAgentState(userId, propertyId);
  return current!;
}

/**
 * Get properties from a list with agent state
 */
export async function getPropertiesWithAgentState(
  userId: string,
  listId: string,
  options: GetPropertiesOptions = {},
): Promise<PaginatedProperties> {
  const { cursor, limit = 50, stateFilter = "all" } = options;

  // Build the query
  let sql = `
    SELECT 
      p.id,
      p.list_id as listId,
      p.price,
      p.m2,
      p.bedrooms,
      p.phone,
      p.owner_name as ownerName,
      p.source_url as sourceUrl,
      p.raw_payload as rawPayload,
      p.created_at as createdAt,
      COALESCE(pas.state, 'new') as state,
      pas.comment,
      pas.updated_at as stateUpdatedAt
    FROM properties p
    LEFT JOIN property_agent_state pas 
      ON pas.property_id = p.id AND pas.user_id = ?
    WHERE p.list_id = ?
  `;

  const args: (string | number)[] = [userId, listId];

  // Filter by state
  if (stateFilter !== "all") {
    if (stateFilter === "new") {
      // "new" means no entry in property_agent_state OR state = 'new'
      sql += " AND (pas.state IS NULL OR pas.state = 'new')";
    } else {
      sql += " AND pas.state = ?";
      args.push(stateFilter);
    }
  }

  // Cursor pagination
  if (cursor) {
    sql += " AND p.created_at < ?";
    args.push(cursor);
  }

  sql += " ORDER BY p.created_at DESC LIMIT ?";
  args.push(limit + 1); // Fetch one extra to determine hasMore

  const result = await db.execute({ sql, args });

  // Get total count
  let countSql = `
    SELECT COUNT(*) as count
    FROM properties p
    LEFT JOIN property_agent_state pas 
      ON pas.property_id = p.id AND pas.user_id = ?
    WHERE p.list_id = ?
  `;
  const countArgs: (string | number)[] = [userId, listId];

  if (stateFilter !== "all") {
    if (stateFilter === "new") {
      countSql += " AND (pas.state IS NULL OR pas.state = 'new')";
    } else {
      countSql += " AND pas.state = ?";
      countArgs.push(stateFilter);
    }
  }

  const countResult = await db.execute({ sql: countSql, args: countArgs });
  const total = Number(countResult.rows[0].count);

  // Process results
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);

  const data: PropertyWithAgentState[] = rows.map((row) => {
    // Parse rawPayload to extract Idealista data
    let title: string | null = null;
    let location: string | null = null;
    let description: string | null = null;

    if (row.rawPayload) {
      try {
        const payload = JSON.parse(row.rawPayload as string);
        title = payload.titulo || null;
        location = payload.ubicacion || null;
        description = payload.descripcion || null;
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: row.id as string,
      listId: row.listId as string,
      price: row.price as number,
      m2: row.m2 as number | null,
      bedrooms: row.bedrooms as number | null,
      phone: row.phone as string | null,
      ownerName: row.ownerName as string | null,
      sourceUrl: row.sourceUrl as string | null,
      createdAt: row.createdAt as string,
      title,
      location,
      description,
      state: (row.state as PropertyState) || "new",
      comment: row.comment as string | null,
      stateUpdatedAt: row.stateUpdatedAt as string | null,
    };
  });

  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1].createdAt : null;

  // Get counts by state (always unfiltered)
  const stateCountsSql = `
    SELECT 
      COALESCE(pas.state, 'new') as state,
      COUNT(*) as count
    FROM properties p
    LEFT JOIN property_agent_state pas 
      ON pas.property_id = p.id AND pas.user_id = ?
    WHERE p.list_id = ?
    GROUP BY COALESCE(pas.state, 'new')
  `;
  const stateCountsResult = await db.execute({
    sql: stateCountsSql,
    args: [userId, listId],
  });

  const stateCounts: StateCounts = {
    new: 0,
    contacted: 0,
    captured: 0,
    rejected: 0,
  };

  for (const row of stateCountsResult.rows) {
    const state = row.state as PropertyState;
    const count = Number(row.count);
    if (state in stateCounts) {
      stateCounts[state] = count;
    }
  }

  return {
    data,
    cursor: nextCursor,
    hasMore,
    total,
    stateCounts,
  };
}

/**
 * Check if a property exists and belongs to a list
 */
export async function propertyExistsInList(
  propertyId: string,
  listId: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM properties WHERE id = ? AND list_id = ?",
    args: [propertyId, listId],
  });

  return result.rows.length > 0;
}
