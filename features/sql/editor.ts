import { sql } from "@codemirror/lang-sql";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

/** Colours are CSS variables, so light/dark stays a class flip on <html> and
 *  the editor is never reconfigured. Table and column names stay uncoloured. */
const sqlHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--cm-key)", fontWeight: "600" },
  { tag: [t.typeName, t.number, t.bool, t.null], color: "var(--cm-value)" },
  { tag: t.string, color: "var(--cm-string)" },
  { tag: [t.bracket, t.punctuation], color: "var(--cm-punct)" },
  { tag: t.operator, color: "var(--cm-punct)" },
  { tag: t.comment, color: "var(--cm-comment)", fontStyle: "italic" },
]);

export const sqlExtensions: Extension[] = [
  sql(),
  syntaxHighlighting(sqlHighlight),
];
