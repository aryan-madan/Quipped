import browser from "webextension-polyfill";
import emojiList from "./data/emoji.json";
type Modifier = "alt" | "ctrl" | "shift";
type TextControl = HTMLInputElement | HTMLTextAreaElement;
type EditorTarget = TextControl | HTMLElement;
interface EmojiEntry {
  name: string;
  slug: string;
  group: string;
  emoji_version: string;
  unicode_version: string;
  skin_tone_support: boolean;
  emoji: string;
}
type EmojiMeta = Omit<EmojiEntry, "emoji">;
const emojiEntries: EmojiEntry[] = Object.entries(
  emojiList as unknown as Record<string, EmojiMeta>
).map(([emoji, meta]) => ({ ...meta, emoji }));

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s_]+/).filter(Boolean);
}

function wordVariants(token: string): string[] {
  const variants = new Set<string>([token]);
  if (token.endsWith("ing") && token.length > 4) {
    const base = token.slice(0, -3);
    variants.add(base);
    variants.add(base + "e");
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
      variants.add(base.slice(0, -1));
    }
  }
  if (token.endsWith("ed") && token.length > 3) {
    const base = token.slice(0, -2);
    variants.add(base);
    variants.add(base + "e");
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
      variants.add(base.slice(0, -1));
    }
  }
  if (token.endsWith("es") && token.length > 3) {
    variants.add(token.slice(0, -2));
  } else if (token.endsWith("s") && token.length > 3) {
    variants.add(token.slice(0, -1));
  }
  return Array.from(variants);
}

interface EmojiSearchEntry {
  entry: EmojiEntry;
  name: string;
  slug: string;
  tokens: string[];
  variants: string[];
}

const searchIndex: EmojiSearchEntry[] = emojiEntries.map((entry) => {
  const name = entry.name.toLowerCase();
  const slug = entry.slug.toLowerCase();
  const tokens = Array.from(new Set([...tokenize(name), ...tokenize(slug)]));
  const variants = Array.from(new Set(tokens.flatMap(wordVariants)));
  return { entry, name, slug, tokens, variants };
});

function matchScore(item: EmojiSearchEntry, q: string, qSlug: string): number | null {
  if (item.name === q || item.slug === qSlug) return 0;
  if (item.name.startsWith(q) || item.slug.startsWith(qSlug)) return 1;
  for (const token of item.tokens) {
    if (token === q) return 1;
  }
  for (const v of item.variants) {
    if (v === q) return 2;
  }
  if (q.length >= 3) {
    for (const v of item.variants) {
      if (v.startsWith(q)) return 3;
    }
  }
  if (item.name.includes(q) || item.slug.includes(qSlug)) return 4;
  if (q.length >= 3) {
    for (const v of item.variants) {
      if (v.includes(q)) return 5;
    }
  }
  return null;
}

const ACTIVE_FLAG = "__quipCompanionActive__";
if ((window as unknown as Record<string, boolean>)[ACTIVE_FLAG]) {
} else {
  (window as unknown as Record<string, boolean>)[ACTIVE_FLAG] = true;
  initQuipCompanion();
}

function initQuipCompanion() {
  let map: Record<string, string> = {};
  let modifier: Modifier = "alt";
  let committing = false;
  let lastCommitAt = 0;
  const COMMIT_COOLDOWN_MS = 150;

  async function load() {
    const stored = await browser.storage.sync.get(["quips", "modifier"]);
    map = (stored.quips as Record<string, string>) || {};
    modifier = (stored.modifier as Modifier) || "alt";
  }
  load();
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.quips) map = changes.quips.newValue || {};
    if (changes.modifier) modifier = changes.modifier.newValue || "alt";
  });
  let host: HTMLDivElement | null = null;
  let shadow: ShadowRoot | null = null;
  let match: { code: string; expansion: string } | null = null;
  let emojiHost: HTMLDivElement | null = null;
  let emojiShadow: ShadowRoot | null = null;
  let emojiBox: HTMLDivElement | null = null;
  let emojiCode: string | null = null;
  let emojiTarget: EditorTarget | null = null;
  let emojiResults: EmojiEntry[] = [];
  let emojiRowEls: HTMLDivElement[] = [];
  let emojiIndex = 0;
  function parseRgb(str: string): [number, number, number, number] {
    const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return [255, 255, 255, 1];
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
  }
  function effectiveBgColor(target: HTMLElement): [number, number, number] {
    let el: HTMLElement | null = target;
    while (el) {
      const [r, g, b, a] = parseRgb(getComputedStyle(el).backgroundColor);
      if (a > 0.05) return [r, g, b];
      el = el.parentElement;
    }
    const [r, g, b] = parseRgb(getComputedStyle(document.documentElement).backgroundColor);
    return [r, g, b];
  }
  function siteColors(target: HTMLElement) {
    const style = getComputedStyle(document.body);
    const font = style.fontFamily || "-apple-system, system-ui, sans-serif";
    const [br, bg2, bb] = effectiveBgColor(target);
    const luma = (br * 299 + bg2 * 587 + bb * 114) / 1000;
    const dark = luma < 140;
    const tint = (n: number) => (dark ? Math.min(255, n + 16) : Math.max(0, n - 10));
    const pillBg = `rgba(${tint(br)}, ${tint(bg2)}, ${tint(bb)}, 0.97)`;
    let sampled = 0;
    let el: HTMLElement | null = target;
    while (el && el !== document.body) {
      const val = parseFloat(getComputedStyle(el).borderRadius);
      if (!isNaN(val) && val > 0) { sampled = val; break; }
      el = el.parentElement;
    }
    const pillRadius = `${Math.min(sampled, 16)}px`;
    const keyRadius = `${Math.min(Math.round(sampled * 0.45), 7)}px`;
    return {
      font, dark, pillRadius, keyRadius, pillBg,
      fg: dark ? "rgba(255,255,255,0.9)" : "rgba(10,10,10,0.88)",
      sub: dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.26)",
      border: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
      keyBg: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)",
      keyBorder: dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)",
      keyShadow: dark ? "0 1px 0 rgba(0,0,0,0.5)" : "0 1px 0 rgba(0,0,0,0.12)",
      rowHover: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
      rowSelected: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    };
  }
  function modSymbol(): string {
    return modifier === "alt" ? "⌥" : modifier === "ctrl" ? "⌃" : "⇧";
  }
  function htmlToPlainText(html: string): string {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") return "\n";
      let out = "";
      el.childNodes.forEach(child => { out += walk(child); });
      if (tag === "div" || tag === "p") return out + "\n";
      return out;
    };
    let result = "";
    tmp.childNodes.forEach(child => { result += walk(child); });
    return result.replace(/\n+$/, "");
  }
  function positionHost(target: EditorTarget, hostEl: HTMLDivElement, contentEl: HTMLElement) {
    const rect = getAnchorRect(target);
    const pw = contentEl.getBoundingClientRect().width || 220;
    const ph = contentEl.getBoundingClientRect().height || 40;
    const gap = 8;
    const anchorX = Math.max(8, Math.min(rect.left - pw / 2, window.innerWidth - pw - 16));
    const fitsAbove = rect.top - ph - gap > 0;
    hostEl.style.left = `${anchorX}px`;
    hostEl.style.top = fitsAbove ? `${rect.top - ph - gap}px` : `${rect.bottom + gap}px`;
    hostEl.style.visibility = "visible";
  }
  function popover(target: EditorTarget, code: string, expansion: string) {
    remove();
    host = document.createElement("div");
    host.style.cssText = "position:fixed;z-index:2147483647;visibility:hidden;pointer-events:none;";
    document.body.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });
    const c = siteColors(target);
    const style = document.createElement("style");
    style.textContent = `
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      max-width: min(420px, calc(100vw - 24px));
      background: ${c.pillBg};
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 0.5px solid ${c.border};
      box-shadow: 0 0 0 0.5px ${c.border}, 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 ${c.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"};
      border-radius: ${c.pillRadius};
      padding: 10px 14px;
      font-family: ${c.font};
      white-space: nowrap;
      animation: in 0.13s cubic-bezier(0.2,0.9,0.3,1) both;
    }
    .text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13.5px;
      font-weight: 500;
      color: ${c.fg};
      letter-spacing: 0;
    }
    .keys { flex: 0 0 auto; }
    .keys { display: flex; align-items: center; gap: 3px; }
    .key {
      display: inline-flex; align-items: center; justify-content: center;
      background: ${c.keyBg}; border: 0.5px solid ${c.keyBorder};
      box-shadow: ${c.keyShadow}; border-radius: ${c.keyRadius};
      padding: 2px 6px; font-size: 11px; color: ${c.sub};
      font-family: -apple-system, system-ui, sans-serif; line-height: 1.4;
    }
    @keyframes in { from { opacity:0; transform:scale(0.95) translateY(3px); } to { opacity:1; transform:scale(1) translateY(0); } }
  `;
    shadow.appendChild(style);
    const pill = document.createElement("div");
    pill.className = "pill";
    const text = document.createElement("span");
    text.className = "text";
    text.textContent = htmlToPlainText(expansion).replace(/\n+/g, " ⏎ ");
    const keys = document.createElement("span");
    keys.className = "keys";
    keys.innerHTML = `<span class="key">${modSymbol()}</span><span class="key">&#8617;</span>`;
    pill.appendChild(text);
    pill.appendChild(keys);
    shadow.appendChild(pill);
    requestAnimationFrame(() => {
      positionHost(target, host!, pill);
    });
    match = { code, expansion };
  }
  function remove() {
    host?.remove(); host = null; shadow = null; match = null;
  }
  function searchEmoji(query: string): EmojiEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return emojiEntries.slice(0, 40);
    const qSlug = q.replace(/\s+/g, "_");
    const scored: { entry: EmojiEntry; score: number }[] = [];
    for (const item of searchIndex) {
      const score = matchScore(item, q, qSlug);
      if (score !== null) scored.push({ entry: item.entry, score });
    }
    return scored
      .sort((a, b) => a.score - b.score || a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name))
      .slice(0, 40)
      .map(x => x.entry);
  }
  function buildEmojiRows(box: HTMLDivElement, target: EditorTarget, results: EmojiEntry[]) {
    box.innerHTML = "";
    emojiRowEls = [];
    results.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.className = "row" + (idx === 0 ? " selected" : "");
      const glyph = document.createElement("span");
      glyph.className = "glyph";
      glyph.textContent = entry.emoji;
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = entry.name;
      row.appendChild(glyph);
      row.appendChild(name);
      row.addEventListener("mousedown", ev => {
        ev.preventDefault();
        emojiIndex = idx;
        commitEmoji(target);
      });
      box.appendChild(row);
      emojiRowEls.push(row);
    });
  }
  function emojiPalette(target: EditorTarget, code: string, query: string) {
    const results = searchEmoji(query);
    if (!results.length) { removeEmoji(); return; }
    emojiCode = code;
    emojiTarget = target;
    emojiResults = results;
    emojiIndex = 0;
    if (emojiHost && emojiShadow && emojiBox) {
      buildEmojiRows(emojiBox, target, results);
      positionHost(target, emojiHost, emojiBox);
      return;
    }
    emojiHost = document.createElement("div");
    emojiHost.style.cssText = "position:fixed;z-index:2147483647;visibility:hidden;pointer-events:auto;";
    document.body.appendChild(emojiHost);
    emojiShadow = emojiHost.attachShadow({ mode: "open" });
    const c = siteColors(target);
    const style = document.createElement("style");
    style.textContent = `
    .box {
      width: 240px;
      max-height: 260px;
      overflow-y: auto;
      background: ${c.pillBg};
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 0.5px solid ${c.border};
      box-shadow: 0 0 0 0.5px ${c.border}, 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 ${c.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"};
      border-radius: ${c.pillRadius};
      padding: 6px;
      font-family: ${c.font};
      animation: in 0.13s cubic-bezier(0.2,0.9,0.3,1) both;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: ${c.keyRadius};
      cursor: pointer;
    }
    .row.selected { background: ${c.rowSelected}; }
    .glyph { font-size: 18px; line-height: 1; flex: 0 0 auto; }
    .name {
      font-size: 12.5px;
      font-weight: 500;
      color: ${c.fg};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @keyframes in { from { opacity:0; transform:scale(0.95) translateY(3px); } to { opacity:1; transform:scale(1) translateY(0); } }
  `;
    emojiShadow.appendChild(style);
    const box = document.createElement("div");
    box.className = "box";
    emojiShadow.appendChild(box);
    emojiBox = box;
    buildEmojiRows(box, target, results);
    requestAnimationFrame(() => {
      positionHost(target, emojiHost!, box);
    });
  }
  function updateEmojiSelection() {
    emojiRowEls.forEach((row, idx) => {
      row.classList.toggle("selected", idx === emojiIndex);
      if (idx === emojiIndex) row.scrollIntoView({ block: "nearest" });
    });
  }
  function moveEmojiSelection(delta: number) {
    if (!emojiResults.length) return;
    emojiIndex = (emojiIndex + delta + emojiResults.length) % emojiResults.length;
    updateEmojiSelection();
  }
  function removeEmoji() {
    emojiHost?.remove();
    emojiHost = null;
    emojiShadow = null;
    emojiBox = null;
    emojiCode = null;
    emojiTarget = null;
    emojiResults = [];
    emojiRowEls = [];
    emojiIndex = 0;
  }
  function commitEmoji(target: EditorTarget) {
    if (!emojiCode || !emojiResults.length) return;
    const entry = emojiResults[emojiIndex];
    match = { code: emojiCode, expansion: entry.emoji };
    commit(target);
    removeEmoji();
  }
  function commit(target: EditorTarget) {
    if (!match || committing) return;
    const now = Date.now();
    if (now - lastCommitAt < COMMIT_COOLDOWN_MS) return;
    lastCommitAt = now;
    committing = true;
    if (isTextControl(target)) {
      commitTextControl(target);
    } else {
      commitContentEditable(target);
    }
    committing = false;
  }
  function commitTextControl(target: TextControl) {
    if (!match) return;
    const expansion = htmlToPlainText(match.expansion);
    const val = target.value;
    const cursor = target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    if (!beforeCursor.endsWith(match.code)) {
      remove();
      return;
    }
    const idx = beforeCursor.length - match.code.length;
    if (idx === -1) return;
    const before = val.slice(0, idx);
    const after = val.slice(idx + match.code.length);
    target.value = before + expansion + after;
    const pos = before.length + expansion.length;
    target.setSelectionRange(pos, pos);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    remove();
  }
  function commitContentEditable(target: HTMLElement) {
    if (!match) return;
    const before = textBeforeCaret(target);
    if (!before.endsWith(match.code)) {
      remove();
      return;
    }

    target.focus();

    const selection = getSelection();
    if (!selection?.rangeCount) return;
    const caret = selection.getRangeAt(0);
    if (!caret.collapsed || !target.contains(caret.commonAncestorContainer)) return;

    const start = domPointAtTextOffset(target, before.length - match.code.length);
    if (!start) return;

    const replace = document.createRange();
    replace.setStart(start.node, start.offset);
    replace.setEnd(caret.endContainer, caret.endOffset);
    selection.removeAllRanges();
    selection.addRange(replace);

    target.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true, cancelable: true,
      inputType: "deleteContentBackward",
    }));
    document.execCommand("delete", false);

    const plain = htmlToPlainText(match.expansion);
    target.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true, cancelable: true,
      inputType: "insertFromPaste",
      data: plain,
    }));
    if (/<[a-z][\s\S]*>/i.test(match.expansion)) {
      document.execCommand("insertHTML", false, match.expansion);
    } else {
      document.execCommand("insertText", false, match.expansion);
    }

    remove();
  }
  function isTextControl(el: EditorTarget): el is TextControl {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }
  function editableFrom(el: HTMLElement | null): HTMLElement | null {
    if (!el) return null;
    const editable = el.closest<HTMLElement>("[contenteditable='true'], [contenteditable='plaintext-only']");
    if (editable) return editable;
    if (el.isContentEditable) {
      let node: HTMLElement = el;
      while (node.parentElement?.isContentEditable) node = node.parentElement;
      return node;
    }
    return null;
  }
  function field(e: Event): EditorTarget | null {
    const el = e.composedPath()[0] as HTMLElement | null;
    if (!el) return null;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    return editableFrom(el);
  }
  function textBeforeCaret(target: HTMLElement): string {
    const selection = getSelection();
    if (!selection?.rangeCount) return "";
    const range = selection.getRangeAt(0);
    if (!target.contains(range.endContainer)) return "";
    const before = range.cloneRange();
    before.selectNodeContents(target);
    before.setEnd(range.endContainer, range.endOffset);
    return before.toString();
  }
  function domPointAtTextOffset(root: HTMLElement, offset: number): { node: Text; offset: number } | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let node = walker.nextNode() as Text | null;
    while (node) {
      if (remaining <= node.length) return { node, offset: remaining };
      remaining -= node.length;
      node = walker.nextNode() as Text | null;
    }
    return null;
  }
  function getAnchorRect(target: EditorTarget): DOMRect {
    if (!isTextControl(target)) {
      const range = getSelection()?.rangeCount ? getSelection()!.getRangeAt(0).cloneRange() : null;
      if (range && target.contains(range.endContainer)) {
        range.collapse(false);
        let rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) {
          const marker = document.createElement("span");
          marker.textContent = "\u200b";
          range.insertNode(marker);
          rect = marker.getBoundingClientRect();
          marker.remove();
        }
        if (rect.width || rect.height) return rect;
      }
      return target.getBoundingClientRect();
    }
    const rect = target.getBoundingClientRect();
    const cs = getComputedStyle(target);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return rect;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const textW = ctx.measureText(target.value.slice(0, target.selectionStart ?? target.value.length)).width;
    const left = rect.left + (parseFloat(cs.paddingLeft) || 0) + textW;
    return new DOMRect(left, rect.top, 0, rect.height);
  }
  document.addEventListener("input", (e) => {
    if (committing) return;
    const target = field(e);
    if (!target) { remove(); removeEmoji(); return; }
    const raw = isTextControl(target)
      ? target.value.slice(0, target.selectionStart ?? undefined)
      : textBeforeCaret(target);
    const val = raw.replace(/\u00A0/g, " ");
    const quipFound = val.match(/(![a-zA-Z]+)$/);
    const emojiFound = val.match(/(?:^|[\s])(:[a-zA-Z0-9_+-]+(?:[ ][a-zA-Z0-9_+-]*)*)$/);
    if (quipFound && map[quipFound[1]]) {
      popover(target, quipFound[1], map[quipFound[1]]);
      removeEmoji();
    } else if (emojiFound && emojiFound[1].length <= 40) {
      const code = emojiFound[1];
      const query = code.slice(1).replace(/\s+/g, " ").trimEnd();
      emojiPalette(target, code, query);
      remove();
    } else {
      remove();
      removeEmoji();
    }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (emojiCode) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveEmojiSelection(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); moveEmojiSelection(-1); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        const target = field(e);
        if (target) commitEmoji(target);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); removeEmoji(); return; }
    }
    const modActive =
      modifier === "alt" ? e.altKey :
        modifier === "ctrl" ? e.ctrlKey : e.shiftKey;
    if (modActive && e.key === "Enter" && match) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      const target = field(e);
      if (target) commit(target);
    }
    if (e.key === "Escape") remove();
  }, true);
  document.addEventListener("scroll", () => { remove(); removeEmoji(); }, true);
}