import browser from "webextension-polyfill";
type Modifier = "alt" | "ctrl" | "shift";
let map: Record<string, string> = {};
let modifier: Modifier = "alt";
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
function siteColors(target: HTMLElement) {
  const style = getComputedStyle(document.body);
  const font = style.fontFamily || "-apple-system, system-ui, sans-serif";
  const nums = style.backgroundColor.match(/\d+(\.\d+)?/g)?.map(Number) ?? [255, 255, 255];
  const luma = (nums[0] * 299 + nums[1] * 587 + nums[2] * 114) / 1000;
  const dark = luma < 140;
  const pillBg = dark ? "rgba(38,38,40,0.97)" : "rgba(255,255,255,0.97)";
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
  };
}
/** Symbol shown for the active modifier */
function modSymbol(): string {
  return modifier === "alt" ? "⌥" : modifier === "ctrl" ? "⌃" : "⇧";
}
function popover(
  target: HTMLInputElement | HTMLTextAreaElement,
  code: string,
  expansion: string
) {
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
    .text { font-size: 13.5px; font-weight: 500; color: ${c.fg}; letter-spacing: -0.1px; }
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
  text.textContent = expansion;
  const keys = document.createElement("span");
  keys.className = "keys";
  keys.innerHTML = `<span class="key">${modSymbol()}</span><span class="key">&#8617;</span>`;
  pill.appendChild(text);
  pill.appendChild(keys);
  shadow.appendChild(pill);
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const pw = pill.getBoundingClientRect().width || 180;
    const ph = pill.getBoundingClientRect().height || 40;
    const gap = 8;
    const cs = getComputedStyle(target);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const textW = ctx.measureText(
      target.value.slice(0, target.selectionStart ?? target.value.length)
    ).width;
    const anchorX = Math.max(
      8,
      Math.min(rect.left + (parseFloat(cs.paddingLeft) || 0) + textW - pw / 2, window.innerWidth - pw - 16)
    );
    const fitsAbove = rect.top - ph - gap > 0;
    host!.style.left = `${anchorX}px`;
    host!.style.top = fitsAbove ? `${rect.top - ph - gap}px` : `${rect.bottom + gap}px`;
    host!.style.visibility = "visible";
  });
  match = { code, expansion };
}
function remove() {
  host?.remove(); host = null; shadow = null; match = null;
}
function commit(target: HTMLInputElement | HTMLTextAreaElement) {
  if (!match) return;
  const val = target.value;
  const idx = val.lastIndexOf(match.code);
  if (idx === -1) return;
  const before = val.slice(0, idx);
  const after = val.slice(idx + match.code.length);
  target.value = before + match.expansion + after;
  const pos = before.length + match.expansion.length;
  target.setSelectionRange(pos, pos);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  remove();
}
function field(e: Event): HTMLInputElement | HTMLTextAreaElement | null {
  const el = e.composedPath()[0] as HTMLElement;
  if (!el || !("value" in el)) return null;
  return el as HTMLInputElement | HTMLTextAreaElement;
}
document.addEventListener("input", (e) => {
  const target = field(e);
  if (!target) return;
  const val = target.value.slice(0, target.selectionStart ?? undefined);
  const found = val.match(/(![a-zA-Z]+)$/);
  if (found && map[found[1]]) popover(target, found[1], map[found[1]]);
  else remove();
}, true);
document.addEventListener("keydown", (e) => {
  const modActive =
    modifier === "alt" ? e.altKey :
      modifier === "ctrl" ? e.ctrlKey :
    /* shift */            e.shiftKey;
  if (modActive && e.key === "Enter" && match) {
    e.preventDefault();
    const target = field(e);
    if (target) commit(target);
  }
  if (e.key === "Escape") remove();
}, true);
document.addEventListener("scroll", remove, true);