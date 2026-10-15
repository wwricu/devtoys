"use client";

import { useState } from "react";
import {
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { readSvg, svgToPng } from "./format";
import { strings } from "./locale";

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="28" fill="#0ea5e9" />
  <path d="M20 33l8 8 16-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
</svg>`;

// Zoom factors are numerals, so they stay identical in every language.
const zoomOptions: { value: string; label: string }[] = [
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
  { value: "8", label: "8x" },
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
  const { t } = useLang();
  const L = useText(strings);
  const [svg, setSvg] = useState(SAMPLE);
  const [zoom, setZoom] = useStoredState<string>("svg.zoom", "2");
  const [backdrop, setBackdrop] = useStoredState<Backdrop>(
    "svg.backdrop",
    "grid",
  );
  const [busy, setBusy] = useState(false);

  const backdropOptions: { value: Backdrop; label: string }[] = [
    { value: "light", label: L.light },
    { value: "dark", label: L.dark },
    { value: "grid", label: L.checker },
  ];

  const read = readSvg(svg);
  const scale = Math.max(1, Number(zoom));
  const size = { width: read.width * scale, height: read.height * scale };

  const downloadPng = async () => {
    if (!read.markup) return;
    setBusy(true);
    try {
      saveBlob(
        await svgToPng(read.markup, size.width, size.height),
        "image.png",
      );
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

  const statusInfo = read.markup
    ? [
        fill(L.sizeNote, {
          width: read.width,
          height: read.height,
          pxWidth: Math.round(size.width),
          pxHeight: Math.round(size.height),
        }),
        ...(read.removed ? [fill(L.dropped, { removed: read.removed })] : []),
        L.rendered,
      ].join(" · ")
    : "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {L.zoom}
        </span>
        <Segmented
          ariaLabel={L.zoom}
          value={zoom}
          options={zoomOptions}
          onChange={setZoom}
        />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {L.backdrop}
        </span>
        <Segmented
          ariaLabel={L.backdrop}
          value={backdrop}
          options={backdropOptions}
          onChange={setBackdrop}
        />
        <ToolButton onClick={() => setSvg(SAMPLE)} title={L.sampleHint}>
          {L.sample}
        </ToolButton>
        <ToolButton
          onClick={() => void downloadPng()}
          title={L.downloadPngHint}
        >
          {busy ? L.working : L.downloadPng}
        </ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={L.svgSource}
          actions={
            <>
              <ToolButton onClick={() => setSvg("")}>{t.clear}</ToolButton>
              <ToolButton
                onClick={() => setSvg(read.markup)}
                title={L.cleanHint}
              >
                {L.clean}
              </ToolButton>
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.pasteHint}
            value={svg}
            onChange={(e) => setSvg(e.target.value)}
          />
        </Panel>
        <Panel
          title={L.preview}
          actions={
            <ToolButton onClick={downloadSvg}>{L.downloadSvg}</ToolButton>
          }
        >
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {read.error ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {read.error}
              </p>
            ) : (
              <div
                style={{
                  ...BACKDROP_STYLE[backdrop],
                  width: size.width,
                  height: size.height,
                }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                  dangerouslySetInnerHTML={{ __html: read.markup }}
                />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <StatusLine
        error={read.error ? { message: read.error, line: 1, column: 1 } : null}
        info={statusInfo}
      />
    </div>
  );
}
