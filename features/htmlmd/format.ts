/**
 * HTML to Markdown. Reads markup with DOMParser and walks the tree, so
 * malformed input becomes text instead of running scripts; nothing is ever
 * inserted back into the page.
 */

export interface MarkdownOptions {
  /** Heading underline style for h1/h2 */
  setext: boolean;
  /** Keep raw HTML for blocks Markdown cannot express */
  keepTables: boolean;
}

const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul",
]);

const SKIP = new Set(["script", "style", "noscript", "template", "head", "meta", "link", "title"]);

function escapeText(value: string): string {
  return value
    .replace(/([\\`*_[]])/g, "\\$1")
    .replace(/]/g, "\\]")
    .replace(/^([ \t]*(?:#|>|[-+*]|\d{1,9}\.))(?=\s)/gm, "\\$1");
}

function inline(node: Node): string {
  if (node.nodeType === 3) return escapeText(node.textContent ?? "");
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (SKIP.has(tag)) return "";
  const kids = () => [...el.childNodes].map(inline).join("");
  const text = () => kids().trim();

  switch (tag) {
    case "br":
      return "  \n";
    case "strong":
    case "b":
      return text() ? `**${text()}**` : "";
    case "em":
    case "i":
      return text() ? `_${text()}_` : "";
    case "del":
    case "s":
    case "strike":
      return text() ? `~~${text()}~~` : "";
    case "code":
    case "kbd":
    case "samp": {
      const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!raw) return "";
      const fence = raw.includes("`") ? "``" : "`";
      const pad = raw.startsWith("`") || raw.endsWith("`") ? " " : "";
      return `${fence}${pad}${raw}${pad}${fence}`;
    }
    case "a": {
      const href = el.getAttribute("href");
      const label = text() || href || "";
      if (!href) return label;
      const title = el.getAttribute("title");
      return `[${label}](${href}${title ? ` "${title}"` : ""})`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      const title = el.getAttribute("title");
      return src ? `![${alt}](${src}${title ? ` "${title}"` : ""})` : "";
    }
    case "input": {
      const type = (el.getAttribute("type") ?? "").toLowerCase();
      if (type === "checkbox")
        return `[${el.hasAttribute("checked") ? "x" : " "}] ${el.getAttribute("value") ?? ""}`.trim();
      return el.getAttribute("value") ?? "";
    }
    case "sub":
      return `~${text()}~`;
    case "sup":
      return `^${text()}^`;
    case "hr":
      return "\n---\n";
    default:
      return kids();
  }
}

function rows(table: Element): string[][] {
  const out: string[][] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells = [...tr.children]
      .filter((cell) => /^(td|th)$/i.test(cell.tagName))
      .map((cell) => cellInline(cell));
    if (cells.length) out.push(cells);
  }
  return out;
}

function cellInline(cell: Element): string {
  const text = [...cell.childNodes].map(inline).join("").replace(/\s+/g, " ").trim();
  return text.replace(/\|/g, "\\|");
}

function tableMarkdown(table: Element): string {
  const grid = rows(table);
  if (grid.length === 0) return "";
  const width = Math.max(...grid.map((row) => row.length));
  const pad = (row: string[]) => [...row, ...Array(Math.max(0, width - row.length)).fill("")];
  const head = pad(grid[0]);
  const lines = [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
  ];
  for (const row of grid.slice(1)) lines.push(`| ${pad(row).join(" | ")} |`);
  return lines.join("\n");
}

function block(node: Node, options: MarkdownOptions): string {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").trim();
    return text ? escapeText(text) : "";
  }
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (SKIP.has(tag)) return "";

  const children = () => [...el.childNodes].map((child) => convert(child, options)).join("\n");
  const inlineText = () => [...el.childNodes].map(inline).join("").trim();

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Number(tag[1]);
      const text = inlineText();
      if (options.setext && level <= 2 && !/`/.test(text))
        return `${text}\n${(level === 1 ? "=" : "-").repeat(Math.max(3, text.length))}`;
      return `${"#".repeat(level)} ${text}`;
    }
    case "p":
      return inlineText();
    case "blockquote": {
      const inner = [...el.childNodes]
        .map((child) => convert(child, options))
        .filter((part) => part.trim() !== "")
        .join("\n\n");
      return inner
        .split("\n")
        .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
        .join("\n");
    }
    case "pre": {
      const code = el.querySelector("code");
      const language = code ? /language-([\w-]+)/.exec(code.className)?.[1] : undefined;
      const raw = (code ?? el).textContent ?? "";
      return "```" + (language ?? "") + "\n" + raw.replace(/\n$/, "") + "\n```";
    }
    case "ul":
    case "ol": {
      const ordered = tag === "ol";
      const start = Number(el.getAttribute("start") ?? "1") || 1;
      const items = [...el.children].filter((item) => item.tagName.toLowerCase() === "li");
      return items
        .map((item, index) => {
          const body = [...item.childNodes]
            .map((child) => convert(child, options))
            .join("\n")
            .trim();
          const marker = ordered ? `${start + index}. ` : "- ";
          const lines = body.split("\n");
          return marker + lines.join("\n" + " ".repeat(marker.length));
        })
        .join("\n");
    }
    case "hr":
      return "---";
    case "table":
      return options.keepTables ? tableMarkdown(el) : el.outerHTML;
    default:
      if (BLOCK.has(tag)) return children();
      return inlineText();
  }
}

function convert(node: Node, options: MarkdownOptions): string {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").trim();
    return text ? escapeText(text) : "";
  }
  if (node.nodeType === 1) {
    const tag = (node as Element).tagName.toLowerCase();
    return BLOCK.has(tag) || tag === "table" ? block(node, options) : inline(node).trim();
  }
  return "";
}

export function htmlToMarkdown(html: string, options: MarkdownOptions): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  const parts: string[] = [];
  for (const child of [...body.childNodes]) {
    const out = convert(child, options).trim();
    if (out !== "") parts.push(out);
  }
  return parts
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
