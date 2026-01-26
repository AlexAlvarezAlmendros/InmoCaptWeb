import type { FastifyInstance } from "fastify";
import { authenticate, requireSubscription } from "../plugins/auth.js";
import {
  zodValidate,
  listIdParamSchema,
  propertyIdParamSchema,
  propertiesQuerySchema,
  propertyStateSchema,
  propertyCommentSchema,
} from "../schemas/validation.js";

export async function listsRoutes(fastify: FastifyInstance) {
  // Get properties from a list (requires subscription)
  fastify.get(
    "/:listId/properties",
    { preHandler: [authenticate] },
    async (request, reply) => {
      // Validate params
      const paramsResult = zodValidate(listIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      // Validate query
      const queryResult = zodValidate(propertiesQuerySchema, request.query);
      if (!queryResult.success) {
        return reply.code(400).send({ error: queryResult.error });
      }

      const { listId } = paramsResult.data;
      const { cursor, limit = 50 } = queryResult.data;
      const userId = request.user.sub;

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // TODO: Fetch properties from database with cursor pagination
      void cursor;
      void limit;

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
      // Validate params
      const paramsResult = zodValidate(propertyIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      // Validate body
      const bodyResult = zodValidate(propertyStateSchema, request.body);
      if (!bodyResult.success) {
        return reply.code(400).send({ error: bodyResult.error });
      }

      const { listId, propertyId } = paramsResult.data;
      const { state } = bodyResult.data;
      const userId = request.user.sub;

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
      // Validate params
      const paramsResult = zodValidate(propertyIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      // Validate body
      const bodyResult = zodValidate(propertyCommentSchema, request.body);
      if (!bodyResult.success) {
        return reply.code(400).send({ error: bodyResult.error });
      }

      const { listId, propertyId } = paramsResult.data;
      const { comment } = bodyResult.data;
      const userId = request.user.sub;

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
