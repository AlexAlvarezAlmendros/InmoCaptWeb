import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate, requireRole, type AuthUser } from "../plugins/auth.js";
import {
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList,
} from "../services/listService.js";
import { ensureUserExists, getUserById } from "../services/userService.js";
import {
  uploadProperties,
  isIdealistaFormat,
  parseIdealistaUpload,
  type PropertyInput,
} from "../services/propertyService.js";
import {
  getAllListRequests,
  getListRequestById,
  approveListRequest,
  rejectListRequest,
} from "../services/listRequestService.js";
import {
  createListSchema,
  updateListSchema,
  uploadPropertiesSchema,
  idealistaUploadSchema,
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
}
