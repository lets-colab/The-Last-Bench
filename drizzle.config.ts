import { defineConfig } from "drizzle-kit";

// Prefer the application's real database URL. Netlify's build environment can
// provide NETLIFY_DB_URL when its database integration runs drizzle commands.
// Falling back here keeps deploy-time generation from failing without changing
// the application's normal Supabase/Render database contract.
const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or NETLIFY_DB_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
