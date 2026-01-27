import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  ensureUserExists,
  getUserSubscriptions,
  updateUserPreferences,
} from "../services/userService.js";
import { zodValidate, updatePreferencesSchema } from "../schemas/validation.js";

export async function meRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get("/", { preHandler: [authenticate] }, async (request, _reply) => {
    // Upsert user on every request to ensure sync
    const dbUser = await ensureUserExists(request.user);

    return {
      id: dbUser.id,
      email: dbUser.email,
      emailNotificationsOn: Boolean(dbUser.email_notifications_on),
      createdAt: dbUser.created_at,
    };
  });

  // Get user's subscriptions
  fastify.get(
    "/subscriptions",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      // Ensure user exists in DB
      await ensureUserExists(request.user);

      const subscriptions = await getUserSubscriptions(request.user.sub);

      return {
        data: subscriptions.map((sub) => ({
          id: sub.id,
          listId: sub.list_id,
          listName: sub.list_name,
          listLocation: sub.list_location,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          priceCents: sub.price_cents,
          currency: sub.currency,
          lastUpdatedAt: sub.last_updated_at,
          totalProperties: sub.total_properties,
          newPropertiesCount: sub.new_properties_count,
        })),
      };
    },
  );

  // Update user preferences
  fastify.patch(
    "/preferences",
    { preHandler: [authenticate] },
    async (request, reply) => {
      // Validate body
      const result = zodValidate(updatePreferencesSchema, request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error });
      }

      const userId = request.user.sub;

      await updateUserPreferences(userId, result.data);

      return {
        message: "Preferences updated",
        data: result.data,
      };
    },
  );
}
