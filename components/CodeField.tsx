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
  // The editable textarea is uncontrolled, so React cannot keep it in step with
  // the tool's state. Only a change that did not originate from this field needs
  // pushing in - the examples, "use the output as input", file loading, Clear.
  const reported = useRef(value);

  useEffect(() => {
    if (value === reported.current) return;
    reported.current = value;
    const el = plain.current;
    if (el) el.value = value;
  }, [value]);

  useEffect(() => {
    // Whatever was typed before hydration lives only in the DOM, and React's
    // first commit would replace it with its own (empty) value. Adopt it, and
    // if the caret is already in the field, hold the swap until the user leaves.
    const el = plain.current;
    if (el) {
      if (document.activeElement === el) editing.current = true;
      if (!readOnly && el.value !== value) onChange?.(el.value);
    }
    let cancelled = false;
    import("@/components/CodeEditor")
      .then(() => {
        if (!cancelled && !editing.current) setShowEditor(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Once per field: it reads the DOM the page first rendered, not later state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // An editable field is left uncontrolled until the editor takes over, so
      // nothing can erase what was pasted into it before hydration. A read-only
      // field has no caret to lose and keeps following the tool's output.
      {...(readOnly ? { value } : { defaultValue: value })}
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
