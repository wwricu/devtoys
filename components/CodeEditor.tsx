"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
} from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import {
  closeSearchPanel,
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as editorPlaceholder,
} from "@codemirror/view";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { colours, grammar, type EditorLanguage } from "@/components/editor-languages";
import { useLang } from "@/lib/i18n";

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (next: string) => void;
  /** Grammar id. The CodeMirror imports live in this lazy chunk, so naming a
   *  language here never pulls the editor into a route's first-load graph. */
  language?: EditorLanguage;
  /** The first syntax error, or null. Runs on a pause in typing, not a beat.
   *  Without it nothing underlines. */
  validate?: (text: string) => SyntaxError | null;
  placeholder: string;
  /** Output pane: nothing is typed here, but it stays selectable and findable. */
  readOnly?: boolean;
  /** Box layout, shared with the plain field this replaces once the chunk lands. */
  className?: string;
  ref?: Ref<CodeEditorHandle>;
}

export interface CodeEditorHandle {
  focus(): void;
}

/* Find is a per-editor panel, so Ctrl-F has to reach an editor even when the
   caret is not in one. Browser find cannot be turned off from a page, so where
   an editor exists the shortcut is taken instead: the panel opens in the field
   under the caret, or the one that last had focus, or the first on the page. */
const views = new Set<EditorView>();
let lastFocused: EditorView | null = null;

/** The find panel speaks CodeMirror's own English; the app is bilingual. */
const ZH_SEARCH_PHRASES = {
  Find: "查找",
  "match case": "区分大小写",
  "by word": "整词",
  regexp: "正则",
  next: "下一个",
  previous: "上一个",
  all: "全部",
  Replace: "替换",
  replace: "替换",
  "replace all": "全部替换",
};

function localeExtensions(placeholder: string, lang: string): Extension[] {
  return [
    editorPlaceholder(placeholder),
    ...(lang === "zh" ? [EditorState.phrases.of(ZH_SEARCH_PHRASES)] : []),
  ];
}

function findKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
  if (event.key.toLowerCase() !== "f") return;
  const host = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    ".cm-editor",
  );
  const view =
    (host ? EditorView.findFromDOM(host) : null) ??
    lastFocused ??
    views.values().next().value ??
    null;
  if (!view) return;
  // One find on the page at a time, whatever number of fields it holds.
  for (const other of views) if (other !== view) closeSearchPanel(other);
  event.preventDefault();
  event.stopPropagation();
  view.focus();
  openSearchPanel(view);
}

function register(view: EditorView) {
  views.add(view);
  if (views.size === 1) window.addEventListener("keydown", findKeydown, true);
}

function unregister(view: EditorView) {
  views.delete(view);
  if (lastFocused === view) lastFocused = null;
  if (views.size === 0) window.removeEventListener("keydown", findKeydown, true);
}

/**
 * A code input with line numbers, folding, colouring and an underline on the
 * offending text. Ships as its own chunk: the tool keeps its plain textarea
 * until this module has loaded, so the route's first paint never waits for it.
 * Several tools can import it and the bundler still emits one copy.
 */
export default function CodeEditor({
  value,
  onChange,
  language,
  validate,
  placeholder,
  readOnly = false,
  className = "min-h-0 flex-1",
  ref,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const { lang } = useLang();
  // The extensions are built once, so the callbacks live behind a ref. The
  // validator is in there too: JSON and XML rebuild theirs when their unescape
  // switch flips, and a frozen one underlines the wrong text after that.
  const latest = useRef({ onChange, placeholder, validate });
  const localeBits = useRef(new Compartment());

  useEffect(() => {
    latest.current = { onChange, placeholder, validate };
  });

  useImperativeHandle(ref, () => ({ focus: () => view.current?.focus() }), []);

  // The placeholder follows the tool's own switches (JSON and XML change theirs
  // with the unescape toggle) and the find panel follows the UI language, so
  // these two live in a compartment instead of being frozen with the setup.
  useEffect(() => {
    view.current?.dispatch({
      effects: localeBits.current.reconfigure(
        localeExtensions(placeholder, lang),
      ),
    });
  }, [placeholder, lang]);

  useEffect(() => {
    // A syntax error underlines itself and the tool's status line names the
    // position; no gutter column is reserved for it, since it would sit empty
    // until something breaks.
    const checked: Extension[] = validate
      ? [
          linter(
            (editor) => {
              const { state } = editor;
              const check = latest.current.validate;
              const error = check ? check(state.doc.toString()) : null;
              if (!error) return [];
              const row = state.doc.line(
                Math.min(Math.max(error.line, 1), state.doc.lines),
              );
              const from = Math.min(row.from + error.column - 1, row.to);
              const diagnostic: Diagnostic = {
                from,
                to: Math.min(from + 1, state.doc.length),
                severity: "error",
                message: error.message,
              };
              return [diagnostic];
            },
            { delay: 400 },
          ),
        ]
      : [];
    const setup: Extension[] = [
      // The fold column is empty on a field with no grammar — nothing there can
      // fold — but every field carries it so the gap between the row number and
      // the text is the same width on every route.
      lineNumbers(),
      foldGutter(),
      ...(readOnly
        ? [EditorState.readOnly.of(true)]
        : [history(), indentOnInput(), ...checked]),
      bracketMatching(),
      highlightActiveLine(),
      ...(language ? [grammar(language), colours(language)] : []),
      EditorView.lineWrapping,
      localeBits.current.of(localeExtensions(placeholder, lang)),
      search({ top: true }),
      highlightSelectionMatches(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.focusChanged && update.view.hasFocus) {
          lastFocused = update.view;
        }
        if (update.docChanged) {
          latest.current.onChange?.(update.state.doc.toString());
        }
      }),
    ];

    const created = new EditorView({
      state: EditorState.create({ extensions: setup }),
      parent: host.current ?? undefined,
    });
    view.current = created;
    register(created);
    return () => {
      unregister(created);
      created.destroy();
      view.current = null;
    };
    // Built once; language is a module constant from the tool, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The editor owns the caret, so a value that changed elsewhere (Clear, Open
  // file) has to be pushed in instead of re-rendering the field.
  useEffect(() => {
    const current = view.current;
    if (current && current.state.doc.toString() !== value) {
      current.dispatch({
        changes: { from: 0, to: current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={host} className={`overflow-hidden ${className}`} />;
}
