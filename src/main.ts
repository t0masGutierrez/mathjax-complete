import {EditorSuggest, Plugin, Notice, loadMathJax, renderMath, finishRenderMath,
  type App, type Editor, type EditorPosition, type EditorSuggestContext,
  type EditorSuggestTriggerInfo, type TFile} from 'obsidian';
import {findCommand} from './context';
import {discoverCommands, filterCommands, type CommandEntry, type MathRuntime} from './catalog';

class MathCommandSuggest extends EditorSuggest<CommandEntry> {
  private rows = new Map<HTMLElement, CommandEntry>();
  private observer: IntersectionObserver | null = null;
  private previews = new Map<string, HTMLElement>();
  private pending = new WeakMap<Element, CommandEntry>();

  constructor(app: App, private entries: CommandEntry[]) {
    super(app);
    this.limit = Number.MAX_SAFE_INTEGER;
    this.setInstructions([
      {command:'↑ ↓',purpose:'Select command'},
      {command:'Tab',purpose:'Insert command'},
      {command:'Esc',purpose:'Close'},
    ]);
    this.scope.register([], 'Tab', event => {
      if (event.isComposing) return;
      for (const [row, entry] of this.rows) {
        if (row.classList.contains('is-selected')) {
          this.selectSuggestion(entry, event);
          return false;
        }
      }
    });
  }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    if (editor.somethingSelected()) return null;
    // Most editor changes cannot start a command. Avoid reading the full note for them.
    if (!/\\[A-Za-z]*$/.test(editor.getLine(cursor.line).slice(0,cursor.ch))) return null;
    const found = findCommand(editor.getValue(), editor.posToOffset(cursor));
    return found ? {start:editor.offsetToPos(found.from),end:editor.offsetToPos(found.to),query:found.query} : null;
  }

  getSuggestions(context: EditorSuggestContext): CommandEntry[] {
    this.clearRows();
    return filterCommands(this.entries, context.query);
  }

  renderSuggestion(entry: CommandEntry, el: HTMLElement): void {
    this.rows.set(el,entry);
    el.addClass('mathjax-command-row');
    el.createSpan({cls:'mathjax-command-name',text:'\\'+entry.name});
    const preview = el.createSpan({cls:'mathjax-command-preview',attr:{'aria-hidden':'true'}});
    this.pending.set(preview,entry);
    if (!this.observer) {
      this.observer = new IntersectionObserver(changes => {
        for (const change of changes) {
          if (!change.isIntersecting) continue;
          const target = change.target;
          const value = this.pending.get(target);
          if (value) this.renderPreview(value,target);
          this.observer?.unobserve(target);
        }
      });
    }
    this.observer.observe(preview);
  }

  private renderPreview(entry: CommandEntry, target: Element): void {
    if (entry.previewLabel) {
      target.textContent = entry.previewLabel;
      target.setAttribute('title', entry.previewLabel);
      target.classList.add('suggestion-note');
      return;
    }
    try {
      let math = this.previews.get(entry.name);
      if (!math) {
        math = renderMath(entry.preview, false);
        this.previews.set(entry.name,math);
      }
      target.appendChild(math.cloneNode(true));
      void finishRenderMath();
    } catch {
      target.textContent = 'Preview unavailable';
    }
  }

  selectSuggestion(entry: CommandEntry, _event: MouseEvent | KeyboardEvent): void {
    const context = this.context;
    this.close();
    if (!context) return;
    const {editor,start,end} = context;
    const startOffset = editor.posToOffset(start);
    editor.transaction({
      changes:[{from:start,to:end,text:entry.insert}],
      selection:{from:editor.offsetToPos(startOffset)},
    });
    editor.setCursor(editor.offsetToPos(startOffset+entry.cursor));
  }

  private clearRows(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.rows.clear();
  }

  close(): void {
    super.close();
    this.clearRows();
  }
}

export default class MathCommandPlugin extends Plugin {
  private disposed = false;
  private suggest: MathCommandSuggest | null = null;

  onload(): void {
    this.app.workspace.onLayoutReady(() => { void this.start(); });
  }

  private async start(): Promise<void> {
    try {
      await loadMathJax();
      if (this.disposed) return;
      const runtime = (window as Window & {MathJax?: MathRuntime}).MathJax;
      const entries = runtime ? discoverCommands(runtime) : [];
      if (!entries.length) {
        new Notice('MathJax Complete could not read the supported commands.');
        return;
      }
      this.suggest = new MathCommandSuggest(this.app, entries);
      this.registerEditorSuggest(this.suggest);
    } catch (error) {
      console.error('MathJax Complete:', error);
      new Notice('MathJax Complete could not start.');
    }
  }

  onunload(): void {
    this.disposed = true;
    this.suggest?.close();
    this.suggest = null;
  }
}
