// Assembles the single production site served by Netlify:
//   dist/          ← landing/ (marketing front door at /)
//   dist/app/      ← Expo web export (the student app at /app)
// The Expo router + asset URLs are namespaced under /app via EXPO_BASE_URL,
// which app.config.ts feeds into experiments.baseUrl.
import { rmSync, cpSync, readdirSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const landing = path.join(root, "landing");

console.log("[build-site] cleaning dist/");
rmSync(dist, { recursive: true, force: true });

console.log("[build-site] exporting Expo web app → dist/app (base URL /app)");
const result = spawnSync(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", "dist/app"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, EXPO_BASE_URL: "/app" },
  }
);
if (result.status !== 0) {
  console.error("[build-site] expo export failed");
  process.exit(result.status ?? 1);
}

console.log("[build-site] copying landing/ → dist/ (front door)");
// netlify.toml is deploy config, not content; CNAME was GitHub-Pages-only.
const exclude = new Set(["netlify.toml", "CNAME"]);
for (const entry of readdirSync(landing)) {
  if (exclude.has(entry)) continue;
  cpSync(path.join(landing, entry), path.join(dist, entry), { recursive: true });
}

console.log("[build-site] done — dist/ is the complete site (landing at /, app at /app)");
