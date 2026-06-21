import browser from "webextension-polyfill";

const list = document.getElementById("list") as HTMLDivElement;
const newcode = document.getElementById("newcode") as HTMLInputElement;
const newexp = document.getElementById("newexp") as HTMLInputElement;
const savebtn = document.getElementById("savebtn") as HTMLButtonElement;
const addbtn = document.getElementById("addbtn") as HTMLDivElement;
const status = document.getElementById("status") as HTMLSpanElement;

let quips: Record<string, string> = {};

async function load() {
    const stored = await browser.storage.sync.get("quips");
    quips = (stored.quips as Record<string, string>) || { "!n": "Your Name Here", "!e": "you@example.com" };
}

async function save() {
    await browser.storage.sync.set({ quips });
    status.textContent = "Saved";
    setTimeout(() => (status.textContent = ""), 1500);
}

function render() {
    list.innerHTML = "";
    const codes = Object.keys(quips);
    if (!codes.length) {
        const e = document.createElement("div");
        e.className = "empty";
        e.textContent = "No quips yet — add one below";
        list.appendChild(e);
        return;
    }
    codes.forEach((code, i) => {
        const row = document.createElement("div");
        row.className = "row";
        if (i === codes.length - 1) row.style.borderBottom = "none";

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = code;

        const div = document.createElement("span");
        div.className = "divider";
        div.textContent = "→";

        const input = document.createElement("input");
        input.className = "exp-input";
        input.value = quips[code];
        input.addEventListener("input", () => { quips[code] = input.value; });

        const del = document.createElement("button");
        del.className = "del";
        del.textContent = "✕";
        del.addEventListener("click", () => { delete quips[code]; render(); });

        row.appendChild(chip);
        row.appendChild(div);
        row.appendChild(input);
        row.appendChild(del);
        list.appendChild(row);
    });
}

function add() {
    const code = newcode.value.trim();
    const exp = newexp.value.trim();
    if (!code || !exp || !code.startsWith("!")) return;
    quips[code] = exp;
    newcode.value = "";
    newexp.value = "";
    render();
    newcode.focus();
}

addbtn.addEventListener("click", add);
newexp.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
newcode.addEventListener("keydown", (e) => { if (e.key === "Enter") newexp.focus(); });
savebtn.addEventListener("click", save);

(async () => { await load(); render(); })();