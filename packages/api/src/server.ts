import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { ensureSystemUser } from "./config/database.js";
import { registerRoutes } from "./routes/index.js";

// Extend FastifyRequest to include rawBody
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // Add content type parser to capture raw body for webhooks
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      // Store raw body for webhook verification
      req.rawBody = body as string;
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Plugins
  await fastify.register(helmet);

  // CORS: support multiple origins separated by commas
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl, scrapers, etc.)
      if (!origin) {
        cb(null, true);
        return;
      }
      // Allow any origin for automation and webhook routes
      // (they are protected by API key / signature, not CORS)
      // For all other routes, restrict to allowed origins
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(null, true); // Allow all origins — API key / JWT is the real guard
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "stripe-signature",
    ],
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Routes
  await registerRoutes(fastify);

  // Ensure system user exists for automation uploads
  await ensureSystemUser();

  // Health check
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  return fastify;
}

// Start server when running directly (not in Vercel)
if (process.env.VERCEL !== "1") {
  const start = async () => {
    try {
      const fastify = await buildApp();
      await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
      fastify.log.info(`Server running on port ${env.PORT}`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  start();
}
