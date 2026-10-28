"use client";

import { useMemo, useRef, useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  decodeImageText,
  readAsDataUrl,
  sizeOf,
  type DecodedImage,
} from "./format";
import { strings } from "./locale";

type Direction = "toBase64" | "fromBase64";

export default function ImageBase64() {
  const { t } = useLang();
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "imgb64.direction",
    "toBase64",
  );
  const [withPrefix, setWithPrefix] = useStoredState("imgb64.prefix", true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const directionOptions: { value: Direction; label: string }[] = [
    { value: "toBase64", label: L.imageToBase64 },
    { value: "fromBase64", label: L.base64ToImage },
  ];

  const load = (picked: File) => {
    setError(null);
    readAsDataUrl(picked)
      .then((uri) => {
        setPreview(uri);
        setText(withPrefix ? uri : (uri.split(",")[1] ?? ""));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      );
  };

  const decoded = useMemo<{
    image: DecodedImage | null;
    message: string;
  }>(() => {
    if (direction !== "fromBase64" || text.trim() === "")
      return { image: null, message: "" };
    const result = decodeImageText(text);
    return typeof result === "string"
      ? { image: null, message: result }
      : { image: result, message: "" };
  }, [direction, text]);

  const isImage = decoded.image
    ? decoded.image.mime.startsWith("image/")
    : false;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          options={directionOptions}
          onChange={setDirection}
          ariaLabel={L.direction}
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
            <ToolButton onClick={() => pickRef.current?.click()}>
              {L.chooseImage}
            </ToolButton>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={withPrefix}
                onChange={(e) => {
                  setWithPrefix(e.target.checked);
                  if (file) load(file);
                }}
              />
              {L.withPrefix}
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <Split>
        {direction === "toBase64" ? (
          <>
            <Panel title={L.source}>
              {file ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview ?? ""}
                    alt={L.altSource}
                    className="max-h-56 max-w-full object-contain"
                  />
                  <p className="text-xs text-neutral-500">
                    {fill(L.sourceInfo, {
                      name: file.name,
                      size: sizeOf(file.size),
                      type: file.type || L.unknownType,
                    })}
                  </p>
                </div>
              ) : (
                <p className="p-3 text-xs text-neutral-400">{L.sourceHint}</p>
              )}
            </Panel>
            <Panel
              title={L.base64}
              actions={
                <>
                  <ToolButton
                    onClick={() => {
                      if (file) load(file);
                    }}
                  >
                    {L.reencode}
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
                placeholder={L.base64Hint}
              />
            </Panel>
          </>
        ) : (
          <>
            <Panel
              title={L.base64OrDataUri}
              actions={
                <>
                  <ToolButton onClick={() => setText("")}>{t.clear}</ToolButton>
                  <CopyButton getText={() => text} />
                </>
              }
            >
              <textarea
                className={editorClass}
                spellCheck={false}
                placeholder={L.pasteHint}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Panel>
            <Panel
              title={L.preview}
              actions={
                decoded.image && isImage ? (
                  <a
                    href={decoded.image.uri}
                    download={`image.${decoded.image.mime.split("/")[1] ?? "bin"}`}
                    className="whitespace-nowrap rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {L.download}
                  </a>
                ) : undefined
              }
            >
              {decoded.image && isImage ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={decoded.image.uri}
                    alt={L.altDecoded}
                    className="max-h-56 max-w-full object-contain"
                  />
                  <p className="text-xs text-neutral-500">
                    {fill(L.decodedInfo, {
                      mime: decoded.image.mime,
                      size: sizeOf(decoded.image.bytes.length),
                    })}
                  </p>
                </div>
              ) : (
                <p className="p-3 text-xs text-neutral-400">
                  {decoded.message || L.previewHint}
                </p>
              )}
            </Panel>
          </>
        )}
      </Split>
    </div>
  );
}
