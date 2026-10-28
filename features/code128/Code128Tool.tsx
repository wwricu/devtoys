"use client";

import { useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  codesetSummary,
  defaultSvgOptions,
  encodeCode128,
  renderSvg,
  type SvgOptions,
} from "./format";
import { strings } from "./locale";

const SAMPLES = ["ORDER-2026-000123", "1234567890", "SN:9f-2c"];

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Code128Tool() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("ORDER-2026-000123");
  const [height, setHeight] = useStoredState<string>("c128.height", "60");
  const [module, setModule] = useStoredState<string>("c128.module", "2");
  const [quiet, setQuiet] = useStoredState<string>("c128.quiet", "10");
  const [showText, setShowText] = useStoredState<boolean>("c128.text", true);

  // Sizes are unit notation, so those labels read the same in both languages.
  const heights: { value: string; label: string }[] = [
    { value: "40", label: "S" },
    { value: "60", label: "M" },
    { value: "90", label: "L" },
    { value: "130", label: "XL" },
  ];

  const modules: { value: string; label: string }[] = [
    { value: "1", label: "1 px" },
    { value: "2", label: "2 px" },
    { value: "3", label: "3 px" },
    { value: "4", label: "4 px" },
  ];

  const quietZones: { value: string; label: string }[] = [
    { value: "0", label: L.noMargin },
    { value: "10", label: L.modules10 },
    { value: "20", label: L.modules20 },
  ];

  const result = encodeCode128(input);
  const options: SvgOptions = {
    ...defaultSvgOptions,
    width: Number(module),
    height: Number(height),
    quietZone: Number(quiet),
    showText,
  };
  const markup = result.error ? "" : renderSvg(result, input, options);

  const downloadPng = async () => {
    if (markup === "") return;
    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
    );
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Could not rasterise the symbol"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (blob) saveBlob(blob, "code128.png");
    } catch {
      /* the SVG download still works when rasterising fails */
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const downloadSvg = () => {
    if (markup !== "")
      saveBlob(new Blob([markup], { type: "image/svg+xml" }), "code128.svg");
  };

  const summary = codesetSummary(result);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={module}
          options={modules}
          onChange={setModule}
          ariaLabel={L.moduleWidth}
        />
        <Segmented
          value={height}
          options={heights}
          onChange={setHeight}
          ariaLabel={L.height}
        />
        <Segmented
          value={quiet}
          options={quietZones}
          onChange={setQuiet}
          ariaLabel={L.quietZone}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={showText}
            onChange={(e) => setShowText(e.target.checked)}
          />
          {L.caption}
        </label>
        {SAMPLES.map((sample) => (
          <ToolButton
            key={sample}
            onClick={() => setInput(sample)}
            title={sample}
          >
            {sample.length > 14 ? `${sample.slice(0, 14)}…` : sample}
          </ToolButton>
        ))}
        <ToolButton onClick={() => void downloadPng()}>PNG</ToolButton>
        <ToolButton onClick={downloadSvg}>SVG</ToolButton>
      </div>

      <Split>
        <Panel title={t.input} actions={<CopyButton getText={() => input} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="ASCII 0-127"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={L.symbol}
          actions={
            <>
              <CopyButton getText={() => markup} />
              <ToolButton onClick={downloadSvg}>{L.saveSvg}</ToolButton>
            </>
          }
        >
          {result.error ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
              {L.previewHint}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto bg-white p-3">
              <div
                className="origin-top-left"
                style={{ width: "fit-content" }}
                dangerouslySetInnerHTML={{ __html: markup }}
              />
            </div>
          )}
        </Panel>
      </Split>

      <StatusLine
        error={
          result.error ? { message: result.error, line: 1, column: 1 } : null
        }
        info={
          result.error
            ? L.asciiRange
            : `${fill(L.stats, {
                sets: summary.sets.join("/"),
                symbols: summary.symbols,
                checksum: summary.checksum,
              })}${
                summary.switches > 0
                  ? fill(summary.switches === 1 ? L.switchOne : L.switchMany, {
                      count: summary.switches,
                    })
                  : ""
              } · ${L.localNote}`
        }
      />
    </div>
  );
}
