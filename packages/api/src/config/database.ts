import { createClient } from "@libsql/client";
import { env } from "./env.js";

export const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});
