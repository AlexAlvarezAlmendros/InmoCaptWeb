import type { FastifyInstance } from "fastify";
import { meRoutes } from "./me.js";
import { listsRoutes } from "./lists.js";
import { billingRoutes } from "./billing.js";
import { adminRoutes } from "./admin.js";

export async function registerRoutes(fastify: FastifyInstance) {
  // User routes
  await fastify.register(meRoutes, { prefix: "/api/me" });

  // Lists routes
  await fastify.register(listsRoutes, { prefix: "/api/lists" });

  // Billing routes
  await fastify.register(billingRoutes, { prefix: "/api/billing" });

  // Admin routes
  await fastify.register(adminRoutes, { prefix: "/api/admin" });
}
