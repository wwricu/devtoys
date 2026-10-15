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
import { fill, useLang, useText } from "@/lib/i18n";
import { generateLorem, loremStats, type LoremUnit } from "./format";
import { strings } from "./locale";

export default function LoremTool() {
  const { t } = useLang();
  const L = useText(strings);
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

  // The filler itself always comes from the Latin word bank; only these
  // control labels follow the UI language.
  const units: { value: LoremUnit; label: string }[] = [
    { value: "words", label: L.words },
    { value: "sentences", label: L.sentences },
    { value: "paragraphs", label: L.paragraphs },
  ];

  const yesNo: { value: "yes" | "no"; label: string }[] = [
    { value: "yes", label: L.yes },
    { value: "no", label: L.no },
  ];

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
          options={units}
          onChange={setUnit}
          ariaLabel={L.unit}
        />
        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          {L.count}
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
          {L.html}
          <Segmented
            value={html}
            options={yesNo}
            onChange={setHtml}
            ariaLabel={L.htmlMarkup}
          />
        </span>
        <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          {L.classicOpener}
          <Segmented
            value={traditional}
            options={yesNo}
            onChange={setTraditional}
            ariaLabel={L.classicOpener}
          />
        </span>
        <ToolButton onClick={run}>{L.generate}</ToolButton>
        <ToolButton onClick={() => setOutput("")}>{t.clear}</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={L.filler}
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
          <Panel title={L.preview} className="md:w-[38%]">
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
        info={output === "" ? L.runsLocally : fill(L.stats, loremStats(output))}
      />
    </div>
  );
}
