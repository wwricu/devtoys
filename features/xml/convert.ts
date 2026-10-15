/**
 * XML and JSON value trees, in both directions. Attributes are kept under a
 * configurable prefix and element text under a named property, which is the
 * convention the rest of the tool ecosystem uses for round-tripping markup.
 */

import { parseXml, type XmlNode } from "./format";

export interface XmlJsonOptions {
  attributeNamePrefix: string;
  textPropertyName: string;
  ignoreAttributes: boolean;
}

export const defaultXmlJsonOptions: XmlJsonOptions = {
  attributeNamePrefix: "@_",
  textPropertyName: "#text",
  ignoreAttributes: false,
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][\w-]*);/g, (all, body: string) => {
    const code = body.startsWith("#")
      ? Number.parseInt(body.slice(body[1] === "x" || body[1] === "X" ? 2 : 1), body[1] === "x" || body[1] === "X" ? 16 : 10)
      : undefined;
    if (code !== undefined) {
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[body] ?? all;
  });
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const isElement = (node: XmlNode): node is Extract<XmlNode, { type: "element" }> =>
  node.type === "element";

const meaningful = (child: XmlNode): boolean =>
  isElement(child) ||
  (child.type === "cdata" && child.value.trim() !== "") ||
  (child.type === "text" && child.value.trim() !== "");

function elementText(node: Extract<XmlNode, { type: "element" }>): string {
  return node.children
    .filter((child) => child.type === "text" || child.type === "cdata")
    .map((child) => (child.type === "cdata" ? child.value : decodeEntities(child.value)))
    .join("")
    .trim();
}

function elementToObject(node: Extract<XmlNode, { type: "element" }>, options: XmlJsonOptions): unknown {
  const kids = node.children.filter(meaningful);
  const hasAttributes = !options.ignoreAttributes && node.attrs.length > 0;
  const attributes = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [name, value] of node.attrs) {
      out[options.attributeNamePrefix + name] = decodeEntities(value);
    }
    return out;
  };

  if (kids.every((child) => !isElement(child))) {
    const text = elementText(node);
    if (!hasAttributes) return text;
    return { ...attributes(), [options.textPropertyName]: text };
  }

  const out: Record<string, unknown> = hasAttributes ? attributes() : {};
  for (const child of kids) {
    if (!isElement(child)) {
      const prior = out[options.textPropertyName];
      out[options.textPropertyName] = (typeof prior === "string" ? prior : "") + decodeEntities(child.value).trim();
      continue;
    }
    const value = elementToObject(child, options);
    if (child.name in out) {
      const existing = out[child.name];
      out[child.name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      out[child.name] = value;
    }
  }
  return out;
}

export function xmlToJson(
  text: string,
  options: XmlJsonOptions,
): { value: unknown; error: string | null } {
  let roots: XmlNode[];
  try {
    roots = parseXml(text);
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
  const root = roots.find(isElement);
  if (!root) return { value: null, error: "No root element found" };
  return { value: { [root.name]: elementToObject(root, options) }, error: null };
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return escapeText(String(value));
}

function childrenOf(
  record: Record<string, unknown>,
  options: XmlJsonOptions,
): [string, unknown][] {
  return Object.entries(record).filter(
    ([key]) => key !== options.textPropertyName && !key.startsWith(options.attributeNamePrefix),
  );
}

/** Write one element; an array value becomes sibling elements instead. */
function writeElement(name: string, value: unknown, depth: number, options: XmlJsonOptions, unit: string): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => writeElement(name, item, depth, options, unit));

  const pad = unit.repeat(depth);
  const attrs: string[] = [];
  if (!options.ignoreAttributes && value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith(options.attributeNamePrefix) && key !== options.textPropertyName) {
        const attr = key.slice(options.attributeNamePrefix.length);
        attrs.push(` ${attr}="${escapeText(scalar(item)).replace(/"/g, "&quot;")}"`);
      }
    }
  }
  const open = `${pad}<${name}${attrs.join("")}`;

  const text = scalar(value);
  if (value === null || typeof value !== "object") {
    if (text === "") return [`${open}/>`];
    return [`${open}>${text}</${name}>`];
  }

  const record = value as Record<string, unknown>;
  const inline = options.textPropertyName in record && childrenOf(record, options).length === 0;
  if (inline) {
    const inner = scalar(record[options.textPropertyName]);
    if (inner === "") return [`${open}/>`];
    return [`${open}>${inner}</${name}>`];
  }

  const lines: string[] = [];
  if (options.textPropertyName in record) {
    const inner = String(record[options.textPropertyName] ?? "");
    if (inner.trim() !== "") lines.push(`${unit.repeat(depth + 1)}${escapeText(inner)}`);
  }
  for (const [key, item] of childrenOf(record, options)) {
    lines.push(...writeElement(key, item, depth + 1, options, unit));
  }
  if (lines.length === 0) return [`${open}/>`];
  return [`${open}>`, ...lines, `${pad}</${name}>`];
}

export function jsonToXml(
  value: unknown,
  options: XmlJsonOptions,
  unit = "  ",
  declaration = true,
): { output: string; error: string | null } {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return { output: "", error: "The top level must be an object holding one element" };

  const elements = Object.entries(value as Record<string, unknown>).filter(
    ([key]) => !key.startsWith(options.attributeNamePrefix),
  );
  if (elements.length !== 1)
    return { output: "", error: `Expected exactly one root element, found ${elements.length}` };

  const parts: string[] = [];
  if (declaration) parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  const [name, body] = elements[0];
  parts.push(...writeElement(name, body, 0, options, unit));
  const output = parts.join("\n");
  // The document has to parse again, otherwise the JSON did not describe XML.
  try {
    parseXml(output);
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : String(err) };
  }
  return { output: `${output}\n`, error: null };
}
