/**
 * Base64 to bytes, and bytes to a file type. The type comes from the leading
 * bytes (magic numbers) because a data URI prefix is often wrong or missing;
 * the declared prefix is still reported when it disagrees.
 */

export interface FileKind {
  mime: string;
  ext: string;
  /** what the format is, for the status read-out */
  label: string;
}

export type Preview = "image" | "audio" | "video" | "pdf" | "text" | "none";

export interface DecodedFile {
  bytes: Uint8Array<ArrayBuffer>;
  kind: FileKind;
  /** mime asserted by a data URI prefix, when it differs from the sniffed one */
  declared: string;
  text: string | null;
  preview: Preview;
  truncated: boolean;
}

export const MAX_BYTES = 32 * 1024 * 1024;
/** Only the head of a text payload is decoded, just enough to show a preview. */
const PREVIEW_BYTES = 64 * 1024;

const octet = (label: string, ext = "bin"): FileKind => ({
  mime: "application/octet-stream",
  ext,
  label,
});

const head = (bytes: Uint8Array, at: number, values: number[]): boolean => {
  if (bytes.length < at + values.length) return false;
  return values.every((v, i) => bytes[at + i] === v);
};

const ascii = (bytes: Uint8Array, at: number, length: number): string =>
  bytes.length < at + length
    ? ""
    : String.fromCharCode(...bytes.subarray(at, at + length));

const hasText = (bytes: Uint8Array, needle: string, span: number): boolean => {
  const window = ascii(bytes, 0, Math.min(span, bytes.length)).toLowerCase();
  return window.includes(needle.toLowerCase());
};

/** `PK\x03\x04` only says "zip container"; the first entries say which one. */
function fromZip(bytes: Uint8Array): FileKind {
  if (hasText(bytes, "mimetypeapplication/epub+zip", 512))
    return { mime: "application/epub+zip", ext: "epub", label: "eBook (EPUB)" };
  if (hasText(bytes, "word/", 1024))
    return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx", label: "Word document" };
  if (hasText(bytes, "xl/workbook", 1024))
    return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx", label: "Excel workbook" };
  if (hasText(bytes, "ppt/", 1024))
    return { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx", label: "PowerPoint deck" };
  if (hasText(bytes, "androidmanifest.xml", 2048))
    return { mime: "application/vnd.android.package-archive", ext: "apk", label: "Android package" };
  if (hasText(bytes, "meta-inf/manifest.mf", 2048))
    return { mime: "application/java-archive", ext: "jar", label: "Java archive" };
  if (hasText(bytes, "opendocument", 512))
    return { mime: "application/vnd.oasis.opendocument.text", ext: "odt", label: "OpenDocument" };
  return { mime: "application/zip", ext: "zip", label: "ZIP archive" };
}

/** ISO base media files carry a brand after the `ftyp` marker. */
function fromBoxed(bytes: Uint8Array): FileKind {
  const brand = ascii(bytes, 8, 4);
  if (brand === "M4A " || brand === "m4a ")
    return { mime: "audio/mp4", ext: "m4a", label: "AAC audio" };
  if (brand === "qt  ")
    return { mime: "video/quicktime", ext: "mov", label: "QuickTime video" };
  if (hasText(bytes, "3gp", 12))
    return { mime: "video/3gpp", ext: "3gp", label: "3GPP video" };
  return { mime: "video/mp4", ext: "mp4", label: "MP4 video" };
}

const PNG = { mime: "image/png", ext: "png", label: "PNG image" };
const JPEG = { mime: "image/jpeg", ext: "jpg", label: "JPEG image" };

export function sniff(bytes: Uint8Array): FileKind {
  if (head(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return PNG;
  if (head(bytes, 0, [0xff, 0xd8, 0xff])) return JPEG;
  if (head(bytes, 0, [0x47, 0x49, 0x46, 0x38]))
    return { mime: "image/gif", ext: "gif", label: "GIF image" };
  if (head(bytes, 0, [0x42, 0x4d]))
    return { mime: "image/bmp", ext: "bmp", label: "Bitmap image" };
  if (head(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && head(bytes, 8, [0x57, 0x45, 0x42, 0x50]))
    return { mime: "image/webp", ext: "webp", label: "WebP image" };
  if (head(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && head(bytes, 8, [0x41, 0x56, 0x49, 0x20]))
    return { mime: "video/avi", ext: "avi", label: "AVI video" };
  if (head(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && head(bytes, 8, [0x57, 0x41, 0x56, 0x45]))
    return { mime: "audio/wav", ext: "wav", label: "WAV audio" };
  if (head(bytes, 0, [0x00, 0x00, 0x01, 0x00]))
    return { mime: "image/x-icon", ext: "ico", label: "Windows icon" };
  if (head(bytes, 0, [0x49, 0x49, 0x2a, 0x00]) || head(bytes, 0, [0x4d, 0x4d, 0x00, 0x2a]))
    return { mime: "image/tiff", ext: "tif", label: "TIFF image" };
  if (head(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3]))
    return hasText(bytes, "webm", 64)
      ? { mime: "video/webm", ext: "webm", label: "WebM video" }
      : { mime: "video/x-matroska", ext: "mkv", label: "Matroska video" };
  if (head(bytes, 0, [0x4f, 0x67, 0x67, 0x53]))
    return { mime: "audio/ogg", ext: "ogg", label: "Ogg audio" };
  if (head(bytes, 0, [0x46, 0x4c, 0x41, 0x43]))
    return { mime: "audio/flac", ext: "flac", label: "FLAC audio" };
  if (head(bytes, 0, [0x49, 0x44, 0x33]) || head(bytes, 0, [0xff, 0xfb]) || head(bytes, 0, [0xff, 0xf3]))
    return { mime: "audio/mpeg", ext: "mp3", label: "MP3 audio" };
  if (ascii(bytes, 4, 4) === "ftyp") return fromBoxed(bytes);
  if (head(bytes, 0, [0x25, 0x50, 0x44, 0x46]))
    return { mime: "application/pdf", ext: "pdf", label: "PDF document" };
  if (head(bytes, 0, [0x7b, 0x5c, 0x72, 0x74, 0x66]))
    return { mime: "application/rtf", ext: "rtf", label: "Rich Text" };
  if (head(bytes, 0, [0x50, 0x4b, 0x03, 0x04]) || head(bytes, 0, [0x50, 0x4b, 0x05, 0x06]))
    return fromZip(bytes);
  if (head(bytes, 0, [0x1f, 0x8b]))
    return { mime: "application/gzip", ext: "gz", label: "Gzip stream" };
  if (head(bytes, 0, [0x42, 0x5a, 0x68]))
    return { mime: "application/x-bzip2", ext: "bz2", label: "Bzip2 archive" };
  if (head(bytes, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]))
    return { mime: "application/x-xz", ext: "xz", label: "XZ archive" };
  if (head(bytes, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))
    return { mime: "application/x-7z-compressed", ext: "7z", label: "7-Zip archive" };
  if (head(bytes, 0, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]))
    return { mime: "application/vnd.rar", ext: "rar", label: "WinRAR archive" };
  if (ascii(bytes, 257, 5) === "ustar")
    return { mime: "application/x-tar", ext: "tar", label: "Tape archive" };
  if (head(bytes, 0, [0xca, 0xfe, 0xba, 0xbe]))
    return { mime: "application/java-vm", ext: "class", label: "Java class file" };
  if (head(bytes, 0, [0x00, 0x61, 0x73, 0x6d]))
    return { mime: "application/wasm", ext: "wasm", label: "WebAssembly" };
  if (head(bytes, 0, [0x64, 0x65, 0x78, 0x0a]))
    return { mime: "application/vnd.android.dex", ext: "dex", label: "Android dex" };
  if (ascii(bytes, 0, 16) === "SQLite format 3\u0000")
    return { mime: "application/x-sqlite3", ext: "sqlite", label: "SQLite database" };
  if (head(bytes, 0, [0x7f, 0x45, 0x4c, 0x46]))
    return octet("ELF binary", "elf");
  if (head(bytes, 0, [0x4d, 0x5a]))
    return { mime: "application/x-msdownload", ext: "exe", label: "Windows executable" };
  if (head(bytes, 0, [0x77, 0x4f, 0x46, 0x46]))
    return { mime: "font/woff", ext: "woff", label: "Web Open Font" };
  if (head(bytes, 0, [0x77, 0x4f, 0x46, 0x32]))
    return { mime: "font/woff2", ext: "woff2", label: "Web Open Font 2" };
  if (head(bytes, 0, [0x4f, 0x54, 0x54, 0x4f]))
    return { mime: "font/otf", ext: "otf", label: "OpenType font" };
  if (head(bytes, 0, [0x00, 0x01, 0x00, 0x00]))
    return { mime: "font/ttf", ext: "ttf", label: "TrueType font" };
  return octet("Unknown binary");
}

/** Strict UTF-8, so a binary payload never ends up as mojibake in the preview. */
function asText(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    let control = 0;
    for (let i = 0; i < Math.min(text.length, 4096); i++) {
      const code = text.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) control++;
    }
    if (control > 4) return null;
    return text;
  } catch {
    return null;
  }
}

const textKind = (text: string): FileKind => {
  const lead = text.trimStart().slice(0, 20).toLowerCase();
  if (lead.startsWith("{") || lead.startsWith("["))
    return { mime: "application/json", ext: "json", label: "JSON text" };
  if (lead.startsWith("<!doctype html") || lead.startsWith("<html"))
    return { mime: "text/html", ext: "html", label: "HTML document" };
  if (lead.startsWith("<?xml") || lead.startsWith("<svg"))
    return { mime: "application/xml", ext: "xml", label: "XML document" };
  if (lead.startsWith("begin:vcal"))
    return { mime: "text/vcard", ext: "vcf", label: "vCard" };
  if (lead.startsWith("diff --git") || lead.startsWith("@@"))
    return { mime: "text/x-diff", ext: "patch", label: "Git patch" };
  return { mime: "text/plain", ext: "txt", label: "Plain text" };
};

/** Extensions worth knowing for a mime that only a data URI declared. */
const EXT_BY_MIME: Record<string, string> = {
  "text/plain": "txt", "text/html": "html", "text/css": "css", "text/csv": "csv",
  "text/xml": "xml", "text/javascript": "js", "text/markdown": "md",
  "text/yaml": "yaml", "text/vcard": "vcf",
  "application/json": "json", "application/xml": "xml", "application/pdf": "pdf",
  "application/zip": "zip", "application/gzip": "gz", "application/wasm": "wasm",
  "application/x-tar": "tar", "application/java-vm": "class",
  "application/javascript": "js", "application/x-yaml": "yaml",
  "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg",
  "image/gif": "gif", "image/webp": "webp", "image/avif": "avif",
  "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/flac": "flac",
  "audio/wav": "wav", "audio/mp4": "m4a",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "font/woff": "woff", "font/woff2": "woff2", "font/ttf": "ttf", "font/otf": "otf",
};

function declaredKind(mime: string): FileKind {
  const clean = (mime.split(";")[0] ?? "").trim().toLowerCase();
  const sub = clean.split("/")[1]?.split("+")[0]?.replace(/[^a-z0-9.]/g, "") ?? "";
  return {
    mime: clean,
    ext: EXT_BY_MIME[clean] ?? (sub === "" ? "bin" : sub),
    label: `Declared as ${clean}`,
  };
}

function previewFor(kind: FileKind, text: string | null): Preview {
  if (kind.mime.startsWith("image/")) return "image";
  if (kind.mime.startsWith("audio/")) return "audio";
  if (kind.mime.startsWith("video/")) return "video";
  if (kind.mime === "application/pdf") return "pdf";
  const textual =
    kind.mime.startsWith("text/") ||
    kind.mime === "application/json" ||
    kind.mime === "application/xml" ||
    /\+(?:json|xml)$/.test(kind.mime);
  return textual && text !== null ? "text" : "none";
}

export type DecodeFailure = { error: string };
export type DecodeSuccess = { file: DecodedFile };

/**
 * Accepts raw Base64 (line wrapping and URL-safe alphabets included) or a
 * `data:` URI. The bytes decide the type unless only a prefix declares one.
 */
export function decodeToBytes(input: string): DecodeSuccess | DecodeFailure {
  const raw = input.trim();
  if (raw === "") return { error: "Nothing to decode" };

  let declared = "";
  let body = raw;
  let isText = false;
  if (raw.startsWith("data:")) {
    const comma = raw.indexOf(",");
    if (comma < 0) return { error: "The data URI has no comma" };
    const header = raw.slice(5, comma);
    body = raw.slice(comma + 1);
    declared = header.split(";")[0].trim();
    isText = !/;base64/i.test(header);
  }

  let bytes: Uint8Array<ArrayBuffer>;
  if (isText) {
    const text = decodeURIComponent(body.replace(/\s+/g, ""));
    bytes = Uint8Array.from(new TextEncoder().encode(text));
  } else {
    let clean = body.replace(/\s+/g, "");
    if (/[-_]/.test(clean) && !/[+/]/.test(clean))
      clean = clean.replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean))
      return { error: "Not valid Base64 text" };
    const pad = clean.length % 4;
    if (pad === 1) return { error: "Not valid Base64 text" };
    if (pad > 0) clean += "=".repeat(4 - pad);
    if (clean.length / 4 * 3 > MAX_BYTES)
      return { error: `Larger than the ${Math.round(MAX_BYTES / 1048576)} MB browser limit` };
    const binary = atob(clean);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  }

  let kind = sniff(bytes);
  const head = asText(bytes.subarray(0, PREVIEW_BYTES));
  if (kind.mime === "application/octet-stream") {
    if (head !== null) kind = textKind(head);
    else if (declared) kind = declaredKind(declared);
  }
  return {
    file: {
      bytes,
      kind,
      declared: declared !== "" && declared !== kind.mime ? declared : "",
      text: head,
      preview: previewFor(kind, head),
      truncated: head !== null && bytes.length > PREVIEW_BYTES,
    },
  };
}
