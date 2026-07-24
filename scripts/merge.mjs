import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const base = JSON.parse(readFileSync(path.join(root, "node_modules/unicode-emoji-json/data-by-emoji.json"), "utf8"));
const keywords = JSON.parse(readFileSync(path.join(root, "node_modules/emojilib/dist/emoji-en-US.json"), "utf8"));

const merged = {};
for (const [emoji, meta] of Object.entries(base)) {
  merged[emoji] = { ...meta, aliases: keywords[emoji] ?? [] };
}

mkdirSync(path.join(root, "src/content/data"), { recursive: true });
writeFileSync(path.join(root, "src/content/data/emoji.json"), JSON.stringify(merged));