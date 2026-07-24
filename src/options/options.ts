import browser from "webextension-polyfill";
import { sanitizeExpansion } from "../shared/sanitize";
type Modifier = "alt" | "ctrl" | "shift";
const MOD_SYMBOLS: Record<Modifier, string> = { alt: "⌥", ctrl: "⌃", shift: "⇧" };
const MOD_NAMES: Record<Modifier, string> = { alt: "Option", ctrl: "Control", shift: "Shift" };
const MOD_ORDER: Modifier[] = ["alt", "ctrl", "shift"];
const listEl = document.getElementById("list") as HTMLDivElement;
const savebtn = document.getElementById("savebtn") as HTMLButtonElement;
const gearbtn = document.getElementById("gearbtn") as HTMLButtonElement | null;
const infobtn = document.getElementById("infobtn") as HTMLButtonElement | null;
const backdrop = document.getElementById("backdrop") as HTMLDivElement;
const newpill = document.getElementById("newpill") as HTMLDivElement;
const newform = document.getElementById("newform") as HTMLDivElement;
const nfCode = document.getElementById("nf-code") as HTMLInputElement;
const nfExp = document.getElementById("nf-exp") as HTMLDivElement;
const nfCancel = document.getElementById("nf-cancel") as HTMLButtonElement;
const nfAdd = document.getElementById("nf-add") as HTMLButtonElement;
const nfBold = document.getElementById("nf-bold") as HTMLButtonElement | null;
const nfItalic = document.getElementById("nf-italic") as HTMLButtonElement | null;
const nfUnderline = document.getElementById("nf-underline") as HTMLButtonElement | null;
const settingspop = document.getElementById("settingspop") as HTMLDivElement | null;
const infopop = document.getElementById("infopop") as HTMLDivElement | null;
const spmodcycle = document.getElementById("spmodcycle") as HTMLDivElement | null;
const sppreviewmod = document.getElementById("sppreviewmod") as HTMLSpanElement | null;
const spmodname = document.getElementById("spmodname") as HTMLSpanElement | null;
let quips: Record<string, string> = {};
let dirty = false;
let modifier: Modifier = "alt";
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "BR"]);
function safeHtmlToFragment(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const frag = document.createDocumentFragment();
  const walk = (src: Node, dest: Node) => {
    src.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        dest.appendChild(document.createTextNode(node.textContent || ""));
      } else if (node.nodeType === Node.ELEMENT_NODE && ALLOWED_TAGS.has((node as Element).tagName)) {
        const clean = document.createElement((node as Element).tagName);
        walk(node, clean);
        dest.appendChild(clean);
      } else {
        walk(node, dest);
      }
    });
  };
  walk(doc.body, frag);
  return frag;
}
function setSafeHtml(el: HTMLElement, html: string) {
  el.replaceChildren(safeHtmlToFragment(html));
}
function applyFormat(cmd: string) {
  document.execCommand(cmd, false);
  updateFormatButtons();
}
function updateFormatButtons() {
  if (!nfBold && !nfItalic && !nfUnderline) return;
  const active = document.activeElement === nfExp;
  nfBold?.classList.toggle("active", active && document.queryCommandState("bold"));
  nfItalic?.classList.toggle("active", active && document.queryCommandState("italic"));
  nfUnderline?.classList.toggle("active", active && document.queryCommandState("underline"));
}
function handleFormatKeys(e: KeyboardEvent, onSubmit?: () => void) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === "b") { e.preventDefault(); applyFormat("bold"); }
  else if (key === "i") { e.preventDefault(); applyFormat("italic"); }
  else if (key === "u") { e.preventDefault(); applyFormat("underline"); }
  else if (e.key === "Enter" && onSubmit) { e.preventDefault(); onSubmit(); }
}
async function load() {
  const stored = await browser.storage.sync.get(["quips", "modifier"]);
  quips = (stored.quips as Record<string, string>) || { "!n": "Your Name Here", "!e": "you@example.com" };
  modifier = (stored.modifier as Modifier) || "alt";
}
async function save() {
  await browser.storage.sync.set({ quips, modifier });
  savebtn.textContent = "Saved ✓";
  savebtn.classList.add("saved");
  setTimeout(() => {
    savebtn.textContent = "Save";
    savebtn.classList.remove("saved");
    setDirty(false);
  }, 900);
}
function setDirty(v: boolean) {
  dirty = v;
  savebtn.classList.toggle("visible", dirty);
}
function syncModifierUI() {
  if (sppreviewmod) sppreviewmod.textContent = MOD_SYMBOLS[modifier];
  if (spmodname) spmodname.textContent = MOD_NAMES[modifier];
}
function cycleModifier() {
  const idx = MOD_ORDER.indexOf(modifier);
  modifier = MOD_ORDER[(idx + 1) % MOD_ORDER.length];
  syncModifierUI();
  setDirty(true);
}
function render() {
  listEl.replaceChildren();
  const codes = Object.keys(quips).sort();
  if (!codes.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No quips yet";
    listEl.appendChild(empty);
    return;
  }
  codes.forEach(code => {
    const row = document.createElement("div");
    row.className = "quip-row";
    const top = document.createElement("div");
    top.className = "qr-top";
    const chip = document.createElement("input");
    chip.className = "code-chip";
    chip.value = code;
    chip.spellcheck = false;
    (chip as any).autocomplete = "off";
    sizeChip(chip);
    chip.addEventListener("input", () => sizeChip(chip));
    chip.addEventListener("blur", () => {
      const next = chip.value.trim();
      if (!next || next === code) { chip.value = code; return; }
      if (!next.startsWith("!")) { chip.value = code; return; }
      if (quips[next] !== undefined) { chip.value = code; return; }
      const val = quips[code];
      delete quips[code];
      quips[next] = val;
      setDirty(true);
      render();
    });
    chip.addEventListener("keydown", e => {
      if (e.key === "Enter") { chip.blur(); e.preventDefault(); }
      if (e.key === "Escape") { chip.value = code; chip.blur(); }
    });
    const del = document.createElement("button");
    del.className = "del-btn";
    del.innerHTML = `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    del.addEventListener("click", () => { delete quips[code]; setDirty(true); render(); });
    top.appendChild(chip);
    top.appendChild(del);
    const expDiv = document.createElement("div");
    expDiv.className = "exp-input";
    expDiv.contentEditable = "true";
    expDiv.dataset.placeholder = "Expansion text";
    setSafeHtml(expDiv, sanitizeExpansion(quips[code]));
    expDiv.addEventListener("input", () => { quips[code] = sanitizeExpansion(expDiv.innerHTML); setDirty(true); });
    expDiv.addEventListener("keydown", e => handleFormatKeys(e));
    row.appendChild(top);
    row.appendChild(expDiv);
    listEl.appendChild(row);
  });
}
function sizeChip(chip: HTMLInputElement) {
  const span = document.createElement("span");
  span.style.cssText = "position:absolute;visibility:hidden;font:700 10px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:0.04em;white-space:pre;";
  span.textContent = chip.value || chip.placeholder;
  document.body.appendChild(span);
  chip.style.width = `${Math.max(32, span.offsetWidth + 16)}px`;
  document.body.removeChild(span);
}
type Pop = "none" | "new" | "settings" | "info";
let activePop: Pop = "none";
function openPop(p: Pop) {
  newform.classList.remove("open");
  newpill.classList.remove("hidden");
  settingspop?.classList.remove("open");
  infopop?.classList.remove("open");
  backdrop.classList.remove("on");
  if (p === "none" || p === activePop) { activePop = "none"; return; }
  activePop = p;
  backdrop.classList.add("on");
  if (p === "new") {
    newpill.classList.add("hidden");
    newform.classList.add("open");
    setTimeout(() => nfCode.focus(), 60);
  }
  if (p === "settings" && settingspop) {
    settingspop.classList.add("open");
  }
  if (p === "info" && infopop) {
    infopop.classList.add("open");
  }
}
function closePop() { openPop("none"); }
newpill.addEventListener("click", () => openPop("new"));
backdrop.addEventListener("click", closePop);
nfCancel.addEventListener("click", closePop);
function addQuip() {
  const code = nfCode.value.trim();
  const expText = nfExp.innerText.trim();
  const expHtml = sanitizeExpansion(nfExp.innerHTML.trim());
  if (!code || !expText || !code.startsWith("!")) return;
  quips[code] = expHtml;
  setDirty(true);
  render();
  nfCode.value = "";
  nfExp.replaceChildren();
  closePop();
}
nfAdd.addEventListener("click", addQuip);
nfExp.addEventListener("keydown", e => handleFormatKeys(e, addQuip));
nfExp.addEventListener("input", updateFormatButtons);
nfExp.addEventListener("focus", updateFormatButtons);
nfExp.addEventListener("blur", updateFormatButtons);
nfCode.addEventListener("keydown", e => { if (e.key === "Enter") nfExp.focus(); });
[nfBold, nfItalic, nfUnderline].forEach(btn => btn?.addEventListener("mousedown", e => e.preventDefault()));
nfBold?.addEventListener("click", () => { nfExp.focus(); applyFormat("bold"); });
nfItalic?.addEventListener("click", () => { nfExp.focus(); applyFormat("italic"); });
nfUnderline?.addEventListener("click", () => { nfExp.focus(); applyFormat("underline"); });
document.addEventListener("selectionchange", updateFormatButtons);
gearbtn?.addEventListener("click", e => {
  e.stopPropagation();
  openPop(activePop === "settings" ? "none" : "settings");
});
infobtn?.addEventListener("click", e => {
  e.stopPropagation();
  openPop(activePop === "info" ? "none" : "info");
});
savebtn.addEventListener("click", save);
spmodcycle?.addEventListener("click", cycleModifier);
spmodcycle?.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cycleModifier(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePop();
});
(async () => {
  await load();
  render();
  try {
    syncModifierUI();
  } catch (e) {
    console.error(e);
  }
})();