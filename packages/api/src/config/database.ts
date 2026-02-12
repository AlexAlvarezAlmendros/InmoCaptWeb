import { createClient } from "@libsql/client";
import { env } from "./env.js";

export const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

// Enable foreign key constraints (required for ON DELETE CASCADE)
db.execute("PRAGMA foreign_keys = ON;").catch((err) => {
  console.warn("Could not enable foreign_keys pragma:", err);
});
