import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
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
import {
  getAvailableListsForUser,
  getCatalogListsForUser,
  getListById,
} from "../services/listService.js";
import {
  canAccessList,
  addUserListAccess,
  requestListChange,
  getUserPlanWithDefinition,
  getUserListAccessIds,
} from "../services/planService.js";
import {
  getRevealedPropertyIds,
  getBalance,
} from "../services/creditService.js";
import { revealPropertyContact } from "../services/revealService.js";

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

  // v2 catalog: all lists NOT in the user's user_list_access
  fastify.get(
    "/catalog",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      const userId = request.user.sub;
      await ensureUserExists(request.user);
      const lists = await getCatalogListsForUser(userId);
      return {
        data: lists.map((list) => ({
          id: list.id,
          name: list.name,
          location: list.location,
          totalProperties: list.totalProperties,
          lastUpdatedAt: list.lastUpdatedAt,
        })),
      };
    },
  );

  // Get a single list's info (name/location) — user must have access
  fastify.get(
    "/:listId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(listIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }
      const { listId } = paramsResult.data;
      const userId = request.user.sub;

      await ensureUserExists(request.user);

      const hasAccess = await canAccessList(userId, listId);
      if (!hasAccess) {
        return reply.code(403).send({ error: "No access to this list" });
      }

      const list = await getListById(listId);
      if (!list) return reply.code(404).send({ error: "List not found" });

      return {
        data: {
          id: list.id,
          name: list.name,
          location: list.location,
          currency: list.currency,
          lastUpdatedAt: list.lastUpdatedAt,
        },
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
      const { cursor, limit = 50, search, minPrice, maxPrice } =
        queryResult.data;
      const stateFilter = (request.query as { state?: string }).state as
        | PropertyState
        | "all"
        | undefined;
      const userId = request.user.sub;

      // Ensure user exists
      await ensureUserExists(request.user);

      // Check v2 plan access
      const hasAccess = await canAccessList(userId, listId);
      if (!hasAccess) {
        return reply
          .code(403)
          .send({ error: "No active plan access for this list" });
      }

      // Fetch properties with agent state
      const result = await getPropertiesWithAgentState(userId, listId, {
        cursor,
        limit,
        stateFilter: stateFilter || "all",
        search,
        minPrice,
        maxPrice,
      });

      // Mask contacts on properties the user hasn't revealed yet
      const propertyIds = result.data.map((p) => p.id);
      const revealedIds = await getRevealedPropertyIds(userId, propertyIds);
      const maskedData = result.data.map((p) => {
        const isRevealed = revealedIds.has(p.id);
        return {
          ...p,
          phone: isRevealed ? p.phone : null,
          sourceUrl: isRevealed ? p.sourceUrl : null,
          ownerName: isRevealed ? p.ownerName : null,
          isRevealed,
        };
      });

      return {
        ...result,
        data: maskedData,
      };
    },
  );

  // Activate a list slot (first-time fill; consumes one of plan's max_lists)
  fastify.post(
    "/:listId/activate",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(listIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }
      const { listId } = paramsResult.data;
      const userId = request.user.sub;

      await ensureUserExists(request.user);

      const list = await getListById(listId);
      if (!list) return reply.code(404).send({ error: "List not found" });

      const result = await addUserListAccess(userId, listId);
      if (!result.ok) {
        if (result.reason === "no_plan")
          return reply.code(400).send({ error: "No active plan" });
        if (result.reason === "plan_inactive")
          return reply.code(400).send({ error: "Plan is not active" });
        if (result.reason === "quota_full") {
          return reply.code(400).send({
            error: "Plan list quota is full — request a change instead",
          });
        }
        return reply.code(400).send({ error: result.reason });
      }

      return { success: true, listId };
    },
  );

  // Request a pending list change (applied at next billing cycle)
  fastify.post(
    "/:listId/request-change",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(listIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }
      const { listId } = paramsResult.data;
      const body = request.body as {
        action: "add" | "remove" | "swap";
        replaceListId?: string;
      };

      if (!body?.action || !["add", "remove", "swap"].includes(body.action)) {
        return reply.code(400).send({ error: "Invalid action" });
      }
      if (body.action === "swap" && !body.replaceListId) {
        return reply
          .code(400)
          .send({ error: "replaceListId required for swap" });
      }

      const userId = request.user.sub;
      await ensureUserExists(request.user);

      const userPlan = await getUserPlanWithDefinition(userId);
      if (!userPlan || !userPlan.isActive) {
        return reply.code(400).send({ error: "No active plan" });
      }
      if (!userPlan.subscription.current_period_end) {
        return reply
          .code(400)
          .send({ error: "Plan has no scheduled renewal" });
      }

      // Validate target list exists (add/swap)
      if (body.action === "add" || body.action === "swap") {
        const list = await getListById(listId);
        if (!list) return reply.code(404).send({ error: "List not found" });
      }

      // For swap/remove, user must currently have access to the list being removed
      if (body.action === "remove" || body.action === "swap") {
        const current = await getUserListAccessIds(userId);
        const toRemove =
          body.action === "remove" ? listId : body.replaceListId!;
        if (!current.includes(toRemove)) {
          return reply
            .code(400)
            .send({ error: "You do not have access to the list to remove" });
        }
      }

      const change = await requestListChange({
        userId,
        action: body.action,
        listId,
        replaceListId: body.replaceListId,
        applyAt: userPlan.subscription.current_period_end,
      });

      return { data: change };
    },
  );

  // Reveal a property's contact (spends 1 credit; idempotent)
  fastify.post(
    "/:listId/properties/:propertyId/reveal",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(propertyIdParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }
      const { listId, propertyId } = paramsResult.data;
      const userId = request.user.sub;

      await ensureUserExists(request.user);

      const exists = await propertyExistsInList(propertyId, listId);
      if (!exists)
        return reply.code(404).send({ error: "Property not found" });

      const result = await revealPropertyContact({ userId, propertyId });

      if (!result.success) {
        if (result.reason === "no_list_access")
          return reply.code(403).send({ error: "No access to this list" });
        if (result.reason === "no_credits") {
          const balance = await getBalance(userId);
          return reply.code(402).send({ error: "no_credits", balance });
        }
        if (result.reason === "property_not_found")
          return reply.code(404).send({ error: "Property not found" });
      }

      return { data: result };
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

      // Check v2 plan access
      const hasAccess = await canAccessList(userId, listId);
      if (!hasAccess) {
        return reply
          .code(403)
          .send({ error: "No active plan access for this list" });
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

      // Check v2 plan access
      const hasAccess = await canAccessList(userId, listId);
      if (!hasAccess) {
        return reply
          .code(403)
          .send({ error: "No active plan access for this list" });
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
