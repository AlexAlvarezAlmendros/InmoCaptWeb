import type { FastifyRequest, FastifyReply } from "fastify";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { db } from "../config/database.js";

// Auth0 namespace for custom claims
const AUTH0_NAMESPACE = "https://otp-records.com";

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// Get signing key from JWKS
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// User payload after JWT verification
export interface AuthUser {
  sub: string;
  email?: string;
  roles: string[];
  permissions: string[];
}

// Extend FastifyRequest to include user
declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

// Authentication middleware
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: env.AUTH0_AUDIENCE,
          issuer: `https://${env.AUTH0_DOMAIN}/`,
          algorithms: ["RS256"],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded as jwt.JwtPayload);
        },
      );
    });

    // Extract user info from token
    request.user = {
      sub: decoded.sub as string,
      email: (decoded.email || decoded[`${AUTH0_NAMESPACE}/email`]) as
        | string
        | undefined,
      roles: ((decoded[`${AUTH0_NAMESPACE}/roles`] as string[]) || []).map(
        (r) => r.toLowerCase(),
      ),
      permissions: (decoded.permissions as string[]) || [],
    };
  } catch (error) {
    request.log.error(error, "JWT verification failed");
    reply.code(401).send({ error: "Invalid token" });
  }
}

// Role check middleware factory
export function requireRole(role: string) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user.roles.includes(role)) {
      reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

// Subscription check (queries database)
export async function requireSubscription(
  userId: string,
  listId: string,
): Promise<boolean> {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, status, current_period_end 
        FROM subscriptions 
        WHERE user_id = ? 
          AND list_id = ? 
          AND status = 'active'
          AND (current_period_end IS NULL OR current_period_end > datetime('now'))
        LIMIT 1
      `,
      args: [userId, listId],
    });

    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}

// API Key authentication middleware (for automation endpoints)
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers["x-api-key"] as string | undefined;

  if (!env.API_AUTOMATION_KEY) {
    request.log.error("API_AUTOMATION_KEY not configured");
    reply.code(500).send({ error: "Automation endpoint not configured" });
    return;
  }

  if (!apiKey) {
    reply.code(401).send({ error: "Missing X-API-Key header" });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const expectedKey = env.API_AUTOMATION_KEY;
  if (
    apiKey.length !== expectedKey.length ||
    !timingSafeEqual(apiKey, expectedKey)
  ) {
    reply.code(401).send({ error: "Invalid API key" });
    return;
  }

  // Set a system user for audit purposes
  request.user = {
    sub: "system:automation",
    email: "automation@system.local",
    roles: ["admin"],
    permissions: ["write:lists", "write:properties"],
  };
}

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
