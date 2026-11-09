"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import CodeField from "@/components/CodeField";
import {
  CopyButton,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { decodeInput, MAX_BYTES } from "./detect";
import { strings } from "./locale";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
};

type Direction = "toFile" | "toBase64";
type Picked = { uri: string; name: string; size: number; type: string };

/** One read yields the type and the text, already in the form to copy out. */
function readAsDataUrl(chosen: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(chosen);
  });
}

export default function Base64FileTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "b64file.direction",
    "toFile",
  );
  const [withPrefix, setWithPrefix] = useStoredState("b64file.prefix", true);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const [autoFind, setAutoFind] = useStoredState("b64file.autoFind", true);
  // A pasted payload can be megabytes, so decoding waits for a quiet moment.
  const settled = useDeferredValue(input);

  const decoded = useMemo(
    () =>
      direction === "toFile" && settled.trim() !== ""
        ? decodeInput(settled, autoFind)
        : null,
    [direction, settled, autoFind],
  );
  const file = decoded && "file" in decoded ? decoded.file : null;
  const blocks = decoded && "file" in decoded ? decoded.blocks : 0;
  const message =
    direction === "toFile"
      ? decoded && "error" in decoded
        ? decoded.error
        : null
      : pickError;

  const url = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(
      new Blob([file.bytes], { type: file.kind.mime }),
    );
  }, [file]);

  useEffect(() => {
    if (url === "") return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const encoded = useMemo(() => {
    if (!picked) return "";
    const comma = picked.uri.indexOf(",");
    return withPrefix || comma < 0 ? picked.uri : picked.uri.slice(comma + 1);
  }, [picked, withPrefix]);

  const load = (chosen: File) => {
    setPickError(null);
    // The same ceiling the decode side enforces, met from the other direction.
    if (chosen.size > MAX_BYTES) {
      setPicked(null);
      setPickError(fill(L.tooLarge, { size: MAX_BYTES / 1048576 }));
      return;
    }
    readAsDataUrl(chosen)
      .then((uri) =>
        setPicked({
          uri,
          name: chosen.name,
          size: chosen.size,
          type: chosen.type,
        }),
      )
      .catch((err: unknown) => {
        setPicked(null);
        setPickError(err instanceof Error ? err.message : String(err));
      });
  };

  const fileName = file ? `file.${file.kind.ext}` : "";

  const body = () => {
    if (!file)
      return <p className="p-3 text-xs text-neutral-400">{L.waiting}</p>;
    if (file.preview === "image")
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={L.altPreview}
          className="max-h-64 max-w-full self-center object-contain p-2"
        />
      );
    if (file.preview === "audio")
      return <audio src={url} controls className="w-full px-2 py-3" />;
    if (file.preview === "video")
      return (
        <video
          src={url}
          controls
          className="max-h-64 w-full object-contain p-2"
        />
      );
    if (file.preview === "pdf")
      return (
        <iframe
          src={url}
          title={L.altPreview}
          className="min-h-0 w-full flex-1 border-0"
        />
      );
    if (file.preview === "text")
      return (
        <>
          <CodeField value={file.text ?? ""} readOnly placeholder="" />
          {file.truncated && (
            <p className="border-t border-neutral-200 px-2 py-1 text-[11px] text-neutral-400 dark:border-neutral-800">
              {fill(L.textNote, { count: file.text?.length ?? 0 })}
            </p>
          )}
        </>
      );
    return <p className="p-3 text-xs text-neutral-400">{L.noPreview}</p>;
  };

  const decodePanes = (
    <>
      <Panel
        title={L.base64}
        actions={
          <>
            <label
              title={L.autoFindHint}
              className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300"
            >
              <input
                type="checkbox"
                checked={autoFind}
                onChange={(e) => setAutoFind(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              {L.autoFind}
            </label>
            <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <CodeField
          value={input}
          onChange={setInput}
          placeholder={L.pasteHint}
        />
      </Panel>
      <Panel
        title={L.file}
        actions={
          // The embedded PDF viewer carries its own download control.
          file && file.preview !== "pdf" ? (
            <a
              href={url}
              download={fileName}
              className="whitespace-nowrap rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {L.download}
            </a>
          ) : undefined
        }
      >
        {body()}
      </Panel>
    </>
  );

  const encodePanes = (
    <>
      <Panel title={L.file}>
        {picked ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2">
            {picked.type.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked.uri}
                alt={L.altSource}
                className="max-h-56 max-w-full object-contain"
              />
            )}
            <p className="text-xs text-neutral-500">
              {fill(L.sourceInfo, {
                name: picked.name,
                size: formatSize(picked.size),
                type: picked.type || L.unknownType,
              })}
            </p>
          </div>
        ) : (
          <p className="p-3 text-xs text-neutral-400">{L.pickHint}</p>
        )}
      </Panel>
      <Panel title={L.base64} actions={<CopyButton getText={() => encoded} />}>
        <CodeField value={encoded} readOnly placeholder="" />
      </Panel>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          options={[
            { value: "toFile", label: L.toFile },
            { value: "toBase64", label: L.toBase64 },
          ]}
          onChange={setDirection}
          ariaLabel={L.direction}
        />
        {direction === "toBase64" && (
          <>
            <input
              ref={pickRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen) load(chosen);
              }}
            />
            <ToolButton onClick={() => pickRef.current?.click()}>
              {L.chooseFile}
            </ToolButton>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={withPrefix}
                onChange={(e) => setWithPrefix(e.target.checked)}
                className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
              />
              {L.withPrefix}
            </label>
          </>
        )}
      </div>

      {blocks > 1 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {fill(L.multiNote, { count: blocks })}
        </p>
      )}
      {file?.tailCut && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {L.cutNote}
        </p>
      )}

      <Split>{direction === "toFile" ? decodePanes : encodePanes}</Split>

      <StatusLine
        error={message ? { message, line: 1, column: 1 } : null}
        info={
          file
            ? fill(L.fileInfo, {
                label: file.kind.label,
                mime: file.kind.mime,
                size: formatSize(file.bytes.length),
              })
            : picked
              ? fill(L.sourceInfo, {
                  name: picked.name,
                  size: formatSize(picked.size),
                  type: picked.type || L.unknownType,
                })
              : input
                ? t.ready
                : ""
        }
      />
    </div>
  );
}
