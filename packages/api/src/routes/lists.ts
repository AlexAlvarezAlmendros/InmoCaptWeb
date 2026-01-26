import type { FastifyInstance } from "fastify";
import { authenticate, requireSubscription } from "../plugins/auth.js";

export async function listsRoutes(fastify: FastifyInstance) {
  // Get properties from a list (requires subscription)
  fastify.get(
    "/:listId/properties",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { listId } = request.params as { listId: string };
      const userId = request.user.sub;
      const { cursor: _cursor, limit: _limit = "50" } = request.query as {
        cursor?: string;
        limit?: string;
      };
      void _cursor;
      void _limit;

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // TODO: Fetch properties from database
      return {
        data: [],
        cursor: null,
        hasMore: false,
        total: 0,
      };
    },
  );

  // Update property state
  fastify.patch(
    "/:listId/properties/:propertyId/state",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { listId, propertyId } = request.params as {
        listId: string;
        propertyId: string;
      };
      const userId = request.user.sub;
      const { state } = request.body as { state: string };

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // TODO: Update state in database
      return {
        message: "State updated",
        propertyId,
        state,
      };
    },
  );

  // Update property comment
  fastify.patch(
    "/:listId/properties/:propertyId/comment",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { listId, propertyId } = request.params as {
        listId: string;
        propertyId: string;
      };
      const userId = request.user.sub;
      const { comment } = request.body as { comment: string };

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // TODO: Update comment in database
      return {
        message: "Comment updated",
        propertyId,
        comment,
      };
    },
  );
}
