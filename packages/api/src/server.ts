import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";

// Extend FastifyRequest to include rawBody
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

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
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"), false);
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

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
    fastify.log.info(`Server running on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
