export interface CommandContext { from: number; to: number; query: string }

/** Find a command only in math. Code and escaped dollar signs are ignored. */
export function findCommand(text: string, offset: number): CommandContext | null {
  if (offset < 0 || offset > text.length) return null;
  const match = /\\([a-zA-Z]*)$/.exec(text.slice(0, offset));
  if (!match) return null;
  const from = offset - match[0].length;
  let slashes = 0;
  for (let j = from - 1; j >= 0 && text[j] === '\\'; j--) slashes++;
  if (slashes % 2) return null;
  let math: 0 | 1 | 2 = 0;
  let i = 0;
  while (i < from) {
    // Fences and front matter only have meaning outside math.
    if (!math && (i === 0 || text[i - 1] === '\n')) {
      const line = text.slice(i, text.indexOf('\n', i) < 0 ? text.length : text.indexOf('\n', i));
      if (i === 0 && /^---\s*$/.test(line)) {
        const end = /\n(?:---|\.\.\.)[ \t]*(?:\n|$)/g;
        end.lastIndex = i + line.length;
        const close = end.exec(text);
        if (!close || close.index >= from) return null;
        i = close.index + close[0].length;
        continue;
      }
      const container = /^(?:[ \t]*>[ \t]?|[ \t]*(?:[-+*]|[0-9]+[.)])[ \t]+)*/;
      const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line.replace(container, ''));
      if (fence) {
        const closeFence = new RegExp('^ {0,3}' + fence[1][0] + '{' + fence[1].length + ',}[ \\t]*$');
        let next = i + line.length + 1;
        let close = -1;
        while (next < text.length) {
          const end = text.indexOf('\n', next);
          const lineEnd = end < 0 ? text.length : end;
          if (closeFence.test(text.slice(next, lineEnd).replace(container, ''))) { close = lineEnd; break; }
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
    if (!math && text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      if (close < 0 || close >= from) return null;
      i = close + 3;
      continue;
    }
    if (!math && text[i] === '`') {
      const run = /^`+/.exec(text.slice(i))![0];
      let close = text.indexOf(run, i + run.length);
      while (close >= 0 && (text[close - 1] === '`' || text[close + run.length] === '`')) close = text.indexOf(run, close + run.length);
      if (close >= 0) {
        if (close >= from) return null;
        i = close + run.length;
        continue;
      }
    }
    if (text[i] === '\\') { i += 2; continue; }
    if (math && text[i] === '%') {
      const close = text.indexOf('\n', i);
      if (close < 0 || close >= from) return null;
      i = close + 1;
      continue;
    }
    if (text[i] === '$') {
      const width = text[i + 1] === '$' ? 2 : 1;
      if (!math) math = width;
      else if (math === width) math = 0;
      i += width;
      continue;
    }
    i++;
  }
  if (!math) return null;
  const suffix = /^[a-zA-Z]*/.exec(text.slice(offset))![0];
  return {from, to: offset + suffix.length, query: match[1]};
}
