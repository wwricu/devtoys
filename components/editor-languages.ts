// CodeMirror grammars and colours, kept behind the lazy editor chunk: importing
// any @codemirror package here (not in a tool) is what keeps the 279 KB editor
// out of every route's first-load graph.
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

export type EditorLanguage = "json" | "xml" | "sql";

// Colours are CSS variables, so light/dark stays a class flip on <html> and the
// editor is never reconfigured.
const styles: Record<EditorLanguage, HighlightStyle> = {
  json: HighlightStyle.define([
    { tag: t.propertyName, color: "var(--cm-key)" },
    { tag: t.string, color: "var(--cm-string)" },
    { tag: [t.number, t.bool, t.null], color: "var(--cm-value)" },
    { tag: [t.brace, t.bracket, t.punctuation], color: "var(--cm-punct)" },
    { tag: t.comment, color: "var(--cm-comment)", fontStyle: "italic" },
  ]),
  xml: HighlightStyle.define([
    { tag: t.tagName, color: "var(--cm-key)" },
    { tag: t.attributeName, color: "var(--cm-value)" },
    { tag: [t.attributeValue, t.string], color: "var(--cm-string)" },
    {
      tag: [t.angleBracket, t.punctuation, t.definitionOperator],
      color: "var(--cm-punct)",
    },
    {
      tag: [t.comment, t.processingInstruction, t.documentMeta],
      color: "var(--cm-comment)",
      fontStyle: "italic",
    },
    { tag: t.invalid, color: "var(--cm-key)" },
  ]),
  sql: HighlightStyle.define([
    { tag: t.keyword, color: "var(--cm-key)", fontWeight: "600" },
    { tag: [t.typeName, t.number, t.bool, t.null], color: "var(--cm-value)" },
    { tag: t.string, color: "var(--cm-string)" },
    { tag: [t.bracket, t.punctuation], color: "var(--cm-punct)" },
    { tag: t.operator, color: "var(--cm-punct)" },
    { tag: t.comment, color: "var(--cm-comment)", fontStyle: "italic" },
  ]),
};

const parsers: Record<EditorLanguage, () => Extension> = { json, xml, sql };

export function grammar(language: EditorLanguage): Extension {
  return parsers[language]();
}

export function colours(language: EditorLanguage): Extension {
  return syntaxHighlighting(styles[language]);
}