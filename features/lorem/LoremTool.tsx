"use client";

import { useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { generateLorem, loremStats, type LoremUnit } from "./format";

const UNITS: { value: LoremUnit; label: string }[] = [
  { value: "words", label: "Words" },
  { value: "sentences", label: "Sentences" },
  { value: "paragraphs", label: "Paragraphs" },
];

const YES_NO: { value: "yes" | "no"; label: string }[] = [
  { value: "yes", label: "yes" },
  { value: "no", label: "no" },
];

export default function LoremTool() {
  const [unit, setUnit] = useStoredState<LoremUnit>("lorem.unit", "paragraphs");
  const [count, setCount] = useStoredState<string>("lorem.count", "3");
  const [html, setHtml] = useStoredState<"yes" | "no">("lorem.html", "no");
  const [traditional, setTraditional] = useStoredState<"yes" | "no">(
    "lorem.traditional",
    "yes",
  );
  const [output, setOutput] = useState(() =>
    generateLorem({
      unit: "paragraphs",
      count: 3,
      html: false,
      traditional: true,
    }),
  );

  const run = () => {
    setOutput(
      generateLorem({
        unit,
        count: Number(count) || 1,
        html: html === "yes",
        traditional: traditional === "yes",
      }),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={unit}
          options={UNITS}
          onChange={setUnit}
          ariaLabel="Unit"
        />
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          Count
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 rounded border border-neutral-300 bg-transparent px-1 py-0.5 font-mono text-xs dark:border-neutral-700"
          />
        </label>
        <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          HTML
          <Segmented
            value={html}
            options={YES_NO}
            onChange={setHtml}
            ariaLabel="HTML markup"
          />
        </span>
        <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          Classic opener
          <Segmented
            value={traditional}
            options={YES_NO}
            onChange={setTraditional}
            ariaLabel="Classic opener"
          />
        </span>
        <ToolButton onClick={run}>Generate</ToolButton>
        <ToolButton onClick={() => setOutput("")}>Clear</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="Filler text"
          className="flex-1"
          actions={<CopyButton getText={() => output} />}
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
          />
        </Panel>
        {html === "yes" && (
          <Panel title="Preview" className="md:w-[38%]">
            <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
              {output
                .split(/\n\n+/)
                .map((block) => block.replace(/^<p>|<\/p>$/g, "").trim())
                .filter((block) => block !== "")
                .map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
            </div>
          </Panel>
        )}
      </div>

      <StatusLine
        info={
          output === "" ? "Nothing runs outside this tab" : loremStats(output)
        }
      />
    </div>
  );
}
