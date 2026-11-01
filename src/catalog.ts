import {preparePreview, hasVisibleSample} from './previews';

export interface CommandEntry {name: string; insert: string; preview: string; cursor: number; previewLabel?: string}
interface SymbolMap {name: string; map?: Map<string, unknown>}
export interface MathRuntime {
  startup?: {document?: {inputJax?: Array<{parseOptions?: {handlers?: {get(name: string): {_configuration?: Iterable<{item: SymbolMap}>} | undefined}}}>}};
  tex2mml?: (source: string) => string;
}
// These commands change definitions, load code, or need document-level state.
const excluded = /^(?:def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand|newenvironment|renewenvironment|Declare\w*|require|autoload|href|class|style|cssId|html\w*|label|ref|eqref|refeq|tag|notag|nonumber|definecolor|color|pagecolor|setOptions|setFont|verb|end|hline|hdashline|cr|eqalign|eqalignno|leqalignno)$/;
const special: Record<string, [string, string]> = {
  frac: ['{}{}','{a}{b}'], dfrac:['{}{}','{a}{b}'], tfrac:['{}{}','{a}{b}'],
  sqrt:['{}','{x}'], root:['{}\\of{}','{3}\\of{x}'],
  binom:['{}{}','{n}{k}'], dbinom:['{}{}','{n}{k}'], tbinom:['{}{}','{n}{k}'],
  genfrac:['{}{}{}{}{}{}','{(}{)}{0pt}{}{a}{b}'],
  left:['(\\right)','(x\\right)'],
  over:['{}',''], atop:['{}',''], choose:['{}',''], brace:['{}',''], brack:['{}',''],
  hspace:['{}','{1em}'], kern:['{}','{1em}'], mkern:['{}','{6mu}'], mskip:['{}','{6mu}'],
  raise:['{}{}','{2pt}{x}'], lower:['{}{}','{2pt}{x}'],
  rule:['{}{}','{1em}{1pt}'], unicode:['{}','{x03B1}'],
  textcolor:['{}{}','{blue}{x}'], colorbox:['{}{}','{blue}{x}'], fcolorbox:['{}{}{}','{blue}{white}{x}'],
  enclose:['{}{}','{circle}{x}'], cancelto:['{}{}','{0}{x}'],
  mathbb:['{}','{R}'], mathcal:['{}','{F}'], mathscr:['{}','{F}'],
  operatorname:['{}','{rank}'], text:['{}','{text}'],
};
const contextSamples: Record<string, [string, string]> = {
  right: ['\\right)', '\\left(x\\right)'],
  middle: ['\\middle|', '\\left(x\\middle|y\\right)'],
  limits: ['\\limits', '\\sum\\limits_{i=1}^n'],
  nolimits: ['\\nolimits', '\\sum\\nolimits_{i=1}^n'],
  displaylimits: ['\\displaylimits', '\\sum\\displaylimits_{i=1}^n'],
};
const paired = new Set(['over','atop','choose','brace','brack']);

export function filterCommands(entries: CommandEntry[], query: string): CommandEntry[] {
  return query ? entries.filter(e=>e.name.startsWith(query)) : entries;
}

/** Read loaded built-in maps. Omit user definitions and names they replace. */
export function discoverCommands(runtime: MathRuntime): CommandEntry[] {
  const input = runtime.startup?.document?.inputJax?.find(j=>j.parseOptions?.handlers);
  const handler = input?.parseOptions?.handlers?.get('macro');
  if (!handler?._configuration || !runtime.tex2mml) return [];
  const names = new Set<string>();
  const userMap = (name: string) => /^(?:new-|configmacros|ams-declare|mathtools-paired)/i.test(name);
  const shadowed = new Set<string>();
  for (const {item} of handler._configuration) {
    if (userMap(item.name)) for (const raw of item.map?.keys() ?? []) shadowed.add(raw.replace(/^\\/, ''));
  }
  for (const {item} of handler._configuration) {
    if (userMap(item.name) || /^autoload/i.test(item.name)) continue;
    for (const raw of item.map?.keys() ?? []) {
      const name = raw.replace(/^\\/, '');
      if (/^(?:[A-Za-z]+|[!,:;{}_%#$|> ])$/.test(name) && !shadowed.has(name) && !excluded.test(name) && !/^(?:newtagform|renewtagform|usetagform|Declare|Set|Reset|setOptions|setFont|setcounter|resetcounter)/.test(name)) names.add(name);
    }
  }
  const valid = (source: string): boolean => {
    try { return !/<merror\b|data-mjx-error=|mathcolor="red"|<mtext\b[^>]*>\s*\?{3}\s*<\/mtext>/.test(runtime.tex2mml!(source)); }
    catch { return false; }
  };
  const entries: CommandEntry[] = [];
  for (const name of [...names].sort()) {
    if (name === 'begin') continue;
    const command = '\\' + name;
    let insert: string | undefined;
    let preview = '';
    if (contextSamples[name]) {
      [insert, preview] = contextSamples[name];
      if (!valid(preview)) continue;
    } else if (/^(?:big|Big|bigg|Bigg)[lrm]?$/.test(name)) {
      const delimiter = name.endsWith('r') ? ')' : name.endsWith('m') ? '|' : '(';
      insert = command + delimiter;
      preview = insert;
      if (!valid(preview)) continue;
    } else if (special[name]) {
      const [args, sample] = special[name];
      insert = command + args;
      preview = paired.has(name) ? '{a' + command + ' b}' : command + sample;
      if (!valid(preview)) continue;
    } else {
      for (let count = 0; count <= 4; count++) {
        const sample = command + '{x}'.repeat(count);
        if (valid(sample)) { insert = command + '{}'.repeat(count); preview = sample; break; }
      }
      if (insert === undefined) continue;
    }
    const info = preparePreview(name, preview);
    if (!valid(info.preview)) continue;
    if (!info.previewLabel && !hasVisibleSample(runtime.tex2mml!(info.preview))) info.previewLabel = 'Layout effect';
    const first = insert.indexOf('{}');
    entries.push({name,insert,...info,cursor:name==='left'?6:first>=0?first+1:insert.length});
  }
  // Environments need a complete pair to make a valid preview.
  const environments = input?.parseOptions?.handlers?.get('environment');
  const shadowedEnvironments = new Set<string>();
  for (const {item} of environments?._configuration ?? []) {
    if (userMap(item.name)) for (const name of item.map?.keys() ?? []) shadowedEnvironments.add(name);
  }
  for (const {item} of environments?._configuration ?? []) {
    if (userMap(item.name)) continue;
    for (const name of item.map?.keys() ?? []) {
      if (!/^[a-zA-Z]+\*?$/.test(name) || shadowedEnvironments.has(name)) continue;
      const args = name === 'array' ? '{cc}' : /^(?:cramped)?subarray$/.test(name) ? '{c}' : /^(?:alignedat|alignat)\*?$/.test(name) ? '{2}' : '';
      const insert = `\\begin{${name}}${args}\n\n\\end{${name}}`;
      const content = /subarray$/.test(name) ? 'x \\\\ y' : 'x & y \\\\ z & w';
      const preview = `\\begin{${name}}${args}${content}\\end{${name}}`;
      if (valid(preview)) entries.push({name:`begin{${name}}`,insert,preview,cursor:insert.indexOf('\n')+1});
    }
  }
  return entries.sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
