"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Split,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { diffLines, unifiedDiff, type DiffLine, type DiffOp } from "./format";
import { strings } from "./locale";

interface Row {
  left: DiffLine | null;
  right: DiffLine | null;
}

/** Pair consecutive delete/insert runs so the two sides line up horizontally. */
function toRows(lines: DiffLine[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.op === "equal") {
      rows.push({ left: l, right: l });
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    const inss: DiffLine[] = [];
    while (i < lines.length && lines[i].op === "delete") dels.push(lines[i++]);
    while (i < lines.length && lines[i].op === "insert") inss.push(lines[i++]);
    const count = Math.max(dels.length, inss.length);
    for (let k = 0; k < count; k++)
      rows.push({ left: dels[k] ?? null, right: inss[k] ?? null });
  }
  return rows;
}

const cellClass: Record<DiffOp, string> = {
  equal: "",
  insert: "bg-green-50 dark:bg-green-950/50",
  delete: "bg-red-50 dark:bg-red-950/50",
};

function Cell({
  line,
  side,
}: {
  line: DiffLine | null;
  side: "left" | "right";
}) {
  const no = line ? (side === "left" ? line.left : line.right) : null;
  const op = line?.op ?? "equal";
  return (
    <div
      className={`flex min-w-0 ${line ? cellClass[op] : "bg-neutral-50 dark:bg-neutral-900"}`}
    >
      <span className="w-9 shrink-0 select-none pr-1 text-right text-[11px] leading-5 text-neutral-400">
        {no ?? ""}
      </span>
      <span
        className={`w-3 shrink-0 select-none text-center text-[11px] leading-5 ${
          line && op !== "equal"
            ? op === "insert"
              ? "text-green-600"
              : "text-red-600"
            : "text-neutral-300"
        }`}
      >
        {line ? (op === "insert" ? "+" : op === "delete" ? "-" : " ") : ""}
      </span>
      <pre className="min-w-0 flex-1 whitespace-pre font-mono text-xs leading-5">
        {line?.text ?? ""}
      </pre>
    </div>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function DiffTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [ignoreCase, setIgnoreCase] = useStoredState("diff.ignoreCase", false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useStoredState(
    "diff.ignoreWhitespace",
    false,
  );
  const [mode, setMode] = useState<"side" | "unified">("side");

  const summary = useMemo(
    () => diffLines(left, right, { ignoreCase, ignoreWhitespace }),
    [left, right, ignoreCase, ignoreWhitespace],
  );
  const rows = useMemo(() => toRows(summary.lines), [summary.lines]);
  const unified = useMemo(() => unifiedDiff(summary, 3), [summary]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label={L.view}
          className="inline-flex overflow-hidden rounded border border-neutral-300 text-xs dark:border-neutral-700"
        >
          {(["side", "unified"] as const).map((m, i) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 ${i > 0 ? "border-l border-neutral-300 dark:border-neutral-700" : ""} ${
                mode === m
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {m === "side" ? L.sideBySide : L.unified}
            </button>
          ))}
        </div>
        <Check
          label={L.ignoreCase}
          value={ignoreCase}
          onChange={setIgnoreCase}
        />
        <Check
          label={L.ignoreWhitespace}
          value={ignoreWhitespace}
          onChange={setIgnoreWhitespace}
        />
        <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          <span className="text-green-600 dark:text-green-400">
            +{summary.added}
          </span>{" "}
          <span className="text-red-600 dark:text-red-400">
            -{summary.removed}
          </span>{" "}
          {fill(L.unchanged, { count: summary.unchanged })}
        </span>
      </div>

      <Split orientation="column">
        {mode === "side" && (
          <Split>
            <Panel title={L.original}>
              <textarea
                className={editorClass}
                spellCheck={false}
                placeholder={L.originalHint}
                value={left}
                onChange={(e) => setLeft(e.target.value)}
              />
            </Panel>
            <Panel title={L.changed}>
              <textarea
                className={editorClass}
                spellCheck={false}
                placeholder={L.changedHint}
                value={right}
                onChange={(e) => setRight(e.target.value)}
              />
            </Panel>
          </Split>
        )}

        <Panel
          title={mode === "unified" ? L.unifiedDiff : t.result}
          actions={
            mode === "unified" ? (
              <CopyButton getText={() => unified} />
            ) : undefined
          }
        >
          {summary.truncated && (
            <p className="border-b border-neutral-100 px-2 py-1 text-xs text-amber-600 dark:border-neutral-800">
              {L.truncated}
            </p>
          )}
          {/* One shared scroll container: a long line must not give every row its own bar. */}
          <div className="min-h-0 flex-1 overflow-auto">
            {mode === "unified" ? (
              <pre className="whitespace-pre p-2 font-mono text-xs leading-5">
                {unified
                  ? unified.split("\n").map((line, i) => {
                      const op: DiffOp =
                        line.startsWith("+") && i > 1
                          ? "insert"
                          : line.startsWith("-") && i > 1
                            ? "delete"
                            : "equal";
                      return (
                        <div key={i} className={cellClass[op]}>
                          {line}
                        </div>
                      );
                    })
                  : ""}
              </pre>
            ) : (
              <div className="grid w-max min-w-full grid-cols-2 gap-px">
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {rows.map((r, i) => (
                    <Cell key={i} line={r.left} side="left" />
                  ))}
                </div>
                <div className="border-l border-neutral-200 dark:border-neutral-800">
                  {rows.map((r, i) => (
                    <Cell key={i} line={r.right} side="right" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </Split>
    </div>
  );
}
