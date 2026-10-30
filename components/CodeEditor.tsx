"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, linter, type Diagnostic } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as editorPlaceholder,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

/** Colours are CSS variables, so light/dark stays a class flip on <html> and
 *  the editor is never reconfigured. */
const jsonHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: "var(--cm-key)" },
  { tag: t.string, color: "var(--cm-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--cm-value)" },
  { tag: [t.brace, t.bracket, t.punctuation], color: "var(--cm-punct)" },
  { tag: t.comment, color: "var(--cm-comment)", fontStyle: "italic" },
]);

export interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** The first syntax error, or null. Runs on a pause in typing, not a beat. */
  validate: (text: string) => { message: string; line: number; column: number } | null;
  placeholder: string;
}

/**
 * A JSON input with line numbers, folding, colouring and a marker on the
 * offending line. Ships as its own chunk: the tool keeps its plain textarea
 * until this module has loaded, so the route's first paint never waits for it.
 * Several tools can import it and the bundler still emits one copy.
 */
export default function CodeEditor({
  value,
  onChange,
  validate,
  placeholder,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // The extensions are built once, so the callbacks live behind a ref.
  const latest = useRef({ onChange, validate, placeholder });

  useEffect(() => {
    latest.current = { onChange, validate, placeholder };
  });

  useEffect(() => {
    const extensions: Extension[] = [
      lineNumbers(),
      foldGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      highlightActiveLine(),
      syntaxHighlighting(jsonHighlight),
      json(),
      EditorView.lineWrapping,
      editorPlaceholder(latest.current.placeholder),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      lintGutter(),
      linter(
        (editor) => {
          const { state } = editor;
          const error = latest.current.validate(state.doc.toString());
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
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          latest.current.onChange(update.state.doc.toString());
        }
      }),
    ];

    const created = new EditorView({
      state: EditorState.create({ extensions }),
      parent: host.current ?? undefined,
    });
    view.current = created;
    return () => {
      created.destroy();
      view.current = null;
    };
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

  return <div ref={host} className="min-h-0 flex-1 overflow-hidden" />;
}
