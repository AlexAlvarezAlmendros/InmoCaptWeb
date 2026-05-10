import type { FastifyInstance } from "fastify";
import { meRoutes } from "./me.js";
import { listsRoutes } from "./lists.js";
import { billingRoutes } from "./billing.js";
import { plansRoutes } from "./plans.js";
import { creditsRoutes } from "./credits.js";
import { adminRoutes } from "./admin.js";
import { listRequestsRoutes } from "./listRequests.js";
import { automationRoutes } from "./automation.js";

export async function registerRoutes(fastify: FastifyInstance) {
  // User routes
  await fastify.register(meRoutes, { prefix: "/api/me" });

  // Lists routes
  await fastify.register(listsRoutes, { prefix: "/api/lists" });

  // Billing routes (legacy per-list + webhook)
  await fastify.register(billingRoutes, { prefix: "/api/billing" });

  // Plans (v2 subscription model)
  await fastify.register(plansRoutes, { prefix: "/api/plans" });

  // Credits (top-ups + balance)
  await fastify.register(creditsRoutes, { prefix: "/api/credits" });

  // List requests routes
  await fastify.register(listRequestsRoutes, { prefix: "/api/list-requests" });

  // Admin routes
  await fastify.register(adminRoutes, { prefix: "/api/admin" });

  // Automation routes (API key auth)
  await fastify.register(automationRoutes, { prefix: "/api/automation" });
}
