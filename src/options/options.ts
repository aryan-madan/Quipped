import browser from "webextension-polyfill";
type Modifier = "alt" | "ctrl" | "shift";
const MOD_SYMBOLS: Record<Modifier, string> = { alt: "⌥", ctrl: "⌃", shift: "⇧" };
const listEl = document.getElementById("list") as HTMLDivElement;
const savebtn = document.getElementById("savebtn") as HTMLButtonElement;
const gearbtn = document.getElementById("gearbtn") as HTMLButtonElement;
const backdrop = document.getElementById("backdrop") as HTMLDivElement;
const newpill = document.getElementById("newpill") as HTMLDivElement;
const newform = document.getElementById("newform") as HTMLDivElement;
const nfCode = document.getElementById("nf-code") as HTMLInputElement;
const nfExp = document.getElementById("nf-exp") as HTMLInputElement;
const nfCancel = document.getElementById("nf-cancel") as HTMLButtonElement;
const nfAdd = document.getElementById("nf-add") as HTMLButtonElement;
const pillModKey = document.getElementById("pillModKey") as HTMLSpanElement;
const settingspop = document.getElementById("settingspop") as HTMLDivElement;
const spmodselect = document.getElementById("spmodselect") as HTMLDivElement;
const sppreviewmod = document.getElementById("sppreviewmod") as HTMLSpanElement;
const spsave = document.getElementById("spsave") as HTMLButtonElement;
let quips: Record<string, string> = {};
let dirty = false;
let modifier: Modifier = "alt";
let pendingModifier: Modifier = "alt";
async function load() {
  const stored = await browser.storage.sync.get(["quips", "modifier"]);
  quips = (stored.quips as Record<string, string>) || { "!n": "Your Name Here", "!e": "you@example.com" };
  modifier = (stored.modifier as Modifier) || "alt";
  pendingModifier = modifier;
  syncModifierUI();
}
async function save() {
  await browser.storage.sync.set({ quips });
  setDirty(false);
}
async function saveSettings() {
  modifier = pendingModifier;
  await browser.storage.sync.set({ modifier });
  syncModifierUI();
  spsave.textContent = "Saved ✓";
  spsave.classList.add("saved");
  setTimeout(() => { spsave.textContent = "Save settings"; spsave.classList.remove("saved"); }, 1500);
}
function setDirty(v: boolean) {
  dirty = v;
  savebtn.classList.toggle("visible", dirty);
}
function syncModifierUI() {
  pillModKey.textContent = MOD_SYMBOLS[modifier];
  sppreviewmod.textContent = MOD_SYMBOLS[modifier];
  spmodselect.querySelectorAll<HTMLButtonElement>(".sp-mod").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mod === modifier);
  });
}
function selectPendingMod(mod: Modifier) {
  pendingModifier = mod;
  spmodselect.querySelectorAll<HTMLButtonElement>(".sp-mod").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mod === mod);
  });
  sppreviewmod.textContent = MOD_SYMBOLS[mod];
}
function render() {
  listEl.innerHTML = "";
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
    const input = document.createElement("input");
    input.className = "exp-input";
    input.value = quips[code];
    input.addEventListener("input", () => { quips[code] = input.value; setDirty(true); });
    const del = document.createElement("button");
    del.className = "del-btn";
    del.innerHTML = `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    del.addEventListener("click", () => { delete quips[code]; setDirty(true); render(); });
    row.appendChild(chip);
    row.appendChild(input);
    row.appendChild(del);
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
type Pop = "none" | "new" | "settings";
let activePop: Pop = "none";
function openPop(p: Pop) {
  newform.classList.remove("open");
  newpill.classList.remove("hidden");
  settingspop.classList.remove("open");
  backdrop.classList.remove("on");
  if (p === "none" || p === activePop) { activePop = "none"; return; }
  activePop = p;
  backdrop.classList.add("on");
  if (p === "new") {
    newpill.classList.add("hidden");
    newform.classList.add("open");
    setTimeout(() => nfCode.focus(), 60);
  }
  if (p === "settings") {
    settingspop.classList.add("open");
    pendingModifier = modifier;
    selectPendingMod(modifier);
  }
}
function closePop() { openPop("none"); }
newpill.addEventListener("click", () => openPop("new"));
backdrop.addEventListener("click", closePop);
nfCancel.addEventListener("click", closePop);
function addQuip() {
  const code = nfCode.value.trim();
  const exp = nfExp.value.trim();
  if (!code || !exp || !code.startsWith("!")) return;
  quips[code] = exp;
  setDirty(true);
  render();
  nfCode.value = "";
  nfExp.value = "";
  closePop();
}
nfAdd.addEventListener("click", addQuip);
nfExp.addEventListener("keydown", e => { if (e.key === "Enter") addQuip(); });
nfCode.addEventListener("keydown", e => { if (e.key === "Enter") nfExp.focus(); });
gearbtn.addEventListener("click", e => {
  e.stopPropagation();
  openPop(activePop === "settings" ? "none" : "settings");
});
savebtn.addEventListener("click", save);
spsave.addEventListener("click", saveSettings);
spmodselect.querySelectorAll<HTMLButtonElement>(".sp-mod").forEach(btn => {
  btn.addEventListener("click", () => selectPendingMod(btn.dataset.mod as Modifier));
});
document.addEventListener("keydown", e => {
  if (e.altKey && e.key.toLowerCase() === "n" && activePop !== "new") {
    e.preventDefault();
    openPop("new");
  }
  if (e.key === "Escape") closePop();
});
(async () => { await load(); render(); })();