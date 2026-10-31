"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
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
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
}

export interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Grammar and colours, supplied by the tool so one language is not paid for
   *  by every other editor. */
  extensions: Extension[];
  /** The first syntax error, or null. Runs on a pause in typing, not a beat.
   *  Without it the field gets no marker and no underline. */
  validate?: (text: string) => SyntaxError | null;
  placeholder: string;
  ref?: Ref<CodeEditorHandle>;
}

export interface CodeEditorHandle {
  focus(): void;
}

/**
 * A code input with line numbers, folding, colouring and a marker on the
 * offending line. Ships as its own chunk: the tool keeps its plain textarea
 * until this module has loaded, so the route's first paint never waits for it.
 * Several tools can import it and the bundler still emits one copy.
 */
export default function CodeEditor({
  value,
  onChange,
  extensions,
  validate,
  placeholder,
  ref,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // The extensions are built once, so the callbacks live behind a ref.
  const latest = useRef({ onChange, validate, placeholder });

  useEffect(() => {
    latest.current = { onChange, validate, placeholder };
  });

  useImperativeHandle(ref, () => ({ focus: () => view.current?.focus() }), []);

  useEffect(() => {
    const setup: Extension[] = [
      lineNumbers(),
      foldGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      highlightActiveLine(),
      ...extensions,
      EditorView.lineWrapping,
      editorPlaceholder(latest.current.placeholder),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      lintGutter(),
      linter(
        (editor) => {
          const check = latest.current.validate;
          if (!check) return [];
          const { state } = editor;
          const error = check(state.doc.toString());
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
      state: EditorState.create({ extensions: setup }),
      parent: host.current ?? undefined,
    });
    view.current = created;
    return () => {
      created.destroy();
      view.current = null;
    };
    // Built once; extensions is a module constant from the tool, on purpose.
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

  return <div ref={host} className="min-h-0 flex-1 overflow-hidden" />;
}
