"use client";

import { useEffect, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  compress,
  decompress,
  encodedByteLength,
  type ByteEncoding,
  type CompressFormat,
} from "./format";
import { strings } from "./locale";

// Byte units (B / KiB / MiB) are language-neutral, so they stay as literals.
function size(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

export default function GzipTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [mode, setMode] = useStoredState<"compress" | "decompress">(
    "gzip.mode",
    "compress",
  );
  const [format, setFormat] = useStoredState<CompressFormat>(
    "gzip.format",
    "gzip",
  );
  const [encoding, setEncoding] = useStoredState<ByteEncoding>(
    "gzip.encoding",
    "base64",
  );
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatOptions: { value: CompressFormat; label: string }[] = [
    { value: "gzip", label: L.gzip },
    { value: "deflate", label: L.deflate },
  ];

  const encodingOptions: { value: ByteEncoding; label: string }[] = [
    { value: "base64", label: L.base64 },
    { value: "base64url", label: L.base64url },
    { value: "hex", label: L.hex },
  ];

  const modeOptions: { value: "compress" | "decompress"; label: string }[] = [
    { value: "compress", label: L.compress },
    { value: "decompress", label: L.decompress },
  ];

  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      if (input.trim() === "") {
        if (alive) {
          setOutput("");
          setError(null);
        }
        return;
      }
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
  const original =
    mode === "compress" ? inputBytes : encodedByteLength(input, encoding);
  const ratio =
    original > 0 && compressed > 0
      ? ((compressed / original) * 100).toFixed(1)
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          options={modeOptions}
          onChange={setMode}
          ariaLabel={L.direction}
        />
        <Segmented
          value={format}
          options={formatOptions}
          onChange={setFormat}
          ariaLabel={L.container}
        />
        <Segmented
          value={encoding}
          options={encodingOptions}
          onChange={setEncoding}
          ariaLabel={L.textEncoding}
        />
        <ToolButton
          onClick={() => setInput(output)}
          title={t.outputToInputHint}
        >
          {t.outputToInput}
        </ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={mode === "compress" ? L.plainText : L.payload}
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={mode === "compress" ? L.compressHint : L.payloadHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={mode === "compress" ? L.payload : L.plainText}
          actions={<CopyButton getText={() => output} />}
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={t.result}
            value={output}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? ratio
              ? fill(L.sizeRatio, {
                  orig: size(original),
                  comp: size(compressed),
                  ratio,
                })
              : fill(L.size, { orig: size(original), comp: size(compressed) })
            : input
              ? t.ready
              : ""
        }
      />
    </div>
  );
}
