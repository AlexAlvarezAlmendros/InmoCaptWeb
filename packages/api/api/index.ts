import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  // Let Fastify handle the request
  app.server.emit("request", req, res);
}
