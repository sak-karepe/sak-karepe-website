import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const databaseUrl = process.env.DATABASE_URL || "file:./data/sakkarepe.db";

export const db = drizzle(createClient({ url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }), {
  schema,
});
