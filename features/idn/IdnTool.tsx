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
import { toAsciiDomain, toUnicodeDomain, type DomainRead } from "./format";
import { strings } from "./locale";

type Direction = "ascii" | "unicode";

const SAMPLES = [
  "münchen.de",
  "例え.jp",
  "xn--bcher-kva.de",
  "https://наше-дело.рф/path",
];

export default function IdnTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "idn.direction",
    "ascii",
  );
  const [input, setInput] = useState("münchen.de");

  const directionOptions: { value: Direction; label: string }[] = [
    { value: "ascii", label: L.toAscii },
    { value: "unicode", label: L.toUnicode },
  ];

  const read: DomainRead =
    input.trim() === ""
      ? { output: "", labels: [], error: null }
      : direction === "ascii"
        ? toAsciiDomain(input)
        : toUnicodeDomain(input);

  const changed = read.labels.filter((label) => label.translated);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          options={directionOptions}
          onChange={setDirection}
          ariaLabel={L.direction}
        />
        {SAMPLES.map((sample) => (
          <ToolButton
            key={sample}
            onClick={() => setInput(sample)}
            title={sample}
          >
            {sample.length > 14 ? `${sample.slice(0, 14)}…` : sample}
          </ToolButton>
        ))}
        <ToolButton
          onClick={() => setInput(read.output)}
          title={t.outputToInputHint}
        >
          {t.outputToInput}
        </ToolButton>
        <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel title={L.domainPanel}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="münchen.de"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={L.convertedPanel}
          actions={<CopyButton getText={() => read.output} />}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <textarea
              className={`${editorClass} flex-none`}
              style={{ height: "5.5rem" }}
              spellCheck={false}
              readOnly
              value={read.output}
              placeholder={t.result}
            />
            {changed.length > 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-neutral-200 p-2 dark:border-neutral-800">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  {L.labels}
                </p>
                {changed.map((label) => (
                  <p
                    key={`${label.input}-${label.output}`}
                    className="font-mono text-xs text-neutral-700 dark:text-neutral-200"
                  >
                    {direction === "ascii"
                      ? label.input
                      : `xn--${label.output}`}{" "}
                    → {label.output}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <StatusLine
        error={read.error ? { message: read.error, line: 1, column: 1 } : null}
        info={
          read.output
            ? fill(L.labelsInfo, {
                changed: changed.length,
                total: read.labels.length,
              })
            : L.pasteHint
        }
      />
    </div>
  );
}
