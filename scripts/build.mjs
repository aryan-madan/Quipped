import { build } from "vite";
import { fileURLToPath } from "node:url";
import { mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tmpDir = path.join(root, "dist", ".bundle");

async function bundleScript(entryRelPath, outFilename) {
  await build({
    root,
    logLevel: "warn",
    build: {
      outDir: tmpDir,
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        input: path.join(root, entryRelPath),
        output: {
          format: "iife",
          entryFileNames: outFilename,
        },
      },
    },
  });
}

function mergeManifest(target) {
  const base = JSON.parse(readFileSync(path.join(root, "manifest/manifest.base.json"), "utf8"));
  const override = JSON.parse(readFileSync(path.join(root, `manifest/manifest.${target}.json`), "utf8"));
  return { ...base, ...override };
}

function packageTarget(target) {
  const outDir = path.join(root, "dist", target);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  cpSync(path.join(tmpDir, "content.js"), path.join(outDir, "content.js"));
  cpSync(path.join(tmpDir, "options.js"), path.join(outDir, "options.js"));
  cpSync(path.join(root, "src/options/options.html"), path.join(outDir, "options.html"));
  cpSync(path.join(root, "public/icons"), path.join(outDir, "icons"), { recursive: true });

  const manifest = mergeManifest(target);
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`built dist/${target}`);
}

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

await bundleScript("src/content/content.ts", "content.js");
await bundleScript("src/options/options.ts", "options.js");

packageTarget("chrome");
packageTarget("firefox");

rmSync(tmpDir, { recursive: true, force: true });
console.log("built: dist/chrome and dist/firefox");