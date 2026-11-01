"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MathCommandPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/context.ts
function findCommand(text, offset) {
  if (offset < 0 || offset > text.length) return null;
  const match = /\\([a-zA-Z]*)$/.exec(text.slice(0, offset));
  if (!match) return null;
  const from = offset - match[0].length;
  let slashes = 0;
  for (let j = from - 1; j >= 0 && text[j] === "\\"; j--) slashes++;
  if (slashes % 2) return null;
  let math = 0;
  let i = 0;
  while (i < from) {
    if (!math && (i === 0 || text[i - 1] === "\n")) {
      const line = text.slice(i, text.indexOf("\n", i) < 0 ? text.length : text.indexOf("\n", i));
      if (i === 0 && /^---\s*$/.test(line)) {
        const end = /\n(?:---|\.\.\.)[ \t]*(?:\n|$)/g;
        end.lastIndex = i + line.length;
        const close = end.exec(text);
        if (!close || close.index >= from) return null;
        i = close.index + close[0].length;
        continue;
      }
      const container = /^(?:[ \t]*>[ \t]?|[ \t]*(?:[-+*]|[0-9]+[.)])[ \t]+)*/;
      const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line.replace(container, ""));
      if (fence) {
        const closeFence = new RegExp("^ {0,3}" + fence[1][0] + "{" + fence[1].length + ",}[ \\t]*$");
        let next = i + line.length + 1;
        let close = -1;
        while (next < text.length) {
          const end = text.indexOf("\n", next);
          const lineEnd = end < 0 ? text.length : end;
          if (closeFence.test(text.slice(next, lineEnd).replace(container, ""))) {
            close = lineEnd;
            break;
          }
          next = lineEnd + 1;
        }
        if (close < 0 || close >= from) return null;
        i = close + 1;
        continue;
      }
      if (/^(?: {4}|\t)/.test(line)) {
        if (i + line.length >= from) return null;
        i += line.length + 1;
        continue;
      }
    }
    if (!math && text.startsWith("<!--", i)) {
      const close = text.indexOf("-->", i + 4);
      if (close < 0 || close >= from) return null;
      i = close + 3;
      continue;
    }
    if (!math && text[i] === "`") {
      const run = /^`+/.exec(text.slice(i))[0];
      let close = text.indexOf(run, i + run.length);
      while (close >= 0 && (text[close - 1] === "`" || text[close + run.length] === "`")) close = text.indexOf(run, close + run.length);
      if (close >= 0) {
        if (close >= from) return null;
        i = close + run.length;
        continue;
      }
    }
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (math && text[i] === "%") {
      const close = text.indexOf("\n", i);
      if (close < 0 || close >= from) return null;
      i = close + 1;
      continue;
    }
    if (text[i] === "$") {
      const width = text[i + 1] === "$" ? 2 : 1;
      if (!math) math = width;
      else if (math === width) math = 0;
      i += width;
      continue;
    }
    i++;
  }
  if (!math) return null;
  const suffix = /^[a-zA-Z]*/.exec(text.slice(offset))[0];
  return { from, to: offset + suffix.length, query: match[1] };
}

// src/previews.ts
var effects = {
  phantom: "Reserve space",
  hphantom: "Reserve width",
  vphantom: "Reserve height",
  strut: "Reserve line height",
  mathstrut: "Reserve line height",
  smash: "Remove height/depth",
  llap: "Overlap left",
  rlap: "Overlap right",
  clap: "Overlap center",
  mathllap: "Overlap left",
  mathrlap: "Overlap right",
  mathclap: "Overlap center",
  textllap: "Overlap left",
  textrlap: "Overlap right",
  textclap: "Overlap center",
  crampedllap: "Overlap left",
  crampedrlap: "Overlap right",
  crampedclap: "Overlap center",
  mathbin: "Binary spacing",
  mathrel: "Relation spacing",
  mathord: "Symbol spacing",
  mathop: "Operator spacing",
  mathopen: "Open spacing",
  mathclose: "Close spacing",
  mathpunct: "Punctuation space",
  mathinner: "Inner spacing",
  mathchoice: "Select math style",
  vcenter: "Center vertically",
  mathmakebox: "Set box width",
  mathmbox: "Box math",
  hfill: "Fill space",
  hfil: "Fill space",
  textcompwordmark: "Word mark",
  mathtip: "Add math tooltip",
  texttip: "Add text tooltip",
  toggle: "Switch math"
};
var sizes = /^(?:tiny|Tiny|scriptsize|footnotesize|small|Small|SMALL|normalsize|large|Large|LARGE|huge|Huge|HUGE)$/;
var fontCommands = /^(?:(?:math|sym)(?:bb|bf\w*|cal|scr|frak|it|normal|rm|sf\w*|tt|up)|boldsymbol|pmb|text(?:bf|it|normal|rm|sf|tt|up))$/;
var declarations = /^(?:rm|bf|it|tt|sf|cal|mit)$/;
var styles = /^(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)$/;
var spacing = /^(?:quad|qquad|enspace|enskip|thinspace|negthinspace|negmedspace|negthickspace|nobreakspace|space|[!,:;> ])$/;
function preparePreview(name, original) {
  const command = "\\" + name;
  if (effects[name]) return { preview: original, previewLabel: effects[name] };
  if (styles.test(name)) return { preview: "{" + command + "\\frac{1}{n}}" };
  if (sizes.test(name)) return { preview: "{" + command + " Abc123}" };
  if (fontCommands.test(name)) return { preview: command + "{ABC}" };
  if (declarations.test(name)) return { preview: "{" + command + " ABC}" };
  if (name === "oldstyle") return { preview: "{\\oldstyle 123}" };
  if (spacing.test(name)) return { preview: "a" + command + " b" };
  if (/^(?:hspace|kern|mkern|mskip)$/.test(name)) return { preview: "a" + original + "b" };
  if (/^(?:raise|lower)$/.test(name)) return { preview: "a+" + original + "+b" };
  return { preview: original };
}
function hasVisibleSample(mathml) {
  const visible = mathml.replace(/<mphantom\b[\s\S]*?<\/mphantom>/g, "");
  for (const match of visible.matchAll(/<(mi|mn|mo|mtext)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const text = match[2].replace(/<[^>]*>/g, "").replace(/&#x(?:A0|200[BCDF]|206[0-4]);|&#(?:160|820[3-5]|828[8-9]);|[\s\u00A0\u200B-\u200F\u2060-\u2064]/gi, "");
    if (text) return true;
  }
  return false;
}

// src/catalog.ts
var excluded = /^(?:def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand|newenvironment|renewenvironment|Declare\w*|require|autoload|href|class|style|cssId|html\w*|label|ref|eqref|refeq|tag|notag|nonumber|definecolor|color|pagecolor|setOptions|setFont|verb|end|hline|hdashline|cr|eqalign|eqalignno|leqalignno)$/;
var special = {
  frac: ["{}{}", "{a}{b}"],
  dfrac: ["{}{}", "{a}{b}"],
  tfrac: ["{}{}", "{a}{b}"],
  sqrt: ["{}", "{x}"],
  root: ["{}\\of{}", "{3}\\of{x}"],
  binom: ["{}{}", "{n}{k}"],
  dbinom: ["{}{}", "{n}{k}"],
  tbinom: ["{}{}", "{n}{k}"],
  genfrac: ["{}{}{}{}{}{}", "{(}{)}{0pt}{}{a}{b}"],
  left: ["(\\right)", "(x\\right)"],
  over: ["{}", ""],
  atop: ["{}", ""],
  choose: ["{}", ""],
  brace: ["{}", ""],
  brack: ["{}", ""],
  hspace: ["{}", "{1em}"],
  kern: ["{}", "{1em}"],
  mkern: ["{}", "{6mu}"],
  mskip: ["{}", "{6mu}"],
  raise: ["{}{}", "{2pt}{x}"],
  lower: ["{}{}", "{2pt}{x}"],
  rule: ["{}{}", "{1em}{1pt}"],
  unicode: ["{}", "{x03B1}"],
  textcolor: ["{}{}", "{blue}{x}"],
  colorbox: ["{}{}", "{blue}{x}"],
  fcolorbox: ["{}{}{}", "{blue}{white}{x}"],
  enclose: ["{}{}", "{circle}{x}"],
  cancelto: ["{}{}", "{0}{x}"],
  mathbb: ["{}", "{R}"],
  mathcal: ["{}", "{F}"],
  mathscr: ["{}", "{F}"],
  operatorname: ["{}", "{rank}"],
  text: ["{}", "{text}"]
};
var contextSamples = {
  right: ["\\right)", "\\left(x\\right)"],
  middle: ["\\middle|", "\\left(x\\middle|y\\right)"],
  limits: ["\\limits", "\\sum\\limits_{i=1}^n"],
  nolimits: ["\\nolimits", "\\sum\\nolimits_{i=1}^n"],
  displaylimits: ["\\displaylimits", "\\sum\\displaylimits_{i=1}^n"]
};
var paired = /* @__PURE__ */ new Set(["over", "atop", "choose", "brace", "brack"]);
function filterCommands(entries, query) {
  return query ? entries.filter((e) => e.name.startsWith(query)) : entries;
}
function discoverCommands(runtime) {
  const input = runtime.startup?.document?.inputJax?.find((j) => j.parseOptions?.handlers);
  const handler = input?.parseOptions?.handlers?.get("macro");
  if (!handler?._configuration || !runtime.tex2mml) return [];
  const names = /* @__PURE__ */ new Set();
  const userMap = (name) => /^(?:new-|configmacros|ams-declare|mathtools-paired)/i.test(name);
  const shadowed = /* @__PURE__ */ new Set();
  for (const { item } of handler._configuration) {
    if (userMap(item.name)) for (const raw of item.map?.keys() ?? []) shadowed.add(raw.replace(/^\\/, ""));
  }
  for (const { item } of handler._configuration) {
    if (userMap(item.name) || /^autoload/i.test(item.name)) continue;
    for (const raw of item.map?.keys() ?? []) {
      const name = raw.replace(/^\\/, "");
      if (/^(?:[A-Za-z]+|[!,:;{}_%#$|> ])$/.test(name) && !shadowed.has(name) && !excluded.test(name) && !/^(?:newtagform|renewtagform|usetagform|Declare|Set|Reset|setOptions|setFont|setcounter|resetcounter)/.test(name)) names.add(name);
    }
  }
  const valid = (source) => {
    try {
      return !/<merror\b|data-mjx-error=|mathcolor="red"|<mtext\b[^>]*>\s*\?{3}\s*<\/mtext>/.test(runtime.tex2mml(source));
    } catch {
      return false;
    }
  };
  const entries = [];
  for (const name of [...names].sort()) {
    if (name === "begin") continue;
    const command = "\\" + name;
    let insert;
    let preview = "";
    if (contextSamples[name]) {
      [insert, preview] = contextSamples[name];
      if (!valid(preview)) continue;
    } else if (/^(?:big|Big|bigg|Bigg)[lrm]?$/.test(name)) {
      const delimiter = name.endsWith("r") ? ")" : name.endsWith("m") ? "|" : "(";
      insert = command + delimiter;
      preview = insert;
      if (!valid(preview)) continue;
    } else if (special[name]) {
      const [args, sample] = special[name];
      insert = command + args;
      preview = paired.has(name) ? "{a" + command + " b}" : command + sample;
      if (!valid(preview)) continue;
    } else {
      for (let count = 0; count <= 4; count++) {
        const sample = command + "{x}".repeat(count);
        if (valid(sample)) {
          insert = command + "{}".repeat(count);
          preview = sample;
          break;
        }
      }
      if (insert === void 0) continue;
    }
    const info = preparePreview(name, preview);
    if (!valid(info.preview)) continue;
    if (!info.previewLabel && !hasVisibleSample(runtime.tex2mml(info.preview))) info.previewLabel = "Layout effect";
    const first = insert.indexOf("{}");
    entries.push({ name, insert, ...info, cursor: name === "left" ? 6 : first >= 0 ? first + 1 : insert.length });
  }
  const environments = input?.parseOptions?.handlers?.get("environment");
  const shadowedEnvironments = /* @__PURE__ */ new Set();
  for (const { item } of environments?._configuration ?? []) {
    if (userMap(item.name)) for (const name of item.map?.keys() ?? []) shadowedEnvironments.add(name);
  }
  for (const { item } of environments?._configuration ?? []) {
    if (userMap(item.name)) continue;
    for (const name of item.map?.keys() ?? []) {
      if (!/^[a-zA-Z]+\*?$/.test(name) || shadowedEnvironments.has(name)) continue;
      const args = name === "array" ? "{cc}" : /^(?:cramped)?subarray$/.test(name) ? "{c}" : /^(?:alignedat|alignat)\*?$/.test(name) ? "{2}" : "";
      const insert = `\\begin{${name}}${args}

\\end{${name}}`;
      const content = /subarray$/.test(name) ? "x \\\\ y" : "x & y \\\\ z & w";
      const preview = `\\begin{${name}}${args}${content}\\end{${name}}`;
      if (valid(preview)) entries.push({ name: `begin{${name}}`, insert, preview, cursor: insert.indexOf("\n") + 1 });
    }
  }
  return entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

// src/main.ts
var MathCommandSuggest = class extends import_obsidian.EditorSuggest {
  constructor(app, entries) {
    super(app);
    this.entries = entries;
    this.rows = /* @__PURE__ */ new Map();
    this.observer = null;
    this.previews = /* @__PURE__ */ new Map();
    this.pending = /* @__PURE__ */ new WeakMap();
    this.limit = Number.MAX_SAFE_INTEGER;
    this.setInstructions([
      { command: "\u2191 \u2193", purpose: "Select command" },
      { command: "Tab", purpose: "Insert command" },
      { command: "Esc", purpose: "Close" }
    ]);
    this.scope.register([], "Tab", (event) => {
      if (event.isComposing) return;
      for (const [row, entry] of this.rows) {
        if (row.classList.contains("is-selected")) {
          this.selectSuggestion(entry, event);
          return false;
        }
      }
    });
  }
  onTrigger(cursor, editor, _file) {
    if (editor.somethingSelected()) return null;
    if (!/\\[A-Za-z]*$/.test(editor.getLine(cursor.line).slice(0, cursor.ch))) return null;
    const found = findCommand(editor.getValue(), editor.posToOffset(cursor));
    return found ? { start: editor.offsetToPos(found.from), end: editor.offsetToPos(found.to), query: found.query } : null;
  }
  getSuggestions(context) {
    this.clearRows();
    return filterCommands(this.entries, context.query);
  }
  renderSuggestion(entry, el) {
    this.rows.set(el, entry);
    el.addClass("mathjax-command-row");
    el.createSpan({ cls: "mathjax-command-name", text: "\\" + entry.name });
    const preview = el.createSpan({ cls: "mathjax-command-preview", attr: { "aria-hidden": "true" } });
    this.pending.set(preview, entry);
    if (!this.observer) {
      this.observer = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (!change.isIntersecting) continue;
          const target = change.target;
          const value = this.pending.get(target);
          if (value) this.renderPreview(value, target);
          this.observer?.unobserve(target);
        }
      });
    }
    this.observer.observe(preview);
  }
  renderPreview(entry, target) {
    if (entry.previewLabel) {
      target.textContent = entry.previewLabel;
      target.setAttribute("title", entry.previewLabel);
      target.classList.add("suggestion-note");
      return;
    }
    try {
      let math = this.previews.get(entry.name);
      if (!math) {
        math = (0, import_obsidian.renderMath)(entry.preview, false);
        this.previews.set(entry.name, math);
      }
      target.appendChild(math.cloneNode(true));
      void (0, import_obsidian.finishRenderMath)();
    } catch {
      target.textContent = "Preview unavailable";
    }
  }
  selectSuggestion(entry, _event) {
    const context = this.context;
    this.close();
    if (!context) return;
    const { editor, start, end } = context;
    const startOffset = editor.posToOffset(start);
    editor.transaction({
      changes: [{ from: start, to: end, text: entry.insert }],
      selection: { from: editor.offsetToPos(startOffset) }
    });
    editor.setCursor(editor.offsetToPos(startOffset + entry.cursor));
  }
  clearRows() {
    this.observer?.disconnect();
    this.observer = null;
    this.rows.clear();
  }
  close() {
    super.close();
    this.clearRows();
  }
};
var MathCommandPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.disposed = false;
    this.suggest = null;
  }
  onload() {
    this.app.workspace.onLayoutReady(() => {
      void this.start();
    });
  }
  async start() {
    try {
      await (0, import_obsidian.loadMathJax)();
      if (this.disposed) return;
      const runtime = window.MathJax;
      const entries = runtime ? discoverCommands(runtime) : [];
      if (!entries.length) {
        new import_obsidian.Notice("MathJax Complete could not read the supported commands.");
        return;
      }
      this.suggest = new MathCommandSuggest(this.app, entries);
      this.registerEditorSuggest(this.suggest);
    } catch (error) {
      console.error("MathJax Complete:", error);
      new import_obsidian.Notice("MathJax Complete could not start.");
    }
  }
  onunload() {
    this.disposed = true;
    this.suggest?.close();
    this.suggest = null;
  }
};
