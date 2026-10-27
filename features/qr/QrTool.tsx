"use client";

import { useCallback, useMemo, useState } from "react";
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
  encodeQr,
  modulePath,
  svgDocument,
  type EcLevel,
  type QrSymbol,
} from "./format";
import { strings } from "./locale";

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(
  symbol: QrSymbol,
  scale: number,
  margin: number,
  dark: string,
  light: string,
) {
  const edge = (symbol.size + margin * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, edge, edge);
  ctx.fillStyle = dark;
  for (let row = 0; row < symbol.size; row++) {
    for (let col = 0; col < symbol.size; col++) {
      if (symbol.modules[row * symbol.size + col] === 0) continue;
      ctx.fillRect(
        (col + margin) * scale,
        (row + margin) * scale,
        scale,
        scale,
      );
    }
  }
  canvas.toBlob((blob) => {
    if (blob) saveBlob(blob, `qr-v${symbol.version}-${symbol.level}.png`);
  }, "image/png");
}

export default function QrTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [text, setText] = useState("");
  const [level, setLevel] = useStoredState<EcLevel>("qr.level", "M");
  const [scale, setScale] = useStoredState<string>("qr.scale", "4");
  const [margin, setMargin] = useStoredState<string>("qr.margin", "4");
  const [dark, setDark] = useStoredState<string>("qr.dark", "#000000");
  const [light, setLight] = useStoredState<string>("qr.light", "#ffffff");

  const levels: { value: EcLevel; label: string }[] = [
    { value: "L", label: L.levelL },
    { value: "M", label: L.levelM },
    { value: "Q", label: L.levelQ },
    { value: "H", label: L.levelH },
  ];

  // Pixel sizes are unit notation, so they read the same in both languages.
  const scaleOptions: { value: string; label: string }[] = [
    { value: "3", label: "3 px" },
    { value: "4", label: "4 px" },
    { value: "6", label: "6 px" },
    { value: "8", label: "8 px" },
  ];

  const marginOptions: { value: string; label: string }[] = [
    { value: "0", label: L.noBorder },
    { value: "2", label: L.modules2 },
    { value: "4", label: L.modules4 },
  ];

  const px = Math.max(1, Number(scale));
  const quiet = Math.max(0, Number(margin));
  const { symbol, error } = useMemo(() => encodeQr(text, level), [text, level]);

  const downloadSvg = useCallback(() => {
    if (!symbol) return;
    saveBlob(
      new Blob(
        [svgDocument(symbol, { scale: px, margin: quiet, dark, light })],
        {
          type: "image/svg+xml",
        },
      ),
      `qr-v${symbol.version}-${symbol.level}.svg`,
    );
  }, [symbol, px, quiet, dark, light]);

  const edge = symbol ? symbol.size + quiet * 2 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={level}
          options={levels}
          onChange={setLevel}
          ariaLabel={L.errorCorrection}
        />
        <Segmented
          value={scale}
          options={scaleOptions}
          onChange={setScale}
          ariaLabel={L.moduleSize}
        />
        <Segmented
          value={margin}
          options={marginOptions}
          onChange={setMargin}
          ariaLabel={L.quietZone}
        />
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          {L.ink}
          <input
            type="color"
            value={dark}
            onChange={(e) => setDark(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
            aria-label={L.foreground}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          {L.paper}
          <input
            type="color"
            value={light}
            onChange={(e) => setLight(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
            aria-label={L.background}
          />
        </label>
        <ToolButton onClick={() => setText("")}>{t.clear}</ToolButton>
      </div>

      <Split>
        <Panel title={L.textOrUrl}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="https://example.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Panel>

        <Panel
          title={L.symbol}
          actions={
            <>
              <ToolButton onClick={downloadSvg} title={L.downloadSvg}>
                SVG
              </ToolButton>
              <ToolButton
                onClick={() =>
                  symbol && downloadPng(symbol, px, quiet, dark, light)
                }
                title={L.downloadPng}
              >
                PNG
              </ToolButton>
              <CopyButton
                getText={() =>
                  symbol
                    ? svgDocument(symbol, {
                        scale: px,
                        margin: quiet,
                        dark,
                        light,
                      })
                    : ""
                }
              />
            </>
          }
        >
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-100 p-3 dark:bg-neutral-800">
            {symbol ? (
              <svg
                viewBox={`0 0 ${edge} ${edge}`}
                width={Math.min(edge * px, 520)}
                height={Math.min(edge * px, 520)}
                shapeRendering="crispEdges"
                role="img"
                aria-label={L.qrCode}
              >
                <rect width={edge} height={edge} fill={light} />
                <path
                  transform={`translate(${quiet} ${quiet})`}
                  fill={dark}
                  d={modulePath(symbol.modules, symbol.size)}
                />
              </svg>
            ) : (
              <p className="text-xs text-neutral-400">{L.previewHint}</p>
            )}
          </div>
        </Panel>
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          symbol
            ? fill(L.stats, {
                version: symbol.version,
                size: symbol.size,
                level: symbol.level,
                mode:
                  symbol.mode === "numeric"
                    ? L.numeric
                    : symbol.mode === "alphanumeric"
                      ? L.alphanumeric
                      : L.byte,
                capacity: symbol.capacity,
                unit: symbol.mode === "byte" ? L.bytes : L.characters,
              })
            : fill(L.charCount, { count: text.length })
        }
      />
    </div>
  );
}
