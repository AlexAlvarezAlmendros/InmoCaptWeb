import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateApiKey } from "../plugins/auth.js";
import {
  getListById,
  findListByNameAndLocation,
  findOrCreateList,
} from "../services/listService.js";
import {
  uploadProperties,
  isIdealistaFormat,
  isFotocasaFormat,
  parseIdealistaUpload,
  parseFotocasaUpload,
  type PropertyInput,
} from "../services/propertyService.js";
import {
  automationUploadSimplifiedSchema,
  automationUploadIdealistaSchema,
  automationUploadFotocasaSchema,
  zodValidate,
} from "../schemas/validation.js";
import {
  sendWelcomeEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendListUpdatedEmail,
  sendListRequestApprovedEmail,
  sendListRequestRejectedEmail,
  notifyListSubscribers,
} from "../services/emailService.js";
import { getListSubscribersWithNotifications } from "../services/subscriptionService.js";

interface AutomationUploadBody {
  listId?: string;
  listName?: string;
  location?: string;
  ubicacion?: string;
  properties?: PropertyInput[];
  viviendas?: { todas: unknown[] } | unknown[];
}

export async function automationRoutes(fastify: FastifyInstance) {
  /**
   * POST /automation/upload
   *
   * Upload properties to a list via API key authentication.
   * Supports three formats: simplified, Idealista, and Fotocasa.
   *
   * List identification (one of):
   * - listId: Direct UUID of the list
   * - listName + location: Will find or create the list
   * - ubicacion (Fotocasa): Used as both listName and location
   *
   * Headers:
   * - X-API-Key: Your automation API key
   *
   * Query params:
   * - createIfNotExists: "true" to create list if not found (default: false)
   *
   * Example (simplified format):
   * {
   *   "listId": "uuid-here",
   *   "properties": [
   *     { "price": 250000, "m2": 90, "bedrooms": 3, "sourceUrl": "https://..." }
   *   ]
   * }
   *
   * Example (Idealista format):
   * {
   *   "listName": "Particulares Madrid",
   *   "location": "Madrid",
   *   "viviendas": {
   *     "todas": [
   *       { "precio": "250.000€", "url": "https://...", ... }
   *     ]
   *   }
   * }
   *
   * Example (Fotocasa format):
   * {
   *   "ubicacion": "Igualada",
   *   "viviendas": [
   *     { "precio": "60.000 €", "url": "https://...", "telefono": "621194093", ... }
   *   ]
   * }
   */
  fastify.post(
    "/upload",
    { preHandler: [authenticateApiKey] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as AutomationUploadBody;
      const { createIfNotExists } = request.query as {
        createIfNotExists?: string;
      };
      const shouldCreate = createIfNotExists === "true";

      let listId: string;
      let listCreated = false;
      let properties: PropertyInput[];

      // Detect format: Fotocasa first (has ubicacion + viviendas as array), then Idealista, then simplified
      const isFotocasa = isFotocasaFormat(body);
      const isIdealista = !isFotocasa && isIdealistaFormat(body);

      if (isFotocasa) {
        // Fotocasa format: ubicacion is both listName and location
        const validation = zodValidate(automationUploadFotocasaSchema, body);
        if (!validation.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: validation.error,
          });
        }

        // Parse Fotocasa format to internal format
        properties = parseFotocasaUpload({
          ubicacion: validation.data.ubicacion,
          viviendas: validation.data.viviendas,
        });

        // Resolve list using ubicacion as both name and location
        const ubicacion = validation.data.ubicacion;

        if (validation.data.listId) {
          const list = await getListById(validation.data.listId);
          if (!list) {
            return reply.status(404).send({ error: "List not found" });
          }
          listId = list.id;
        } else if (shouldCreate) {
          const { list, created } = await findOrCreateList(
            ubicacion,
            ubicacion,
          );
          listId = list.id;
          listCreated = created;
        } else {
          const list = await findListByNameAndLocation(ubicacion, ubicacion);
          if (!list) {
            return reply.status(404).send({
              error: "List not found",
              hint: "Use ?createIfNotExists=true to auto-create the list",
              ubicacion,
            });
          }
          listId = list.id;
        }
      } else if (isIdealista) {
        const validation = zodValidate(automationUploadIdealistaSchema, body);
        if (!validation.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: validation.error,
          });
        }

        // Parse Idealista format to internal format
        properties = parseIdealistaUpload({
          viviendas: validation.data.viviendas,
        });

        // Resolve list
        if (validation.data.listId) {
          const list = await getListById(validation.data.listId);
          if (!list) {
            return reply.status(404).send({ error: "List not found" });
          }
          listId = list.id;
        } else if (validation.data.listName && validation.data.location) {
          if (shouldCreate) {
            const { list, created } = await findOrCreateList(
              validation.data.listName,
              validation.data.location,
            );
            listId = list.id;
            listCreated = created;
          } else {
            const list = await findListByNameAndLocation(
              validation.data.listName,
              validation.data.location,
            );
            if (!list) {
              return reply.status(404).send({
                error: "List not found",
                hint: "Use ?createIfNotExists=true to auto-create the list",
              });
            }
            listId = list.id;
          }
        } else {
          return reply.status(400).send({
            error: "Either listId or (listName + location) is required",
          });
        }
      } else {
        // Simplified format
        const validation = zodValidate(automationUploadSimplifiedSchema, body);
        if (!validation.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: validation.error,
          });
        }

        properties = validation.data.properties;

        // Resolve list
        if (validation.data.listId) {
          const list = await getListById(validation.data.listId);
          if (!list) {
            return reply.status(404).send({ error: "List not found" });
          }
          listId = list.id;
        } else if (validation.data.listName && validation.data.location) {
          if (shouldCreate) {
            const { list, created } = await findOrCreateList(
              validation.data.listName,
              validation.data.location,
            );
            listId = list.id;
            listCreated = created;
          } else {
            const list = await findListByNameAndLocation(
              validation.data.listName,
              validation.data.location,
            );
            if (!list) {
              return reply.status(404).send({
                error: "List not found",
                hint: "Use ?createIfNotExists=true to auto-create the list",
              });
            }
            listId = list.id;
          }
        } else {
          return reply.status(400).send({
            error: "Either listId or (listName + location) is required",
          });
        }
      }

      // Upload properties
      const result = await uploadProperties(
        listId,
        properties,
        request.user.sub,
      );

      request.log.info({
        msg: "Automation upload completed",
        listId,
        listCreated,
        stats: result.stats,
      });

      // Notify subscribers if new properties were added
      let emailStats: { sent: number; failed: number } | undefined;
      if (result.stats.new > 0) {
        try {
          const list = await getListById(listId);
          const subscribers = await getListSubscribersWithNotifications(listId);
          const emailResult = await notifyListSubscribers(
            subscribers,
            list?.name ?? "Lista actualizada",
            result.stats.new,
            listId,
          );
          emailStats = emailResult;
          request.log.info(
            `List update notifications: ${emailResult.sent} sent, ${emailResult.failed} failed`,
          );
        } catch (emailErr) {
          request.log.warn(
            { err: emailErr },
            "Failed to send list update notifications",
          );
        }
      }

      return {
        success: true,
        listId,
        listCreated,
        stats: result.stats,
        notifications: emailStats,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    },
  );

  /**
   * GET /automation/health
   *
   * Health check endpoint for automation (no auth required)
   */
  fastify.get(
    "/health",
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      return { status: "ok", timestamp: new Date().toISOString() };
    },
  );

  /**
   * POST /automation/test-emails
   *
   * Send all email templates to a given email address for testing.
   * Requires API key authentication.
   *
   * Body: { "email": "you@example.com" }
   */
  fastify.post(
    "/test-emails",
    { preHandler: [authenticateApiKey] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as { email?: string };

      if (!email) {
        return reply.code(400).send({ error: "email is required in body" });
      }

      const results: Array<{ template: string; success: boolean }> = [];
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // 1. Welcome
      results.push({
        template: "welcome",
        success: await sendWelcomeEmail(email),
      });
      await delay(600);

      // 2. Subscription activated
      results.push({
        template: "subscription_activated",
        success: await sendSubscriptionActivatedEmail(
          email,
          "Madrid Centro",
          "test-list-123",
        ),
      });
      await delay(600);

      // 3. Subscription cancelled
      results.push({
        template: "subscription_cancelled",
        success: await sendSubscriptionCancelledEmail(email, "Madrid Centro"),
      });
      await delay(600);

      // 4. List updated
      results.push({
        template: "list_updated",
        success: await sendListUpdatedEmail(
          email,
          "Barcelona Eixample",
          15,
          "test-list-456",
        ),
      });
      await delay(600);

      // 5. List request approved
      results.push({
        template: "list_request_approved",
        success: await sendListRequestApprovedEmail(
          email,
          "Tarragona Costa",
          "Tarragona",
        ),
      });
      await delay(600);

      // 6. List request rejected
      results.push({
        template: "list_request_rejected",
        success: await sendListRequestRejectedEmail(email, "Lleida Capital"),
      });

      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        message: `${sent} emails sent, ${failed} failed`,
        email,
        results,
      };
    },
  );
}
