"use client";

import { useEffect, useRef, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  decode,
  encode,
  sizeOf,
  type Encoded,
  type ImageFormat,
} from "./format";
import { strings } from "./locale";

const formatOptions: { value: ImageFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

interface DecodeState {
  /** the file this result belongs to, so stale results are ignored */
  from: File;
  bitmap: ImageBitmap | null;
  error: string | null;
}

interface EncodeState {
  from: ImageBitmap;
  key: string;
  result: Encoded | null;
  error: string | null;
}

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export default function ImageConverter() {
  const L = useText(strings);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const [decodeState, setDecodeState] = useState<DecodeState | null>(null);
  const [encodeState, setEncodeState] = useState<EncodeState | null>(null);
  const [format, setFormat] = useStoredState<ImageFormat>(
    "image.format",
    "webp",
  );
  const [quality, setQuality] = useStoredState<number>("image.quality", 0.82);
  const [maxWidth, setMaxWidth] = useStoredState<number>("image.maxWidth", 0);
  const pickRef = useRef<HTMLInputElement>(null);

  const choose = (picked: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(picked);
    setSourceUrl(urlRef.current);
    setFile(picked);
  };

  const encodeKey = `${format}|${quality}|${maxWidth}`;

  useEffect(() => {
    if (!file) return;
    let alive = true;
    decode(file)
      .then((bitmap) => {
        if (alive) setDecodeState({ from: file, bitmap, error: null });
      })
      .catch((err: unknown) => {
        if (alive)
          setDecodeState({ from: file, bitmap: null, error: message(err) });
      });
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    if (!decodeState || decodeState.from !== file) return;
    const bitmap = decodeState.bitmap;
    if (!bitmap) return;
    let alive = true;
    encode(bitmap, format, quality, maxWidth > 0 ? maxWidth : undefined)
      .then((res) => {
        if (alive)
          setEncodeState({
            from: bitmap,
            key: encodeKey,
            result: res,
            error: null,
          });
      })
      .catch((err: unknown) => {
        if (alive)
          setEncodeState({
            from: bitmap,
            key: encodeKey,
            result: null,
            error: message(err),
          });
      });
    return () => {
      alive = false;
    };
  }, [decodeState, file, format, quality, maxWidth, encodeKey]);

  // Anything computed from an older file or older options is ignored.
  const currentDecode =
    decodeState && decodeState.from === file ? decodeState : null;
  const bitmap = currentDecode?.bitmap ?? null;
  const currentEncode =
    bitmap &&
    encodeState &&
    encodeState.from === bitmap &&
    encodeState.key === encodeKey
      ? encodeState
      : null;
  const result = currentEncode?.result ?? null;
  const error = currentDecode?.error ?? currentEncode?.error ?? null;

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
        <ToolButton onClick={() => pickRef.current?.click()}>
          {L.chooseImage}
        </ToolButton>
        <Segmented
          value={format}
          options={formatOptions}
          onChange={setFormat}
          ariaLabel={L.targetFormat}
        />
        {format !== "png" && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            {L.quality}
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
          {L.maxWidth}
          <input
            type="number"
            className="w-20 rounded border border-neutral-300 bg-white px-1.5 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            value={maxWidth}
            min={0}
            onChange={(e) => setMaxWidth(Number(e.target.value) || 0)}
          />
          {L.maxWidthUnit}
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
        <Panel title={L.source}>
          {file ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceUrl ?? ""}
                alt={L.altSource}
                className="max-h-64 max-w-full object-contain"
              />
              <p className="text-xs text-neutral-500">
                {bitmap
                  ? fill(L.sourceInfoRes, {
                      name: file.name,
                      size: sizeOf(file.size),
                      dimensions: fill(L.dimensions, {
                        width: bitmap.width,
                        height: bitmap.height,
                      }),
                    })
                  : fill(L.sourceInfo, {
                      name: file.name,
                      size: sizeOf(file.size),
                    })}
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">{L.dropHint}</p>
          )}
        </Panel>

        <Panel
          title={L.converted}
          actions={
            result ? (
              <>
                <CopyButton getText={() => result.dataUrl} />
                <ToolButton onClick={download}>{L.download}</ToolButton>
              </>
            ) : undefined
          }
        >
          {result ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.dataUrl}
                alt={L.altConverted}
                className="max-h-64 max-w-full object-contain"
              />
              <p className="text-xs text-neutral-500">
                {fill(L.convertedInfo, {
                  width: result.width,
                  height: result.height,
                  size: sizeOf(result.blob.size),
                })}
                {file
                  ? ` ${fill(L.ofSource, {
                      percent: Math.round((result.blob.size / file.size) * 100),
                    })}`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">{L.resultHint}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
