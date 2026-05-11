import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate, requireRole, type AuthUser } from "../plugins/auth.js";
import { db } from "../config/database.js";
import {
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList,
} from "../services/listService.js";
import {
  ensureUserExists,
  getUserById,
  getAllUsersWithStats,
  getUserWithSubscriptions,
  setUserTestStatus,
} from "../services/userService.js";
import {
  uploadProperties,
  isIdealistaFormat,
  parseIdealistaUpload,
  bulkDiscontinueByUrls,
  type PropertyInput,
} from "../services/propertyService.js";
import {
  getAllListRequests,
  getListRequestById,
  approveListRequest,
  rejectListRequest,
} from "../services/listRequestService.js";
import {
  getAllPlansIncludingTrial,
  getPlanById,
} from "../services/planService.js";
import {
  createListSchema,
  updateListSchema,
  updateSettingsSchema,
  uploadPropertiesSchema,
  idealistaUploadSchema,
  bulkDiscontinuedSchema,
  updatePlanSchema,
  updateCreditPackSchema,
  zodValidate,
} from "../schemas/validation.js";
import { getListSubscribersWithNotifications } from "../services/subscriptionService.js";
import {
  notifyListSubscribers,
  sendListRequestApprovedEmail,
  sendListRequestRejectedEmail,
} from "../services/emailService.js";

export async function adminRoutes(fastify: FastifyInstance) {
  // ============================================
  // Lists Management
  // ============================================

  // Get all lists with stats
  fastify.get(
    "/lists",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const lists = await getAllLists();
      return { data: lists };
    },
  );

  // Get single list
  fastify.get(
    "/lists/:listId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { listId } = request.params as { listId: string };

      const list = await getListById(listId);
      if (!list) {
        return reply.status(404).send({ error: "List not found" });
      }

      return { data: list };
    },
  );

  // Create new list
  fastify.post(
    "/lists",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = zodValidate(createListSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error });
      }

      const list = await createList(validation.data);
      return reply.status(201).send({ data: list });
    },
  );

  // Update list
  fastify.patch(
    "/lists/:listId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { listId } = request.params as { listId: string };

      const validation = zodValidate(updateListSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error });
      }

      const list = await updateList(listId, validation.data);
      if (!list) {
        return reply.status(404).send({ error: "List not found" });
      }

      return { data: list };
    },
  );

  // Delete list
  fastify.delete(
    "/lists/:listId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { listId } = request.params as { listId: string };

      const deleted = await deleteList(listId);
      if (!deleted) {
        return reply.status(404).send({ error: "List not found" });
      }

      return reply.status(204).send();
    },
  );

  // Upload properties JSON (supports both Idealista format and simplified format)
  fastify.post(
    "/lists/:listId/upload",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { listId } = request.params as { listId: string };
      const authUser = request.user as AuthUser;

      // Ensure user exists in DB (needed for list_updates FK)
      await ensureUserExists(authUser);

      // Check list exists
      const list = await getListById(listId);
      if (!list) {
        return reply.status(404).send({ error: "List not found" });
      }

      let properties: PropertyInput[];

      // Detect format and parse accordingly
      if (isIdealistaFormat(request.body)) {
        // Validate Idealista format
        const validation = zodValidate(idealistaUploadSchema, request.body);
        if (!validation.success) {
          return reply.status(400).send({ error: validation.error });
        }
        // Convert to internal format
        properties = parseIdealistaUpload(validation.data);
      } else {
        // Validate simplified format
        const validation = zodValidate(uploadPropertiesSchema, request.body);
        if (!validation.success) {
          return reply.status(400).send({ error: validation.error });
        }
        properties = validation.data.properties;
      }

      // Upload properties (deduplication by URL happens inside)
      const result = await uploadProperties(listId, properties, authUser.sub);

      // Notify subscribers if new properties were added
      if (result.stats.new > 0) {
        try {
          const subscribers = await getListSubscribersWithNotifications(listId);
          const emailResult = await notifyListSubscribers(
            subscribers,
            list.name,
            result.stats.new,
            listId,
          );
          fastify.log.info(
            `List update notifications: ${emailResult.sent} sent, ${emailResult.failed} failed`,
          );
        } catch (emailErr) {
          fastify.log.warn(
            { err: emailErr },
            "Failed to send list update notifications",
          );
        }
      }

      return { data: result };
    },
  );

  // ============================================
  // Bulk Discontinue Properties
  // ============================================

  /**
   * POST /admin/discontinued
   *
   * Upload a JSON with a list of URLs to mark matching properties as discontinued.
   * Recalculates prices for all affected lists automatically.
   *
   * Body: { "urls": ["https://...", "https://..."] }
   */
  fastify.post(
    "/discontinued",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;

      // Extract urls array from body (support the full JSON format with urls field)
      const urls = body.urls;
      if (!urls) {
        return reply
          .status(400)
          .send({ error: "Missing 'urls' field in JSON" });
      }

      const validation = zodValidate(bulkDiscontinuedSchema, { urls });
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error });
      }

      const result = await bulkDiscontinueByUrls(validation.data.urls);

      return { data: result };
    },
  );

  // ============================================
  // List Requests Management
  // ============================================

  // Get list requests
  fastify.get(
    "/list-requests",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const { status } = request.query as { status?: string };

      const requests = await getAllListRequests(
        status as "pending" | "approved" | "rejected" | undefined,
      );

      return {
        data: requests.map((req) => ({
          id: req.id,
          userId: req.user_id,
          userEmail: req.user_email,
          location: req.location,
          notes: req.notes,
          status: req.status,
          createdListId: req.created_list_id,
          createdAt: req.created_at,
        })),
      };
    },
  );

  // Approve request
  fastify.post(
    "/list-requests/:requestId/approve",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { requestId } = request.params as { requestId: string };
      const body = request.body as {
        name: string;
        priceCents: number;
        currency?: string;
      };

      // Check request exists
      const listRequest = await getListRequestById(requestId);
      if (!listRequest) {
        return reply.status(404).send({ error: "Request not found" });
      }

      if (listRequest.status !== "pending") {
        return reply
          .status(400)
          .send({ error: "Request has already been processed" });
      }

      // Validate required fields for creating the list
      if (!body.name || body.priceCents === undefined) {
        return reply.status(400).send({
          error: "Name and priceCents are required to approve a request",
        });
      }

      const result = await approveListRequest(requestId, {
        name: body.name,
        location: listRequest.location,
        priceCents: body.priceCents,
        currency: body.currency || "EUR",
      });

      // Notify the requesting user
      try {
        const requestingUser = await getUserById(listRequest.user_id);
        if (requestingUser?.email) {
          await sendListRequestApprovedEmail(
            requestingUser.email,
            body.name,
            listRequest.location,
          );
        }
      } catch (emailErr) {
        fastify.log.warn(
          { err: emailErr },
          "Failed to send list request approved email",
        );
      }

      return { data: result };
    },
  );

  // Reject request
  fastify.post(
    "/list-requests/:requestId/reject",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { requestId } = request.params as { requestId: string };

      const listRequest = await getListRequestById(requestId);
      if (!listRequest) {
        return reply.status(404).send({ error: "Request not found" });
      }

      if (listRequest.status !== "pending") {
        return reply
          .status(400)
          .send({ error: "Request has already been processed" });
      }

      const result = await rejectListRequest(requestId);

      // Notify the requesting user
      try {
        const requestingUser = await getUserById(listRequest.user_id);
        if (requestingUser?.email) {
          await sendListRequestRejectedEmail(
            requestingUser.email,
            listRequest.location,
          );
        }
      } catch (emailErr) {
        fastify.log.warn(
          { err: emailErr },
          "Failed to send list request rejected email",
        );
      }

      return { data: result };
    },
  );

  // ============================================
  // Users Management
  // ============================================

  // Get all users with subscription stats
  fastify.get(
    "/users",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const users = await getAllUsersWithStats();
      return {
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          lastLogin: u.last_login,
          emailNotificationsOn: u.email_notifications_on === 1,
          isTestUser: u.is_test_user === 1,
          stripeCustomerId: u.stripe_customer_id,
          activeSubscriptionCount: Number(u.active_subscription_count),
          totalSubscriptionCount: Number(u.total_subscription_count),
          estimatedMonthlySpendCents: Number(u.estimated_monthly_spend_cents),
        })),
      };
    },
  );

  // Get single user with subscription details
  fastify.get(
    "/users/:userId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await getUserWithSubscriptions(userId);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      return {
        data: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          emailNotificationsOn: user.email_notifications_on === 1,
          isTestUser: user.is_test_user === 1,
          stripeCustomerId: user.stripe_customer_id,
          activeSubscriptionCount: Number(user.active_subscription_count),
          totalSubscriptionCount: Number(user.total_subscription_count),
          estimatedMonthlySpendCents: Number(
            user.estimated_monthly_spend_cents,
          ),
          subscriptions: user.subscriptions.map((s) => ({
            id: s.id,
            listId: s.list_id,
            listName: s.list_name,
            listLocation: s.list_location,
            status: s.status,
            priceCents: s.price_cents,
            currency: s.currency,
            currentPeriodEnd: s.current_period_end,
            createdAt: s.created_at,
            stripeSubscriptionId: s.stripe_subscription_id,
          })),
        },
      };
    },
  );

  // Toggle test user flag
  fastify.patch(
    "/users/:userId/test",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      const { isTestUser } = request.body as { isTestUser: boolean };

      if (typeof isTestUser !== "boolean") {
        return reply
          .status(400)
          .send({ error: "isTestUser must be a boolean" });
      }

      await setUserTestStatus(userId, isTestUser);
      return { data: { userId, isTestUser } };
    },
  );

  // ============================================
  // Platform Settings
  // ============================================

  // Get current settings
  fastify.get(
    "/settings",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const result = await db.execute(
        "SELECT key, value FROM settings WHERE key = 'price_per_property_cents'",
      );
      const row = result.rows[0];
      const pricePerPropertyCents = row
        ? parseInt(row.value as string, 10)
        : 100;
      return { data: { pricePerPropertyCents } };
    },
  );

  // Update settings
  fastify.patch(
    "/settings",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = zodValidate(updateSettingsSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error });
      }

      const { pricePerPropertyCents } = validation.data;

      await db.execute({
        sql: "INSERT INTO settings (key, value, updated_at) VALUES ('price_per_property_cents', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        args: [String(pricePerPropertyCents)],
      });

      return { data: { pricePerPropertyCents } };
    },
  );

  // Recalculate all list prices based on active property count
  fastify.post(
    "/settings/recalculate-prices",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      // Read current price per property
      const settingsResult = await db.execute(
        "SELECT value FROM settings WHERE key = 'price_per_property_cents'",
      );
      const settingsRow = settingsResult.rows[0];
      const pricePerPropertyCents = settingsRow
        ? parseInt(settingsRow.value as string, 10)
        : 100;

      // Get all lists with their active property count
      const listsResult = await db.execute(`
        SELECT
          l.id,
          l.name,
          l.price_cents AS old_price_cents,
          COUNT(p.id) AS active_count
        FROM lists l
        LEFT JOIN properties p
          ON p.list_id = l.id
          AND (p.discontinued = 0 OR p.discontinued IS NULL)
        GROUP BY l.id
      `);

      interface RecalcRow {
        id: string;
        name: string;
        old_price_cents: number;
        active_count: number;
      }

      const results: Array<{
        listId: string;
        listName: string;
        oldPriceCents: number;
        newPriceCents: number;
        activePropertyCount: number;
      }> = [];

      for (const row of listsResult.rows as unknown as RecalcRow[]) {
        const activeCount = Number(row.active_count);
        const newPriceCents = activeCount * pricePerPropertyCents;

        await db.execute({
          sql: "UPDATE lists SET price_cents = ? WHERE id = ?",
          args: [newPriceCents, row.id],
        });

        results.push({
          listId: row.id,
          listName: row.name,
          oldPriceCents: Number(row.old_price_cents),
          newPriceCents,
          activePropertyCount: activeCount,
        });
      }

      return { data: { pricePerPropertyCents, results } };
    },
  );

  // ============================================
  // Plans Management (v2)
  // ============================================

  fastify.get(
    "/plans",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request, _reply) => {
      const plans = await getAllPlansIncludingTrial();
      return { data: plans };
    },
  );

  fastify.patch(
    "/plans/:planId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      const { planId } = request.params as { planId: string };

      const validation = zodValidate(updatePlanSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: validation.error });
      }
      const body = validation.data;

      const plan = await getPlanById(planId);
      if (!plan) return reply.code(404).send({ error: "Plan not found" });

      const fields: string[] = [];
      const args: (string | number | null)[] = [];
      if (body.name !== undefined) {
        fields.push("name = ?");
        args.push(body.name);
      }
      if (body.priceCents !== undefined) {
        fields.push("price_cents = ?");
        args.push(body.priceCents);
      }
      if (body.maxLists !== undefined) {
        fields.push("max_lists = ?");
        args.push(body.maxLists);
      }
      if (body.monthlyCredits !== undefined) {
        fields.push("monthly_credits = ?");
        args.push(body.monthlyCredits);
      }
      if (body.trialDurationDays !== undefined) {
        fields.push("trial_duration_days = ?");
        args.push(body.trialDurationDays);
      }
      if (body.active !== undefined) {
        fields.push("active = ?");
        args.push(body.active ? 1 : 0);
      }
      if (body.sortOrder !== undefined) {
        fields.push("sort_order = ?");
        args.push(body.sortOrder);
      }

      if (fields.length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      args.push(planId);
      await db.execute({
        sql: `UPDATE plans SET ${fields.join(", ")} WHERE id = ?`,
        args,
      });

      const updated = await getPlanById(planId);
      return { data: updated };
    },
  );

  // ============================================
  // Credit Packs Management (v2)
  // ============================================

  fastify.get(
    "/credit-packs",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request, _reply) => {
      const result = await db.execute(
        "SELECT * FROM credit_packs ORDER BY sort_order ASC",
      );
      return { data: result.rows };
    },
  );

  fastify.patch(
    "/credit-packs/:packId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      const { packId } = request.params as { packId: string };

      const validation = zodValidate(updateCreditPackSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: validation.error });
      }
      const body = validation.data;

      const existing = await db.execute({
        sql: "SELECT id FROM credit_packs WHERE id = ?",
        args: [packId],
      });
      if (existing.rows.length === 0) {
        return reply.code(404).send({ error: "Pack not found" });
      }

      const fields: string[] = [];
      const args: (string | number)[] = [];
      if (body.name !== undefined) {
        fields.push("name = ?");
        args.push(body.name);
      }
      if (body.credits !== undefined) {
        fields.push("credits = ?");
        args.push(body.credits);
      }
      if (body.priceCents !== undefined) {
        fields.push("price_cents = ?");
        args.push(body.priceCents);
      }
      if (body.active !== undefined) {
        fields.push("active = ?");
        args.push(body.active ? 1 : 0);
      }
      if (body.sortOrder !== undefined) {
        fields.push("sort_order = ?");
        args.push(body.sortOrder);
      }

      if (fields.length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      args.push(packId);
      await db.execute({
        sql: `UPDATE credit_packs SET ${fields.join(", ")} WHERE id = ?`,
        args,
      });

      const updated = await db.execute({
        sql: "SELECT * FROM credit_packs WHERE id = ?",
        args: [packId],
      });
      return { data: updated.rows[0] };
    },
  );
}
