// Assembles the single production site served by Netlify:
//   dist/          ← landing/ (marketing front door at /)
//   dist/app/      ← Expo web export (the student app at /app)
// The Expo router + asset URLs are namespaced under /app via EXPO_BASE_URL,
// which app.config.ts feeds into experiments.baseUrl.
import {
  rmSync,
  cpSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  renameSync,
  existsSync,
  statSync,
} from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const landing = path.join(root, "landing");
const expo = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "expo.cmd" : "expo");
const buildDir = mkdtempSync(path.join(root, ".dist-build-"));
const appOutput = path.join(buildDir, "app");
const previousDist = path.join(root, `.dist-previous-${process.pid}`);

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function verifyLocalAssetReferences(siteRoot) {
  const textExtensions = new Set([".css", ".html", ".js", ".json"]);
  const references = new Set();

  for (const file of walkFiles(siteRoot)) {
    if (!textExtensions.has(path.extname(file))) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\/app\/(?:assets|_expo)\/[^"'`\s)]+/g)) {
      references.add(match[0].split(/[?#]/, 1)[0]);
    }
  }

  if (references.size === 0) {
    throw new Error("[build-site] no local /app asset references found");
  }

  const missing = [];
  for (const reference of references) {
    let decoded;
    try {
      decoded = decodeURIComponent(reference);
    } catch {
      missing.push(`${reference} (invalid URL encoding)`);
      continue;
    }

    const localPath = path.resolve(siteRoot, decoded.slice(1));
    if (!localPath.startsWith(siteRoot + path.sep) || !existsSync(localPath) || !statSync(localPath).isFile()) {
      missing.push(reference);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[build-site] ${missing.length} referenced app asset(s) are missing:\n${missing
        .slice(0, 20)
        .map((item) => `  - ${item}`)
        .join("\n")}`,
    );
  }

  console.log(`[build-site] verified ${references.size} local app asset references`);
}

console.log("[build-site] exporting Expo web app → temporary build (base URL /app)");
const result = spawnSync(
  expo,
  // Public Expo values are compiled into the browser bundle. Clear Metro's
  // transform cache so switching between preview, local, and production values
  // cannot silently reuse a bundle built for a different API/auth origin.
  ["export", "--platform", "web", "--clear", "--output-dir", appOutput],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, EXPO_BASE_URL: "/app", EXPO_NO_TELEMETRY: "1" },
  },
);
if (result.status !== 0) {
  rmSync(buildDir, { recursive: true, force: true });
  console.error("[build-site] expo export failed");
  process.exit(result.status ?? 1);
}

try {
  console.log("[build-site] injecting bench boot loader into app/index.html");
  // Shown inside #root while the JS bundle loads; React replaces it on mount.
  const bootLoader = `<div id="root"><style>
#lb-boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0F2A1E}
@media (prefers-color-scheme: light){#lb-boot{background:#D9EFE6}}
#lb-boot svg{width:84px;height:84px;animation:lbFloat 2.4s ease-in-out infinite}
@keyframes lbFloat{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}
</style><div id="lb-boot" role="progressbar" aria-label="Loading Last Bench"><svg viewBox="0 0 64 64" fill="none"><g stroke="#00C853" stroke-width="4" stroke-linecap="round"><path d="M12 40h28"/><path d="M12 33h28"/><path d="M14 40v10M38 40v10"/><path d="M40 38l8-9"/><path d="M48 29h-7M48 29v7"/></g></svg></div></div>`;
  const appIndexPath = path.join(appOutput, "index.html");
  const appIndex = readFileSync(appIndexPath, "utf8");
  if (!appIndex.includes('<div id="root"></div>')) {
    throw new Error("[build-site] could not find empty #root in app/index.html — Expo output changed?");
  }
  writeFileSync(appIndexPath, appIndex.replace('<div id="root"></div>', bootLoader));

  console.log("[build-site] copying landing/ → temporary build (front door)");
  // netlify.toml is deploy config, not content; CNAME was GitHub-Pages-only.
  const exclude = new Set(["netlify.toml", "CNAME"]);
  for (const entry of readdirSync(landing)) {
    if (exclude.has(entry)) continue;
    cpSync(path.join(landing, entry), path.join(buildDir, entry), { recursive: true });
  }

  verifyLocalAssetReferences(buildDir);
} catch (error) {
  rmSync(buildDir, { recursive: true, force: true });
  throw error;
}

console.log("[build-site] replacing dist/ atomically");
try {
  if (existsSync(previousDist)) rmSync(previousDist, { recursive: true, force: true });
  if (existsSync(dist)) renameSync(dist, previousDist);
  renameSync(buildDir, dist);
  rmSync(previousDist, { recursive: true, force: true });
} catch (error) {
  if (!existsSync(dist) && existsSync(previousDist)) renameSync(previousDist, dist);
  rmSync(buildDir, { recursive: true, force: true });
  throw error;
}

console.log("[build-site] done — dist/ is the complete site (landing at /, app at /app)");
