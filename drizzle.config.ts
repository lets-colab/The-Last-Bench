import { defineConfig } from "drizzle-kit";

// DATABASE_URL is the app's real (Supabase) database, used for local/manual
// `pnpm db:push`. Netlify's own build step runs `drizzle-kit generate`
// automatically and only has its managed database's connection string
// available as NETLIFY_DB_URL, so fall back to that.
const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
