// A DOM stub small enough to see everything the desks do, and nothing else.
//
// The stand-here desk is rendered by a function that reaches for document,
// createElement, createElementNS and getElementById. A full DOM library would
// be a dependency the project does not want; a hand-rolled stub that supports
// exactly what the desks touch will throw the moment a desk starts touching
// something new — which is the point. The stub is deliberately small, and the
// comment in tests/site.test.mjs says why: a broken desk once threw on its
// third statement, the catch in renderContext turned it into a console.warn,
// and the panel sat empty on the live site through two deploys and 222 green
// tests. Nothing looked at the PANEL.
//
// So: one stub, shared, and every desk test reads the panel back.

/** A node that knows how to be a node. */
export const stub = (tag) => {
  const n = {
    tagName: String(tag || '').toUpperCase(),
    childNodes: [], attrs: {}, style: {}, _t: '', _h: '',
    className: '', id: '', type: '', value: '', options: [], parent: null,
    classList: {add() {}, remove() {}, toggle() {}, contains() { return false }},
    querySelector() { return null }, querySelectorAll() { return [] }, closest() { return null },
    focus() {}, click() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { c.parent = this; this.childNodes.push(c); if (this.tagName === 'SELECT') this.options.push(c); return c },
    get children() { return this.childNodes },
    append(...cs) { for (const c of cs) { c.parent = this; this.childNodes.push(c); if (this.tagName === 'SELECT') this.options.push(c) } },
    replaceChildren() { this.childNodes = []; if (this.tagName === 'SELECT') this.options = [] },
    contains() { return false },
    setAttribute(k, v) { this.attrs[k] = v }, getAttribute(k) { return this.attrs[k] },
    get textContent() { return this._t + this.childNodes.map(c => c.textContent).join('') },
    set textContent(v) { this._t = String(v); this.childNodes = [] },
    get innerHTML() { return this._h },
    set innerHTML(v) { this._h = String(v) },
  };
  return n;
};

/** Install the stub as globalThis.document for the length of a call.
    Returns {hosts, warns, restore}. */
export function withDom(ids = ['siteDesk', 'contextDesk', 'sitePanel']) {
  const hosts = {};
  for (const id of ids) hosts[id] = stub('div');
  const warns = [];
  const realDoc = globalThis.document, realWarn = console.warn;
  globalThis.document = {
    createElement: t => stub(t),
    createElementNS: (ns, t) => stub(t),
    createTextNode: t => { const n = stub('#text'); n.textContent = t; return n },
    createDocumentFragment: () => stub('#frag'),
    getElementById: k => hosts[k] || null,
    activeElement: {id: ''},
  };
  console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
  return {
    hosts, warns,
    restore() { globalThis.document = realDoc; console.warn = realWarn; },
  };
}

/** Every node under a root, root included. */
export function walk(node, out = []) {
  out.push(node);
  for (const c of node.childNodes) walk(c, out);
  return out;
}

/** The first node with this class name, searched depth-first. */
export function byClass(root, cls) {
  return walk(root).find(n => String(n.className || '').split(/\s+/).includes(cls)) || null;
}

/** The first node whose text is exactly this. */
export function byText(root, text) {
  return walk(root).find(n => n.textContent.trim() === text) || null;
}

/** Every key/value pair printed in the desk's fact rows, as raw strings. */
export function rows(root, cls = 'st-row') {
  return walk(root).filter(n => String(n.className || '').split(/\s+/).includes(cls))
    .map(n => n.textContent.trim());
}
