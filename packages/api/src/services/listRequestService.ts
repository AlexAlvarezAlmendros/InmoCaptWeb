import { db } from "../config/database.js";

export interface ListRequest {
  id: string;
  user_id: string;
  location: string;
  notes: string | null;
  status: string;
  created_list_id: string | null;
  created_at: string;
}

export interface CreateListRequestParams {
  userId: string;
  location: string;
  notes?: string;
}

/**
 * Create a new list request
 */
export async function createListRequest(
  params: CreateListRequestParams,
): Promise<string> {
  const id = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO list_requests (id, user_id, location, notes, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `,
    args: [id, params.userId, params.location, params.notes || null],
  });

  return id;
}

/**
 * Get list requests for a user
 */
export async function getListRequestsByUser(
  userId: string,
): Promise<ListRequest[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM list_requests 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });

  return result.rows as unknown as ListRequest[];
}

/**
 * Get all list requests (admin)
 */
export async function getAllListRequests(
  status?: string,
): Promise<ListRequest[]> {
  let sql = "SELECT * FROM list_requests";
  const args: string[] = [];

  if (status) {
    sql += " WHERE status = ?";
    args.push(status);
  }

  sql += " ORDER BY created_at DESC";

  const result = await db.execute({ sql, args });
  return result.rows as unknown as ListRequest[];
}

/**
 * Update list request status (admin)
 */
export async function updateListRequestStatus(
  requestId: string,
  status: string,
  createdListId?: string,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE list_requests 
      SET status = ?, created_list_id = ?
      WHERE id = ?
    `,
    args: [status, createdListId || null, requestId],
  });
}

/**
 * Get list request by ID
 */
export async function getListRequestById(
  requestId: string,
): Promise<ListRequest | null> {
  const result = await db.execute({
    sql: "SELECT * FROM list_requests WHERE id = ?",
    args: [requestId],
  });

  return (result.rows[0] as unknown as ListRequest) || null;
}
