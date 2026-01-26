import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function meRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get("/", { preHandler: [authenticate] }, async (request, _reply) => {
    const user = request.user;
    return {
      id: user.sub,
      email: user.email,
      // Additional user data would be fetched from DB
    };
  });

  // Get user's subscriptions
  fastify.get(
    "/subscriptions",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      const _userId = request.user.sub;
      void _userId; // Will be used for DB query

      // TODO: Fetch from database
      return {
        data: [],
        message: "Subscriptions endpoint - implement with DB",
      };
    },
  );

  // Update user preferences
  fastify.patch(
    "/preferences",
    { preHandler: [authenticate] },
    async (request, _reply) => {
      const _userId = request.user.sub;
      void _userId; // Will be used for DB query
      const body = request.body as { emailNotificationsOn?: boolean };

      // TODO: Update in database
      return {
        message: "Preferences updated",
        data: body,
      };
    },
  );
}
