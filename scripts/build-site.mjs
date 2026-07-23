// Assembles the single production site served by Netlify:
//   dist/          ← landing/ (marketing front door at /)
//   dist/app/      ← Expo web export (the student app at /app)
// The Expo router + asset URLs are namespaced under /app via EXPO_BASE_URL,
// which app.config.ts feeds into experiments.baseUrl.
import { rmSync, cpSync, readdirSync, readFileSync, writeFileSync } from "fs";
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

console.log("[build-site] injecting bench boot loader into dist/app/index.html");
// Shown inside #root while the JS bundle loads; React replaces it on mount.
const bootLoader = `<div id="root"><style>
#lb-boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0F2A1E}
@media (prefers-color-scheme: light){#lb-boot{background:#D9EFE6}}
#lb-boot svg{width:84px;height:84px;animation:lbFloat 2.4s ease-in-out infinite}
@keyframes lbFloat{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}
</style><div id="lb-boot" role="progressbar" aria-label="Loading Last Bench"><svg viewBox="0 0 64 64" fill="none"><g stroke="#00C853" stroke-width="4" stroke-linecap="round"><path d="M12 40h28"/><path d="M12 33h28"/><path d="M14 40v10M38 40v10"/><path d="M40 38l8-9"/><path d="M48 29h-7M48 29v7"/></g></svg></div></div>`;
const appIndexPath = path.join(dist, "app", "index.html");
const appIndex = readFileSync(appIndexPath, "utf8");
if (!appIndex.includes('<div id="root"></div>')) {
  console.error("[build-site] could not find empty #root in dist/app/index.html — Expo output changed?");
  process.exit(1);
}
writeFileSync(appIndexPath, appIndex.replace('<div id="root"></div>', bootLoader));

console.log("[build-site] copying landing/ → dist/ (front door)");
// netlify.toml is deploy config, not content; CNAME was GitHub-Pages-only.
const exclude = new Set(["netlify.toml", "CNAME"]);
for (const entry of readdirSync(landing)) {
  if (exclude.has(entry)) continue;
  cpSync(path.join(landing, entry), path.join(dist, entry), { recursive: true });
}

console.log("[build-site] done — dist/ is the complete site (landing at /, app at /app)");
