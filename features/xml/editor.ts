import { xml } from "@codemirror/lang-xml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

/** Colours are CSS variables, so light/dark stays a class flip on <html> and
 *  the editor is never reconfigured. Text content stays uncoloured. */
const xmlHighlight = HighlightStyle.define([
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
]);

export const xmlExtensions: Extension[] = [
  xml(),
  syntaxHighlighting(xmlHighlight),
];
