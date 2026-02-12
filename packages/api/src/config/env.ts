import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Auth0
  AUTH0_DOMAIN: z.string(),
  AUTH0_AUDIENCE: z.string(),

  // Database (Turso)
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // Automation
  API_AUTOMATION_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
