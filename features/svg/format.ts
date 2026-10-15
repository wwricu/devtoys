/**
 * SVG reading and rasterising. Markup is parsed as XML and rebuilt from a
 * whitelist, so a pasted file can never run code or load remote resources.
 */

export interface SvgRead {
  /** Sanitized markup, safe to put in the page */
  markup: string;
  error: string | null;
  width: number;
  height: number;
  /** Elements and attributes that were dropped */
  removed: number;
}

/** Tags that can execute script, fetch data, or embed other documents. */
const DROPPED_TAGS = new Set([
  "script",
  "foreignObject",
  "use",
  "image",
  "iframe",
  "embed",
  "object",
  "audio",
  "video",
  "switch",
  "prefetch",
  "handler",
  "set",
]);

const URL_ATTRS = new Set([
  "href",
  "xlink:href",
  "src",
  "action",
  "from",
  "to",
  "values",
]);

function isSafeUrl(value: string): boolean {
  const u = value.trim().toLowerCase();
  return (
    !/^(javascript|data|vbscript|file|http|https|ftp):/.test(u) ||
    u.startsWith("#")
  );
}

function localName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(colon + 1);
}

export function readSvg(text: string): SvgRead {
  const empty: SvgRead = {
    markup: "",
    error: null,
    width: 0,
    height: 0,
    removed: 0,
  };
  if (text.trim() === "") return empty;
  if (typeof DOMParser === "undefined") return empty;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, "image/svg+xml");
  } catch {
    return { ...empty, error: "Could not parse the SVG document" };
  }
  const failed = doc.querySelector("parsererror");
  if (failed)
    return {
      ...empty,
      error: "Not well-formed XML: " + failed.textContent?.slice(0, 120),
    };
  const root = doc.documentElement;
  if (localName(root.tagName) !== "svg")
    return {
      ...empty,
      error: `Expected an <svg> root element, found <${localName(root.tagName)}>`,
    };

  let removed = 0;
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (DROPPED_TAGS.has(localName(child.tagName))) {
        removed++;
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const short = localName(name);
        const event = name.startsWith("on");
        const remote = URL_ATTRS.has(short) && !isSafeUrl(attr.value);
        if (event || remote) {
          removed++;
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  };
  for (const attr of Array.from(root.attributes)) {
    if (
      localName(attr.name.toLowerCase()) === "onload" ||
      attr.name.toLowerCase().startsWith("on")
    ) {
      removed++;
      root.removeAttribute(attr.name);
    }
  }
  walk(root);

  const size = readSize(root);
  // Explicit pixel size keeps the preview and the PNG on the same geometry.
  root.setAttribute("width", String(size.width));
  root.setAttribute("height", String(size.height));
  const markup =
    typeof XMLSerializer === "undefined"
      ? root.outerHTML
      : new XMLSerializer().serializeToString(root);
  return { markup, error: null, ...size, removed };
}

function readSize(root: Element): { width: number; height: number } {
  const view = /[\s,]*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(
    root.getAttribute("viewBox") ?? "",
  );
  const num = (value: string | null) => {
    if (!value) return 0;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const width =
    num(root.getAttribute("width")) || (view ? Number(view[3]) : 0) || 300;
  const height =
    num(root.getAttribute("height")) || (view ? Number(view[4]) : 0) || 150;
  return { width, height };
}

/** Rasterise the sanitized markup through an image element and a canvas. */
export function svgToPng(
  markup: string,
  width: number,
  height: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
    );
    const image = new Image();
    const release = () => URL.revokeObjectURL(url);
    image.onerror = () => {
      release();
      reject(new Error("The browser could not load this SVG"));
    };
    image.onload = () => {
      release();
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is unavailable"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode the PNG"));
      }, "image/png");
    };
    image.src = url;
  });
}
