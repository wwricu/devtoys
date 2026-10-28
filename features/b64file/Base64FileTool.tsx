"use client";

import { useEffect, useMemo, useState, useDeferredValue } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { decodeInput } from "./detect";
import { strings } from "./locale";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
};

export default function Base64FileTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const [autoFind, setAutoFind] = useStoredState("b64file.autoFind", true);
  // A pasted payload can be megabytes, so decoding waits for a quiet moment.
  const settled = useDeferredValue(input);

  const decoded = useMemo(
    () => (settled.trim() === "" ? null : decodeInput(settled, autoFind)),
    [settled, autoFind],
  );
  const file = decoded && "file" in decoded ? decoded.file : null;
  const blocks = decoded && "file" in decoded ? decoded.blocks : 0;
  const error = decoded && "error" in decoded ? decoded.error : null;

  const url = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(new Blob([file.bytes], { type: file.kind.mime }));
  }, [file]);

  useEffect(() => {
    if (url === "") return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

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
      return <video src={url} controls className="max-h-64 w-full object-contain p-2" />;
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
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={file.text ?? ""}
          />
          {file.truncated && (
            <p className="border-t border-neutral-200 px-2 py-1 text-[11px] text-neutral-400 dark:border-neutral-800">
              {fill(L.textNote, { count: file.text?.length ?? 0 })}
            </p>
          )}
        </>
      );
    return <p className="p-3 text-xs text-neutral-400">{L.noPreview}</p>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {blocks > 1 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {fill(L.multiNote, { count: blocks })}
        </p>
      )}

      <Split>
        <Panel
          title={L.source}
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
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.pasteHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={L.result}
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
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          file
            ? fill(L.fileInfo, {
                label: file.kind.label,
                mime: file.kind.mime,
                size: formatSize(file.bytes.length),
              })
            : input
              ? t.ready
              : ""
        }
      />
    </div>
  );
}
