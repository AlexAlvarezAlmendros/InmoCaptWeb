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

  // Frontend URL (for Stripe redirects)
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  // Auth0
  AUTH0_DOMAIN: z.string(),
  AUTH0_AUDIENCE: z.string(),
  AUTH0_M2M_CLIENT_ID: z.string().optional(),
  AUTH0_M2M_CLIENT_SECRET: z.string().optional(),

  // Database (Turso)
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("InmoCapt <onboarding@resend.dev>"),
  // Address that receives admin notifications (new accounts, list requests, payments)
  ADMIN_EMAIL: z.string().email().optional(),

  // Automation
  API_AUTOMATION_KEY: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !data.API_AUTOMATION_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "API_AUTOMATION_KEY is required in production",
      path: ["API_AUTOMATION_KEY"],
    });
  }
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
