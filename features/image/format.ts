export type ImageFormat = "png" | "jpeg" | "webp";

export const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export interface Encoded {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export function detectFormat(mime: string): ImageFormat | null {
  if (mime === "image/jpeg") return "jpeg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function decode(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export async function encode(
  source: ImageBitmap | HTMLCanvasElement,
  format: ImageFormat,
  quality: number,
  maxWidth?: number,
): Promise<Encoded> {
  const natural = { w: source.width, h: source.height };
  const scale = maxWidth && natural.w > maxWidth ? maxWidth / natural.w : 1;
  const width = Math.max(1, Math.round(natural.w * scale));
  const height = Math.max(1, Math.round(natural.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser");
  ctx.imageSmoothingQuality = "high";
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);

  const type = MIME[format];
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding produced no data"))),
      type,
      format === "png" ? undefined : quality,
    ),
  );
  const dataUrl = canvas.toDataURL(type, format === "png" ? undefined : quality);
  return { blob, dataUrl, width, height };
}

export function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export function parseDataUrl(text: string): { mime: string; bytes: Uint8Array } | null {
  const raw = text.trim();
  if (raw === "") return null;
  const match = /^data:([^;,]*)[;,]/i.exec(raw);
  const body = raw.slice((match?.index ?? 0) + (match?.[0].length ?? 0));
  const mime = (match?.[1] || "application/octet-stream").trim();
  const base64 = raw.includes(";base64")
    ? body
    : decodeURIComponent(body);
  const bin = atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, bytes };
}

export function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
