import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../plugins/auth.js";

export async function adminRoutes(fastify: FastifyInstance) {
  // Get all lists
  fastify.get(
    "/lists",
    { preHandler: [authenticate, requireRole("admin")] },
    async (_request, _reply) => {
      // TODO: Fetch from database
      return {
        data: [],
        message: "Admin lists endpoint - implement with DB",
      };
    },
  );

  // Update list
  fastify.patch(
    "/lists/:listId",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, _reply) => {
      const { listId } = request.params as { listId: string };
      const body = request.body as {
        name?: string;
        location?: string;
        priceCents?: number;
      };

      // TODO: Update in database
      return {
        message: "List updated",
        listId,
        data: body,
      };
    },
  );

  // Upload properties JSON
  fastify.post(
    "/lists/:listId/upload",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, _reply) => {
      const { listId } = request.params as { listId: string };
      const body = request.body as { properties: unknown[] };

      // TODO: Validate and import properties
      return {
        message: "Upload successful",
        listId,
        count: body.properties?.length || 0,
      };
    },
  );

  // Get list requests
  fastify.get(
    "/list-requests",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, _reply) => {
      const { status: _status } = request.query as { status?: string };
      void _status; // Will be used for filtering

      // TODO: Fetch from database
      return {
        data: [],
        message: "List requests endpoint - implement with DB",
      };
    },
  );

  // Approve request
  fastify.post(
    "/list-requests/:requestId/approve",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, _reply) => {
      const { requestId } = request.params as { requestId: string };

      // TODO: Create list, update request status
      return {
        message: "Request approved",
        requestId,
      };
    },
  );

  // Reject request
  fastify.post(
    "/list-requests/:requestId/reject",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, _reply) => {
      const { requestId } = request.params as { requestId: string };

      // TODO: Update request status
      return {
        message: "Request rejected",
        requestId,
      };
    },
  );
}
