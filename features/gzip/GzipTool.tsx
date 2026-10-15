"use client";

import { useEffect, useState } from "react";
import { CopyButton, Panel, Segmented, StatusLine, ToolButton, editorClass, useStoredState } from "@/components/kit";
import {
  compress,
  decompress,
  encodedByteLength,
  type ByteEncoding,
  type CompressFormat,
} from "./format";

const formatOptions: { value: CompressFormat; label: string }[] = [
  { value: "gzip", label: "gzip" },
  { value: "deflate", label: "deflate" },
];

const encodingOptions: { value: ByteEncoding; label: string }[] = [
  { value: "base64", label: "Base64" },
  { value: "base64url", label: "Base64url" },
  { value: "hex", label: "Hex" },
];

const modeOptions: { value: "compress" | "decompress"; label: string }[] = [
  { value: "compress", label: "Compress" },
  { value: "decompress", label: "Decompress" },
];

function size(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

export default function GzipTool() {
  const [mode, setMode] = useStoredState<"compress" | "decompress">("gzip.mode", "compress");
  const [format, setFormat] = useStoredState<CompressFormat>("gzip.format", "gzip");
  const [encoding, setEncoding] = useStoredState<ByteEncoding>("gzip.encoding", "base64");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (input.trim() === "") {
      setOutput("");
      setError(null);
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
      const task =
        mode === "compress"
          ? compress(input, format, encoding)
          : decompress(input, format, encoding);
      task
        .then((r) => {
          if (alive) {
            setOutput(r);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (alive) {
            setOutput("");
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [input, mode, format, encoding]);

  const inputBytes = new TextEncoder().encode(input).length;
  const compressed =
    mode === "compress" ? encodedByteLength(output, encoding) : inputBytes;
  const original = mode === "compress" ? inputBytes : encodedByteLength(input, encoding);
  const ratio = original > 0 && compressed > 0 ? ((compressed / original) * 100).toFixed(1) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={mode} options={modeOptions} onChange={setMode} ariaLabel="Direction" />
        <Segmented value={format} options={formatOptions} onChange={setFormat} ariaLabel="Container" />
        <Segmented value={encoding} options={encodingOptions} onChange={setEncoding} ariaLabel="Text encoding" />
        <ToolButton onClick={() => setInput(output)} title="Move output back into the input">
          Output to Input
        </ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={mode === "compress" ? "Plain text" : "Compressed payload"}
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={mode === "compress" ? "Text to compress…" : "Paste encoded payload…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={mode === "compress" ? "Compressed payload" : "Plain text"}
          actions={<CopyButton getText={() => output} />}
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Result"
            value={output}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `Original ${size(original)} -> ${size(compressed)}${ratio ? ` (${ratio}%)` : ""}`
            : input
              ? "Ready"
              : ""
        }
      />
    </div>
  );
}
