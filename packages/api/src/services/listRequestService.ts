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

export interface ListRequestWithUser extends ListRequest {
  user_email: string | null;
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
 * Get all list requests (admin) with user email
 */
export async function getAllListRequests(
  status?: string,
): Promise<ListRequestWithUser[]> {
  let sql = `
    SELECT lr.*, u.email as user_email
    FROM list_requests lr
    LEFT JOIN users u ON lr.user_id = u.id
  `;
  const args: string[] = [];

  if (status) {
    sql += " WHERE lr.status = ?";
    args.push(status);
  }

  sql += " ORDER BY lr.created_at DESC";

  const result = await db.execute({ sql, args });
  return result.rows as unknown as ListRequestWithUser[];
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

/**
 * Approve a list request and create the associated list
 */
export async function approveListRequest(
  requestId: string,
  listData: {
    name: string;
    location: string;
    priceCents: number;
    currency: string;
  },
): Promise<{ request: ListRequest; listId: string }> {
  // Import here to avoid circular dependency
  const { createList } = await import("./listService.js");

  // Create the list
  const newList = await createList(listData);

  // Update the request status
  await updateListRequestStatus(requestId, "approved", newList.id);

  // Get updated request
  const updatedRequest = await getListRequestById(requestId);

  return {
    request: updatedRequest!,
    listId: newList.id,
  };
}

/**
 * Reject a list request
 */
export async function rejectListRequest(
  requestId: string,
): Promise<ListRequest> {
  await updateListRequestStatus(requestId, "rejected");

  const updatedRequest = await getListRequestById(requestId);
  return updatedRequest!;
}
