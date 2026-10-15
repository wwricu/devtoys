"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import {
  EC_LEVELS,
  encodeQr,
  modulePath,
  svgDocument,
  type EcLevel,
  type QrSymbol,
} from "./format";

const SCALE_OPTIONS: { value: string; label: string }[] = [
  { value: "3", label: "3 px" },
  { value: "4", label: "4 px" },
  { value: "6", label: "6 px" },
  { value: "8", label: "8 px" },
];

const MARGIN_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "No border" },
  { value: "2", label: "2 modules" },
  { value: "4", label: "4 modules" },
];

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(symbol: QrSymbol, scale: number, margin: number, dark: string, light: string) {
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
      ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
    }
  }
  canvas.toBlob((blob) => {
    if (blob) saveBlob(blob, `qr-v${symbol.version}-${symbol.level}.png`);
  }, "image/png");
}

export default function QrTool() {
  const [text, setText] = useState("");
  const [level, setLevel] = useStoredState<EcLevel>("qr.level", "M");
  const [scale, setScale] = useStoredState<string>("qr.scale", "4");
  const [margin, setMargin] = useStoredState<string>("qr.margin", "4");
  const [dark, setDark] = useStoredState<string>("qr.dark", "#000000");
  const [light, setLight] = useStoredState<string>("qr.light", "#ffffff");

  const px = Math.max(1, Number(scale));
  const quiet = Math.max(0, Number(margin));
  const { symbol, error } = useMemo(() => encodeQr(text, level), [text, level]);

  const downloadSvg = useCallback(() => {
    if (!symbol) return;
    saveBlob(
      new Blob([svgDocument(symbol, { scale: px, margin: quiet, dark, light })], {
        type: "image/svg+xml",
      }),
      `qr-v${symbol.version}-${symbol.level}.svg`,
    );
  }, [symbol, px, quiet, dark, light]);

  const edge = symbol ? symbol.size + quiet * 2 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={level} options={EC_LEVELS} onChange={setLevel} ariaLabel="Error correction" />
        <Segmented value={scale} options={SCALE_OPTIONS} onChange={setScale} ariaLabel="Module size" />
        <Segmented value={margin} options={MARGIN_OPTIONS} onChange={setMargin} ariaLabel="Quiet zone" />
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          Ink
          <input
            type="color"
            value={dark}
            onChange={(e) => setDark(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
            aria-label="Foreground colour"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          Paper
          <input
            type="color"
            value={light}
            onChange={(e) => setLight(e.target.value)}
            className="h-6 w-7 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
            aria-label="Background colour"
          />
        </label>
        <ToolButton onClick={() => setText("")}>Clear</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel title="Text or URL">
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="https://example.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Panel>

        <Panel
          title="Symbol"
          actions={
            <>
              <ToolButton onClick={downloadSvg} title="Download the vector file">
                SVG
              </ToolButton>
              <ToolButton
                onClick={() => symbol && downloadPng(symbol, px, quiet, dark, light)}
                title="Download a bitmap"
              >
                PNG
              </ToolButton>
              <CopyButton
                getText={() =>
                  symbol ? svgDocument(symbol, { scale: px, margin: quiet, dark, light }) : ""
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
                aria-label="QR code"
              >
                <rect width={edge} height={edge} fill={light} />
                <path
                  transform={`translate(${quiet} ${quiet})`}
                  fill={dark}
                  d={modulePath(symbol.modules, symbol.size)}
                />
              </svg>
            ) : (
              <p className="text-xs text-neutral-400">
                The QR code is drawn here as you type. Everything stays in this tab.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          symbol
            ? `Version ${symbol.version} · ${symbol.size}×${symbol.size} modules · EC ${symbol.level} · ${symbol.mode} · holds up to ${symbol.capacity} ${symbol.mode === "byte" ? "bytes" : "characters"}`
            : `${text.length} characters`
        }
      />
    </div>
  );
}
