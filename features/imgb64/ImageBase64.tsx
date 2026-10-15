"use client";

import { useMemo, useRef, useState } from "react";
import { CopyButton, Panel, Segmented, ToolButton, editorClass, useStoredState } from "@/components/kit";
import { decodeImageText, readAsDataUrl, sizeOf, type DecodedImage } from "./format";

type Direction = "toBase64" | "fromBase64";

const directionOptions: { value: Direction; label: string }[] = [
  { value: "toBase64", label: "Image to Base64" },
  { value: "fromBase64", label: "Base64 to Image" },
];

export default function ImageBase64() {
  const [direction, setDirection] = useStoredState<Direction>("imgb64.direction", "toBase64");
  const [withPrefix, setWithPrefix] = useStoredState("imgb64.prefix", true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const load = (picked: File) => {
    setError(null);
    readAsDataUrl(picked)
      .then((uri) => {
        setPreview(uri);
        setText(withPrefix ? uri : (uri.split(",")[1] ?? ""));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };

  const decoded = useMemo<{ image: DecodedImage | null; message: string }>(
    () => {
      if (direction !== "fromBase64" || text.trim() === "")
        return { image: null, message: "" };
      const result = decodeImageText(text);
      return typeof result === "string"
        ? { image: null, message: result }
        : { image: result, message: "" };
    },
    [direction, text],
  );

  const isImage = decoded.image ? decoded.image.mime.startsWith("image/") : false;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          options={directionOptions}
          onChange={setDirection}
          ariaLabel="Direction"
        />
        {direction === "toBase64" && (
          <>
            <input
              ref={pickRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked) load(picked);
              }}
            />
            <ToolButton onClick={() => pickRef.current?.click()}>Choose image</ToolButton>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={withPrefix}
                onChange={(e) => {
                  setWithPrefix(e.target.checked);
                  if (file) load(file);
                }}
              />
              Include the data URI prefix
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        {direction === "toBase64" ? (
          <>
            <Panel title="Source">
              {file ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview ?? ""} alt="source" className="max-h-56 max-w-full object-contain" />
                  <p className="text-xs text-neutral-500">
                    {file.name} - {sizeOf(file.size)} - {file.type || "unknown type"}
                  </p>
                </div>
              ) : (
                <p className="p-3 text-xs text-neutral-400">
                  Choose an image to encode. The file never leaves the browser.
                </p>
              )}
            </Panel>
            <Panel
              title="Base64"
              actions={
                <>
                  <ToolButton
                    onClick={() => {
                      if (file) load(file);
                    }}
                  >
                    Re-encode
                  </ToolButton>
                  <CopyButton getText={() => text} />
                </>
              }
            >
              <textarea
                className={editorClass}
                spellCheck={false}
                readOnly
                value={text}
                placeholder="Base64 text"
              />
            </Panel>
          </>
        ) : (
          <>
            <Panel
              title="Base64 or data URI"
              actions={
                <>
                  <ToolButton onClick={() => setText("")}>Clear</ToolButton>
                  <CopyButton getText={() => text} />
                </>
              }
            >
              <textarea
                className={editorClass}
                spellCheck={false}
                placeholder="Paste a data URI or raw Base64…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Panel>
            <Panel
              title="Preview"
              actions={
                decoded.image && isImage ? (
                  <a
                    href={decoded.image.uri}
                    download={`image.${decoded.image.mime.split("/")[1] ?? "bin"}`}
                    className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    Download
                  </a>
                ) : undefined
              }
            >
              {decoded.image && isImage ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={decoded.image.uri} alt="decoded" className="max-h-56 max-w-full object-contain" />
                  <p className="text-xs text-neutral-500">
                    {decoded.image.mime} - {sizeOf(decoded.image.bytes.length)}
                  </p>
                </div>
              ) : (
                <p className="p-3 text-xs text-neutral-400">
                  {decoded.message || "Image preview appears here."}
                </p>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
