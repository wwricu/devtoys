"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton, Panel, Segmented, ToolButton, useStoredState } from "@/components/kit";
import {
  decode,
  encode,
  sizeOf,
  type Encoded,
  type ImageFormat,
} from "./format";

const formatOptions: { value: ImageFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

export default function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [result, setResult] = useState<Encoded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useStoredState<ImageFormat>("image.format", "webp");
  const [quality, setQuality] = useStoredState<number>("image.quality", 0.82);
  const [maxWidth, setMaxWidth] = useStoredState<number>("image.maxWidth", 0);
  const pickRef = useRef<HTMLInputElement>(null);

  const choose = (picked: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(picked);
    setSourceUrl(urlRef.current);
    setFile(picked);
  };

  useEffect(() => {
    if (!file) {
      setBitmap(null);
      return;
    }
    let alive = true;
    decode(file)
      .then((b) => {
        if (alive) {
          setBitmap(b);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    if (!bitmap) {
      setResult(null);
      return;
    }
    let alive = true;
    encode(bitmap, format, quality, maxWidth > 0 ? maxWidth : undefined)
      .then((r) => {
        if (alive) {
          setResult(r);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [bitmap, format, quality, maxWidth]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) choose(dropped);
  };

  const download = () => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, "") || "image"}.${format === "jpeg" ? "jpg" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={pickRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) choose(picked);
          }}
        />
        <ToolButton onClick={() => pickRef.current?.click()}>Choose image</ToolButton>
        <Segmented value={format} options={formatOptions} onChange={setFormat} ariaLabel="Target format" />
        {format !== "png" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            Quality
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            {Math.round(quality * 100)}%
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          Max width
          <input
            type="number"
            className="w-20 rounded border border-neutral-300 bg-white px-1.5 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            value={maxWidth}
            min={0}
            onChange={(e) => setMaxWidth(Number(e.target.value) || 0)}
          />
          px (0 = keep)
        </label>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <Panel title="Source">
          {file ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceUrl ?? ""}
                alt="source preview"
                className="max-h-64 max-w-full object-contain"
              />
              <p className="text-xs text-neutral-500">
                {file.name} - {sizeOf(file.size)}
                {bitmap ? ` - ${bitmap.width}x${bitmap.height}` : ""}
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">
              Drop an image here or choose one. Nothing is uploaded; everything runs locally.
            </p>
          )}
        </Panel>

        <Panel
          title="Converted"
          actions={
            result ? (
              <>
                <CopyButton getText={() => result.dataUrl} />
                <ToolButton onClick={download}>Download</ToolButton>
              </>
            ) : undefined
          }
        >
          {result ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
              <img
                src={result.dataUrl}
                alt="converted preview"
                className="max-h-64 max-w-full object-contain"
              />
              <p className="text-xs text-neutral-500">
                {result.width}x{result.height} - {sizeOf(result.blob.size)}
                {file ? ` (${Math.round((result.blob.size / file.size) * 100)}% of source)` : ""}
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">Result appears here.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
