import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

/** Colours are CSS variables, so light/dark stays a class flip on <html> and
 *  the editor is never reconfigured. */
const jsonHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: "var(--cm-key)" },
  { tag: t.string, color: "var(--cm-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--cm-value)" },
  { tag: [t.brace, t.bracket, t.punctuation], color: "var(--cm-punct)" },
  { tag: t.comment, color: "var(--cm-comment)", fontStyle: "italic" },
]);

export const jsonExtensions: Extension[] = [
  json(),
  syntaxHighlighting(jsonHighlight),
];
