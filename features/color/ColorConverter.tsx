"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel } from "@/components/kit";
import {
  contrastRatio,
  formatHsl,
  parseColor,
  rgbaToCmyk,
  rgbaToHex,
  rgbaToHsl,
  rgbaToHsv,
  rgbaToRgbString,
  type Rgba,
} from "./format";

function ColorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-100 py-1.5 dark:border-neutral-800">
      <span className="w-20 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs">{value}</span>
      <CopyButton getText={() => value} />
    </div>
  );
}

function shade(c: Rgba, amount: number): Rgba {
  const mix = (v: number) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  return { r: mix(c.r), g: mix(c.g), b: mix(c.b), a: c.a };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

function grade(ratio: number): string {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "fail";
}

export default function ColorConverter() {
  const [input, setInput] = useState("#3b82f6");
  const color = useMemo(() => parseColor(input), [input]);

  const hex = color ? rgbaToHex(color) : "";
  const hsl = color ? formatHsl(rgbaToHsl(color)) : "";
  const hsv = color
    ? (() => {
        const v = rgbaToHsv(color);
        return `hsv(${v.h}, ${Math.round(v.s * 100)}%, ${Math.round(v.v * 100)}%)`;
      })()
    : "";
  const cmyk = color
    ? (() => {
        const c = rgbaToCmyk(color);
        return `cmyk(${Math.round(c.c * 100)}%, ${Math.round(c.m * 100)}%, ${Math.round(c.y * 100)}%, ${Math.round(c.k * 100)}%)`;
      })()
    : "";
  const rgb = color ? rgbaToRgbString(color) : "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label="Pick a color"
          value={color ? rgbaToHex({ ...color, a: 1 }).slice(0, 7) : "#000000"}
          onChange={(e) => setInput(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white dark:border-neutral-700"
        />
        <input
          className="min-w-56 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
          spellCheck={false}
          placeholder="hex, rgb(), hsl()"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {!color && input.trim() !== "" && (
          <span className="text-xs text-red-600 dark:text-red-400">Unrecognized color</span>
        )}
      </div>

      {color && (
        <>
          <div
            className="h-20 shrink-0 rounded border border-neutral-200 dark:border-neutral-800"
            style={{ background: rgbaToRgbString(color) }}
          />

          <Panel title="Formats">
            <div className="px-2">
              <ColorRow label="HEX" value={hex} />
              <ColorRow label="RGB" value={rgb} />
              <ColorRow label="HSL" value={hsl} />
              <ColorRow label="HSV" value={hsv} />
              <ColorRow label="CMYK" value={cmyk} />
            </div>
          </Panel>

          <Panel title="Contrast">
            <div className="grid grid-cols-2 gap-2 p-2 text-xs">
              <div
                className="rounded border border-neutral-200 p-2 dark:border-neutral-800"
                style={{ background: "#fff", color: rgb }}
              >
                <p className="font-mono">On white</p>
                <p className="text-neutral-500">
                  {contrastRatio(color, WHITE)} : 1 - {grade(contrastRatio(color, WHITE))}
                </p>
              </div>
              <div
                className="rounded border border-neutral-200 p-2 dark:border-neutral-800"
                style={{ background: "#000", color: rgb }}
              >
                <p className="font-mono" style={{ color: rgbaToRgbString(shade(color, 0.4)) }}>
                  On black
                </p>
                <p className="text-neutral-400">
                  {contrastRatio(color, BLACK)} : 1 - {grade(contrastRatio(color, BLACK))}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Shades and tints">
            <div className="flex p-2">
              {[-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  title={rgbaToHex(shade(color, amt))}
                  onClick={() => setInput(rgbaToHex(shade(color, amt)))}
                  className="h-12 flex-1 border border-neutral-200 dark:border-neutral-800"
                  style={{ background: rgbaToRgbString(shade(color, amt)) }}
                />
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
