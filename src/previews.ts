/** Samples are separate from the text inserted into a note. */
export interface PreviewInfo { preview: string; previewLabel?: string }

const effects: Record<string, string> = {
  phantom: 'Reserve space', hphantom: 'Reserve width', vphantom: 'Reserve height',
  strut: 'Reserve line height', mathstrut: 'Reserve line height', smash: 'Remove height/depth',
  llap: 'Overlap left', rlap: 'Overlap right', clap: 'Overlap center',
  mathllap: 'Overlap left', mathrlap: 'Overlap right', mathclap: 'Overlap center',
  textllap: 'Overlap left', textrlap: 'Overlap right', textclap: 'Overlap center',
  crampedllap: 'Overlap left', crampedrlap: 'Overlap right', crampedclap: 'Overlap center',
  mathbin: 'Binary spacing', mathrel: 'Relation spacing', mathord: 'Symbol spacing',
  mathop: 'Operator spacing', mathopen: 'Open spacing', mathclose: 'Close spacing',
  mathpunct: 'Punctuation space', mathinner: 'Inner spacing',
  mathchoice: 'Select math style', vcenter: 'Center vertically',
  mathmakebox: 'Set box width', mathmbox: 'Box math',
  hfill: 'Fill space', hfil: 'Fill space',
  textcompwordmark: 'Word mark', mathtip: 'Add math tooltip', texttip: 'Add text tooltip',
  toggle: 'Switch math',
};
const sizes = /^(?:tiny|Tiny|scriptsize|footnotesize|small|Small|SMALL|normalsize|large|Large|LARGE|huge|Huge|HUGE)$/;
const fontCommands = /^(?:(?:math|sym)(?:bb|bf\w*|cal|scr|frak|it|normal|rm|sf\w*|tt|up)|boldsymbol|pmb|text(?:bf|it|normal|rm|sf|tt|up))$/;
const declarations = /^(?:rm|bf|it|tt|sf|cal|mit)$/;
const styles = /^(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)$/;
const spacing = /^(?:quad|qquad|enspace|enskip|thinspace|negthinspace|negmedspace|negthickspace|nobreakspace|space|[!,:;> ])$/;

export function preparePreview(name: string, original: string): PreviewInfo {
  const command = '\\' + name;
  if (effects[name]) return {preview: original, previewLabel: effects[name]};
  if (styles.test(name)) return {preview: '{' + command + '\\frac{1}{n}}'};
  if (sizes.test(name)) return {preview: '{' + command + ' Abc123}'};
  if (fontCommands.test(name)) return {preview: command + '{ABC}'};
  if (declarations.test(name)) return {preview: '{' + command + ' ABC}'};
  if (name === 'oldstyle') return {preview: '{\\oldstyle 123}'};
  if (spacing.test(name)) return {preview: 'a' + command + ' b'};
  if (/^(?:hspace|kern|mkern|mskip)$/.test(name)) return {preview:'a' + original + 'b'};
  if (/^(?:raise|lower)$/.test(name)) return {preview:'a+' + original + '+b'};
  return {preview: original};
}

/** Recognize glyphs in MathML, rather than counting hidden phantom contents. */
export function hasVisibleSample(mathml: string): boolean {
  const visible = mathml.replace(/<mphantom\b[\s\S]*?<\/mphantom>/g, '');
  for (const match of visible.matchAll(/<(mi|mn|mo|mtext)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const text = match[2].replace(/<[^>]*>/g, '')
      .replace(/&#x(?:A0|200[BCDF]|206[0-4]);|&#(?:160|820[3-5]|828[8-9]);|[\s\u00A0\u200B-\u200F\u2060-\u2064]/gi, '');
    if (text) return true;
  }
  return false;
}
