const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "BR"]);
const REMOVE_ENTIRELY = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG"]);

function stripNode(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            if (REMOVE_ENTIRELY.has(el.tagName)) {
                node.removeChild(el);
                continue;
            }
            stripNode(el);
            if (!ALLOWED_TAGS.has(el.tagName)) {
                while (el.firstChild) node.insertBefore(el.firstChild, el);
                node.removeChild(el);
            } else {
                Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name));
            }
        } else if (child.nodeType !== Node.TEXT_NODE) {
            node.removeChild(child);
        }
    }
}

export function sanitizeExpansion(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    stripNode(doc.body);
    return doc.body.innerHTML;
}