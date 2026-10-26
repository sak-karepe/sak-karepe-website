import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:./data/sakkarepe.db";

// libSQL membuat file .db sendiri, tapi tidak membuat foldernya
if (url.startsWith("file:")) {
  const path = url.startsWith("file://") ? fileURLToPath(url) : url.slice("file:".length);
  mkdirSync(dirname(path), { recursive: true });
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
