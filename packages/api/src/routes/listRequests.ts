import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  createListRequest,
  getListRequestsByUser,
} from "../services/listRequestService.js";
import { ensureUserExists } from "../services/userService.js";
import { sendAdminListRequestEmail } from "../services/emailService.js";
import { zodValidate, createListRequestSchema } from "../schemas/validation.js";

export async function listRequestsRoutes(fastify: FastifyInstance) {
  // Create a new list request
  fastify.post("/", { preHandler: [authenticate] }, async (request, reply) => {
    // Validate body
    const result = zodValidate(createListRequestSchema, request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error });
    }

    const userId = request.user.sub;
    const { location, notes } = result.data;

    // Ensure user exists in DB
    await ensureUserExists(request.user);

    const requestId = await createListRequest({
      userId,
      location: location.trim(),
      notes: notes?.trim(),
    });

    // Notify admin of the new list request (fire-and-forget)
    sendAdminListRequestEmail(
      request.user.email || null,
      location.trim(),
      notes?.trim(),
    ).catch((err) =>
      request.log.warn(
        { err },
        "Failed to send admin list-request notification",
      ),
    );

    return {
      message: "List request created successfully",
      data: {
        id: requestId,
        location: location.trim(),
        notes: notes?.trim() || null,
        status: "pending",
      },
    };
  });

  // Get user's list requests
  fastify.get("/", { preHandler: [authenticate] }, async (request, _reply) => {
    const userId = request.user.sub;

    const requests = await getListRequestsByUser(userId);

    return {
      data: requests.map((req) => ({
        id: req.id,
        location: req.location,
        notes: req.notes,
        status: req.status,
        createdListId: req.created_list_id,
        createdAt: req.created_at,
      })),
    };
  });
}
