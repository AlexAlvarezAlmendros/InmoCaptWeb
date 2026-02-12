import type { FastifyInstance } from "fastify";
import { meRoutes } from "./me.js";
import { listsRoutes } from "./lists.js";
import { billingRoutes } from "./billing.js";
import { adminRoutes } from "./admin.js";
import { listRequestsRoutes } from "./listRequests.js";
import { automationRoutes } from "./automation.js";

export async function registerRoutes(fastify: FastifyInstance) {
  // User routes
  await fastify.register(meRoutes, { prefix: "/api/me" });

  // Lists routes
  await fastify.register(listsRoutes, { prefix: "/api/lists" });

  // Billing routes
  await fastify.register(billingRoutes, { prefix: "/api/billing" });

  // List requests routes
  await fastify.register(listRequestsRoutes, { prefix: "/api/list-requests" });

  // Admin routes
  await fastify.register(adminRoutes, { prefix: "/api/admin" });

  // Automation routes (API key auth)
  await fastify.register(automationRoutes, { prefix: "/api/automation" });
}
