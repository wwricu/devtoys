"use client";

import { useState } from "react";
import { Panel, Segmented, StatusLine, ToolButton, editorClass, useStoredState } from "@/components/kit";
import { readSvg, svgToPng } from "./format";

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="28" fill="#0ea5e9" />
  <path d="M20 33l8 8 16-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
</svg>`;

const zoomOptions: { value: string; label: string }[] = [
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
  { value: "8", label: "8x" },
];

const backdropOptions: { value: Backdrop; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "grid", label: "Checker" },
];

type Backdrop = "light" | "dark" | "grid";

const BACKDROP_STYLE: Record<Backdrop, React.CSSProperties> = {
  light: { background: "#ffffff" },
  dark: { background: "#1f1f1f" },
  grid: {
    backgroundColor: "#f5f5f5",
    backgroundImage:
      "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  },
};

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SvgPreviewTool() {
  const [svg, setSvg] = useState(SAMPLE);
  const [zoom, setZoom] = useStoredState<string>("svg.zoom", "2");
  const [backdrop, setBackdrop] = useStoredState<Backdrop>("svg.backdrop", "grid");
  const [busy, setBusy] = useState(false);

  const read = readSvg(svg);
  const scale = Math.max(1, Number(zoom));
  const size = { width: read.width * scale, height: read.height * scale };

  const downloadPng = async () => {
    if (!read.markup) return;
    setBusy(true);
    try {
      saveBlob(await svgToPng(read.markup, size.width, size.height), "image.png");
    } catch {
      /* the status line already reports parse trouble */
    } finally {
      setBusy(false);
    }
  };

  const downloadSvg = () => {
    if (!read.markup) return;
    saveBlob(new Blob([read.markup], { type: "image/svg+xml" }), "image.svg");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Zoom</span>
        <Segmented ariaLabel="Zoom" value={zoom} options={zoomOptions} onChange={setZoom} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Backdrop</span>
        <Segmented
          ariaLabel="Backdrop"
          value={backdrop}
          options={backdropOptions}
          onChange={setBackdrop}
        />
        <ToolButton onClick={() => setSvg(SAMPLE)} title="Load the example drawing">
          Sample
        </ToolButton>
        <ToolButton onClick={() => void downloadPng()} title="Rasterise at the current zoom">
          {busy ? "Working…" : "Download PNG"}
        </ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="SVG source"
          actions={
            <>
              <ToolButton onClick={() => setSvg("")}>Clear</ToolButton>
              <ToolButton onClick={() => setSvg(read.markup)} title="Replace the source with the cleaned markup">
                Clean
              </ToolButton>
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="Paste an SVG document…"
            value={svg}
            onChange={(e) => setSvg(e.target.value)}
          />
        </Panel>
        <Panel
          title="Preview"
          actions={<ToolButton onClick={downloadSvg}>Download SVG</ToolButton>}
        >
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {read.error ? (
              <p className="text-xs text-red-600 dark:text-red-400">{read.error}</p>
            ) : (
              <div style={{ ...BACKDROP_STYLE[backdrop], width: size.width, height: size.height }}>
                <div
                  style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                  dangerouslySetInnerHTML={{ __html: read.markup }}
                />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <StatusLine
        error={read.error ? { message: read.error, line: 1, column: 1 } : null}
        info={
          read.markup
            ? `${read.width} x ${read.height} units, shown at ${Math.round(size.width)} x ${Math.round(
                size.height,
              )} px${read.removed ? ` · ${read.removed} unsafe item(s) dropped` : ""} · rendered in this tab`
            : ""
        }
      />
    </div>
  );
}
