import { build } from "vite";
import { resolve } from "path";
import { cp, rm, mkdir } from "fs/promises";

const root = process.cwd();

async function bundle(name, entry) {
  await build({
    build: {
      outDir: "dist",
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(root, entry),
        output: {
          format: "iife",
          entryFileNames: `${name}.js`,
        },
      },
    },
  });
}

async function run() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist");
  await bundle("content", "src/content/content.ts");
  await bundle("background", "src/background/background.ts");
  await bundle("options", "src/options/options.ts");
  await cp("manifest.json", "dist/manifest.json");
  await cp("public/icons", "dist/icons", { recursive: true });
  await cp("src/options/options.html", "dist/options.html");
}

run();