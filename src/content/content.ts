import browser from "webextension-polyfill";

let map: Record<string, string> = {};

async function load() {
    const stored = await browser.storage.sync.get("quips");
    map = (stored.quips as Record<string, string>) || {};
}
load();
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.quips) map = changes.quips.newValue || {};
});

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let match: { code: string; expansion: string } | null = null;

function siteColors() {
    const style = getComputedStyle(document.body);
    const font = style.fontFamily || "-apple-system, system-ui, sans-serif";
    const nums = style.backgroundColor.match(/\d+(\.\d+)?/g)?.map(Number) ?? [255, 255, 255];
    const [r, g, b] = nums;
    const luma = (r * 299 + g * 587 + b * 114) / 1000;
    const dark = luma < 140;

    const mix = (v: number, target: number, amt: number) => Math.round(v + (target - v) * amt);
    const pr = mix(r, dark ? 255 : 0, 0.12);
    const pg = mix(g, dark ? 255 : 0, 0.12);
    const pb = mix(b, dark ? 255 : 0, 0.12);

    return {
        font,
        dark,
        pillBg: `rgba(${pr},${pg},${pb},0.96)`,
        fg: dark ? "rgba(255,255,255,0.9)" : "rgba(10,10,10,0.88)",
        sub: dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.26)",
        border: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
        keyBg: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)",
        keyBorder: dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)",
        keyShadow: dark ? "0 1px 0 rgba(0,0,0,0.5)" : "0 1px 0 rgba(0,0,0,0.12)",
    };
}

function popover(target: HTMLInputElement | HTMLTextAreaElement, code: string, expansion: string) {
    remove();

    host = document.createElement("div");
    host.style.cssText = "position:fixed;z-index:2147483647;visibility:hidden;pointer-events:none;";
    document.body.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });

    const c = siteColors();

    const style = document.createElement("style");
    style.textContent = `
    .outer {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: ${c.pillBg};
      backdrop-filter: blur(28px) saturate(200%);
      -webkit-backdrop-filter: blur(28px) saturate(200%);
      border: 0.5px solid ${c.border};
      box-shadow:
        0 0 0 0.5px ${c.border},
        0 8px 24px rgba(0,0,0,0.2),
        0 2px 6px rgba(0,0,0,0.1),
        inset 0 1px 0 ${c.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)"};
      border-radius: 14px;
      padding: 10px 14px;
      font-family: ${c.font};
      white-space: nowrap;
      animation: in 0.13s cubic-bezier(0.2,0.9,0.3,1) both;
    }

    .text {
      font-size: 13.5px;
      font-weight: 500;
      color: ${c.fg};
      letter-spacing: -0.1px;
    }

    .keys {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: ${c.keyBg};
      border: 0.5px solid ${c.keyBorder};
      box-shadow: ${c.keyShadow};
      border-radius: 5px;
      padding: 2px 6px;
      font-size: 11px;
      color: ${c.sub};
      font-family: -apple-system, system-ui, sans-serif;
      line-height: 1.4;
    }

    .tip {
      width: 9px;
      height: 9px;
      background: ${c.pillBg};
      border: 0.5px solid ${c.border};
      flex-shrink: 0;
    }

    .tip.down {
      border-top: none;
      border-left: none;
      transform: rotate(45deg) translateY(-3px);
      margin-top: -1px;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
    }

    .tip.up {
      border-bottom: none;
      border-right: none;
      transform: rotate(45deg) translateY(3px);
      margin-bottom: -1px;
      box-shadow: -2px -2px 4px rgba(0,0,0,0.04);
    }

    .outer.above { flex-direction: column; }
    .outer.below { flex-direction: column-reverse; }

    @keyframes in {
      from { opacity:0; transform:scale(0.95) translateY(3px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
  `;
    shadow.appendChild(style);

    const outer = document.createElement("div");
    outer.className = "outer";

    const pill = document.createElement("div");
    pill.className = "pill";

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = expansion;

    const keys = document.createElement("span");
    keys.className = "keys";
    keys.innerHTML = `<span class="key">&#8997;</span><span class="key">&#8617;</span>`;

    pill.appendChild(text);
    pill.appendChild(keys);

    const tip = document.createElement("div");
    tip.className = "tip";

    outer.appendChild(pill);
    outer.appendChild(tip);
    shadow.appendChild(outer);

    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const pw = pill.getBoundingClientRect().width || 180;
        const ph = pill.getBoundingClientRect().height || 40;
        const gap = 10;
        const fitsAbove = rect.top - ph - gap - 12 > 0;

        const left = Math.max(8, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 16));

        if (fitsAbove) {
            outer.classList.add("above");
            tip.classList.add("down");
            host!.style.left = `${left}px`;
            host!.style.top = `${rect.top - ph - gap - 10}px`;
        } else {
            outer.classList.add("below");
            tip.classList.add("up");
            host!.style.left = `${left}px`;
            host!.style.top = `${rect.bottom + gap}px`;
        }

        host!.style.visibility = "visible";
    });

    match = { code, expansion };
}

function remove() {
    host?.remove();
    host = null;
    shadow = null;
    match = null;
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
    if (e.altKey && e.key === "Enter" && match) {
        e.preventDefault();
        const target = field(e);
        if (target) commit(target);
    }
    if (e.key === "Escape") remove();
}, true);

document.addEventListener("scroll", remove, true);