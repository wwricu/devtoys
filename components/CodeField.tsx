"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { editorClass } from "@/components/kit";
import type {
  CodeEditorHandle,
  SyntaxError as EditorSyntaxError,
} from "@/components/CodeEditor";
import type { Extension } from "@codemirror/state";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
});

export interface CodeFieldProps {
  value: string;
  /** Omit it on a read-only pane. */
  onChange?: (next: string) => void;
  /** Grammar and colours from the tool; see components/CodeEditor. Without it
   *  the editor shows plain text, which is what most tools pass. */
  extensions?: Extension[];
  validate?: (text: string) => EditorSyntaxError | null;
  /** Shown only while empty; a pane that always has content can omit it. */
  placeholder?: string;
  /** Output pane: selectable and findable, but nothing is typed here. */
  readOnly?: boolean;
  /** Box classes; the plain field and the editor get the same string. */
  className?: string;
  ref?: Ref<CodeFieldHandle>;
}

export interface CodeFieldHandle {
  focus(): void;
}

/**
 * The multi-line text field of every tool. It starts as the plain textarea the
 * route already renders and hands over to CodeMirror once that chunk has
 * arrived, so the prerendered body never waits for the editor and a user who
 * begins typing before the swap keeps the textarea until they leave the field.
 * The editor adds a find panel, and undo, to both inputs and outputs.
 */
export default function CodeField({
  value,
  onChange,
  extensions,
  validate,
  placeholder = "",
  readOnly = false,
  className,
  ref,
}: CodeFieldProps) {
  const plain = useRef<HTMLTextAreaElement>(null);
  const rich = useRef<CodeEditorHandle>(null);
  const editing = useRef(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/components/CodeEditor")
      .then(() => {
        if (!cancelled && !editing.current) setShowEditor(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({ focus: () => (showEditor ? rich : plain).current?.focus() }),
    [showEditor],
  );

  const box = className ?? editorClass;

  return showEditor ? (
    <CodeEditor
      ref={rich}
      value={value}
      onChange={onChange}
      extensions={extensions ?? []}
      validate={validate}
      placeholder={placeholder}
      readOnly={readOnly}
      className={box}
    />
  ) : (
    <textarea
      ref={plain}
      className={box}
      spellCheck={false}
      readOnly={readOnly}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => {
        editing.current = true;
      }}
      onBlur={() => {
        editing.current = false;
        setShowEditor(true);
      }}
    />
  );
}
