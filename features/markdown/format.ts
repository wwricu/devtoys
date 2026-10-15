/**
 * A compact, dependency-free Markdown → HTML converter.
 * All text is HTML-escaped first and only whitelisted tags are generated,
 * so the output is safe to preview with dangerouslySetInnerHTML.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s: string) => s.replace(/"/g, "&quot;");

function sanitizeUrl(url: string): string {
  const u = url.trim();
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u)?.[1]?.toLowerCase();
  if (scheme && !["http", "https", "mailto", "tel", "ftp"].includes(scheme))
    return "#";
  return u;
}

function inline(raw: string): string {
  const codes: string[] = [];
  let text = raw.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  text = esc(text);
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;|\s+"[^"]*")?\)/g,
    (_m, alt, src) =>
      `<img alt="${attr(alt)}" src="${attr(sanitizeUrl(src))}" />`
  );
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;|\s+"[^"]*")?\)/g,
    (_m, t, href) => `<a href="${attr(sanitizeUrl(href))}">${t}</a>`
  );
  text = text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  text = text.replace(
    /\u0000(\d+)\u0000/g,
    (_m, i) => `<code>${esc(codes[Number(i)])}</code>`
  );
  return text;
}

const isBullet = (l: string) => /^\s*[-*+]\s+/.test(l);
const isOrdered = (l: string) => /^\s*\d+[.)]\s+/.test(l);
const indentOf = (l: string) => /^\s*/.exec(l)![0].replace(/\t/g, "    ").length;

function parseList(lines: string[], i: number): [string, number] {
  const ordered = isOrdered(lines[i]);
  const baseIndent = indentOf(lines[i]);
  let html = ordered ? "<ol>" : "<ul>";
  while (i < lines.length) {
    const line = lines[i];
    const match = ordered ? /^\s*\d+[.)]\s+(.*)$/.exec(line) : /^\s*[-*+]\s+(.*)$/.exec(line);
    if (!match || indentOf(line) < baseIndent) break;
    if (indentOf(line) > baseIndent) {
      // nested list handled by recursion below; here we keep flat
      break;
    }
    // gather nested items
    const itemText = match[1];
    let nested = "";
    if (i + 1 < lines.length && indentOf(lines[i + 1]) > baseIndent) {
      const [sub, ni] = collectList(lines, i + 1, indentOf(lines[i + 1]));
      nested = sub;
      i = ni;
      html += `<li>${inline(itemText)}${nested}</li>`;
      continue;
    }
    html += `<li>${inline(itemText)}</li>`;
    i++;
  }
  html += ordered ? "</ol>" : "</ul>";
  return [html, i];
}

function collectList(
  lines: string[],
  i: number,
  indent: number
): [string, number] {
  const sub = lines.slice();
  // dedent lines belonging to this nested block
  const block: string[] = [];
  while (i < sub.length && (indentOf(sub[i]) >= indent) && (isBullet(sub[i]) || isOrdered(sub[i]))) {
    block.push(sub[i].slice(indent));
    i++;
  }
  const [html] = parseList(block, 0);
  return [html, i];
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    // fenced code
    const fence = /^\s*(```|~~~)(.*)$/.exec(line);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2].trim().split(/\s+/)[0];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const cls = lang ? ` class="language-${attr(lang)}"` : "";
      html += `<pre><code${cls}>${esc(buf.join("\n"))}\n</code></pre>\n`;
      continue;
    }
    // heading
    const head = /^(#{1,6})\s+(.*)$/.exec(line);
    if (head) {
      const level = head[1].length;
      html += `<h${level}>${inline(head[2].replace(/\s+#+\s*$/, ""))}</h${level}>\n`;
      i++;
      continue;
    }
    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html += "<hr />\n";
      i++;
      continue;
    }
    // blockquote
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      html += `<blockquote>\n${markdownToHtml(buf.join("\n"))}</blockquote>\n`;
      continue;
    }
    // table
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const parseRow = (l: string) =>
        l
          .replace(/^\s*\|/, "")
          .replace(/\|\s*$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = parseRow(line);
      const align = parseRow(lines[i + 1]).map((c) =>
        c.startsWith(":") && c.endsWith(":")
          ? "center"
          : c.endsWith(":")
            ? "right"
            : "left"
      );
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      let t = "<table>\n<thead>\n<tr>";
      header.forEach((h, k) => {
        t += `<th style="text-align:${align[k] ?? "left"}">${inline(h)}</th>`;
      });
      t += "</tr>\n</thead>\n<tbody>\n";
      for (const r of rows) {
        t += "<tr>";
        r.forEach((c, k) => {
          t += `<td style="text-align:${align[k] ?? "left"}">${inline(c)}</td>`;
        });
        t += "</tr>\n";
      }
      t += "</tbody>\n</table>\n";
      html += t;
      continue;
    }
    // lists
    if (isBullet(line) || isOrdered(line)) {
      const [listHtml, ni] = parseList(lines, i);
      html += listHtml + "\n";
      i = ni;
      continue;
    }
    // paragraph
    const buf: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*(#{1,6}\s|>|```|~~~|[-*+]\s|\d+[.)]\s)/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    html += `<p>${inline(buf.join("\n")).replace(/\n/g, "<br />\n")}</p>\n`;
  }
  return html;
}

const ALLOWED_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6", "P", "BR", "HR", "UL", "OL", "LI",
  "STRONG", "EM", "DEL", "CODE", "PRE", "BLOCKQUOTE", "A", "IMG", "TABLE",
  "THEAD", "TBODY", "TR", "TH", "TD", "SPAN",
]);

function isSafeUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return !/^(javascript|data|vbscript|file):/.test(u);
}

/**
 * Defense-in-depth sanitizer for the live preview: parses the generated HTML
 * (DOMParser does not execute scripts or load resources) and keeps only
 * whitelisted tags and safe attributes.
 */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html"
  );
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }
      for (const a of Array.from(child.attributes)) {
        const name = a.name.toLowerCase();
        const isTextAlign = /^text-align:\s*(left|right|center);?$/.test(
          a.value
        );
        const keep =
          (child.tagName === "A" && name === "href" && isSafeUrl(a.value)) ||
          (child.tagName === "IMG" &&
            (name === "src" ? isSafeUrl(a.value) : name === "alt")) ||
          ((child.tagName === "TH" || child.tagName === "TD") &&
            name === "style" &&
            isTextAlign) ||
          ((child.tagName === "CODE" || child.tagName === "PRE") &&
            name === "class");
        if (!keep) child.removeAttribute(a.name);
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
