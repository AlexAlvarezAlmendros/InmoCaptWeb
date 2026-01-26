import type { FastifyRequest, FastifyReply } from "fastify";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Auth0 namespace for custom claims
const AUTH0_NAMESPACE = "https://inmocapt.com";

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
      email: decoded.email as string | undefined,
      roles: (decoded[`${AUTH0_NAMESPACE}/roles`] as string[]) || [],
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
  _userId: string,
  _listId: string,
): Promise<boolean> {
  // TODO: Query database to check if user has active subscription to list
  // Parameters will be used: _userId and _listId for DB query
  void _userId;
  void _listId;
  // For now, return true for development
  return true;
}
