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
import {
  getPropertiesWithAgentState,
  updatePropertyState,
  updatePropertyComment,
  propertyExistsInList,
  type PropertyState,
} from "../services/agentStateService.js";
import { ensureUserExists } from "../services/userService.js";
import { getAvailableListsForUser } from "../services/listService.js";

export async function listsRoutes(fastify: FastifyInstance) {
  // Get available lists for user to subscribe to
  fastify.get(
    "/available",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      const userId = request.user.sub;

      // Ensure user exists
      await ensureUserExists(request.user);

      const lists = await getAvailableListsForUser(userId);

      return {
        data: lists.map((list) => ({
          id: list.id,
          name: list.name,
          location: list.location,
          priceCents: list.priceCents,
          currency: list.currency,
          totalProperties: list.totalProperties,
          lastUpdatedAt: list.lastUpdatedAt,
        })),
      };
    },
  );

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
      const stateFilter = (request.query as { state?: string }).state as
        | PropertyState
        | "all"
        | undefined;
      const userId = request.user.sub;

      // Ensure user exists
      await ensureUserExists(request.user);

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // Fetch properties with agent state
      const result = await getPropertiesWithAgentState(userId, listId, {
        cursor,
        limit,
        stateFilter: stateFilter || "all",
      });

      return result;
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

      // Ensure user exists
      await ensureUserExists(request.user);

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // Check property exists in list
      const exists = await propertyExistsInList(propertyId, listId);
      if (!exists) {
        return reply.code(404).send({ error: "Property not found" });
      }

      // Update state
      const result = await updatePropertyState(
        userId,
        propertyId,
        state as PropertyState,
      );

      return {
        data: result,
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

      // Ensure user exists
      await ensureUserExists(request.user);

      // Check subscription
      const hasSubscription = await requireSubscription(userId, listId);
      if (!hasSubscription) {
        return reply
          .code(403)
          .send({ error: "No active subscription for this list" });
      }

      // Check property exists in list
      const exists = await propertyExistsInList(propertyId, listId);
      if (!exists) {
        return reply.code(404).send({ error: "Property not found" });
      }

      // Update comment
      const result = await updatePropertyComment(userId, propertyId, comment);

      return {
        data: result,
      };
    },
  );
}
