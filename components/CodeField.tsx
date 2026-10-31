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
  onChange: (next: string) => void;
  /** Grammar and colours from the tool; see components/CodeEditor. Omit it and
   *  the field stays a plain textarea, which never asks for the editor chunk. */
  extensions?: Extension[];
  validate?: (text: string) => EditorSyntaxError | null;
  placeholder: string;
  ref?: Ref<CodeFieldHandle>;
}

export interface CodeFieldHandle {
  focus(): void;
}

/**
 * A multi-line text field that starts as the plain textarea every tool
 * already renders and hands over to CodeMirror once that chunk has arrived.
 * The prerendered body therefore never waits for the editor, and a user who
 * begins typing before the swap keeps the textarea until they leave the field.
 */
export default function CodeField({
  value,
  onChange,
  extensions,
  validate,
  placeholder,
  ref,
}: CodeFieldProps) {
  const plain = useRef<HTMLTextAreaElement>(null);
  const rich = useRef<CodeEditorHandle>(null);
  const editing = useRef(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!extensions) return;
    let cancelled = false;
    import("@/components/CodeEditor")
      .then(() => {
        if (!cancelled && !editing.current) setShowEditor(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [extensions]);

  useImperativeHandle(
    ref,
    () => ({ focus: () => (showEditor ? rich : plain).current?.focus() }),
    [showEditor],
  );

  return showEditor && extensions ? (
    <CodeEditor
      ref={rich}
      value={value}
      onChange={onChange}
      extensions={extensions}
      validate={validate}
      placeholder={placeholder}
    />
  ) : (
    <textarea
      ref={plain}
      className={editorClass}
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
