"use client";

import {
  Panel,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { useText } from "@/lib/i18n";
import {
  bumpBetween,
  compareVersions,
  describeVersion,
  parseVersion,
} from "./format";
import { strings } from "./locale";

const OPERATORS = ["=", ">", "<", ">=", "<="] as const;

function rowsFor(text: string) {
  const v = parseVersion(text);
  if (!v) return null;
  return {
    rows: describeVersion(text),
    full: `${v.major}.${v.minor}.${v.patch}${
      v.prerelease.length ? `-${v.prerelease.join(".")}` : ""
    }${v.build.length ? `+${v.build.join(".")}` : ""}`,
  };
}

export default function SemverTool() {
  const L = useText(strings);
  const [left, setLeft] = useStoredState("semver.left", "1.2.3");
  const [right, setRight] = useStoredState("semver.right", "1.10.0-beta.2");

  const delta =
    left.trim() && right.trim() ? compareVersions(left, right) : null;
  const a = rowsFor(left);
  const b = rowsFor(right);
  const symbol = delta === null ? "" : delta < 0 ? "<" : delta > 0 ? ">" : "=";
  const error =
    (left.trim() !== "" && !a
      ? `"${left}" is not a Semver 2.0 version`
      : null) ??
    (right.trim() !== "" && !b
      ? `"${right}" is not a Semver 2.0 version`
      : null);

  const verdict =
    delta === null
      ? L.missingInvalid
      : delta < 0
        ? L.olderThan
        : delta > 0
          ? L.newerThan
          : L.equal;

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
      {label}
      <input
        className="w-44 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
        value={value}
        spellCheck={false}
        placeholder={L.versionHint}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {field(L.versionA, left, setLeft)}
        {field(L.versionB, right, setRight)}
        <ToolButton
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
        >
          {L.swap}
        </ToolButton>
      </div>

      <Split>
        <Panel title={L.compare}>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-3">
            <p className="font-mono text-3xl text-neutral-800 dark:text-neutral-100">
              {symbol || "?"}
            </p>
            <p className="text-center text-xs text-neutral-500">{verdict}</p>
            {delta !== null && (
              <p className="mt-2 text-xs text-neutral-500">
                {L.bumpLabel}{" "}
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {L[bumpBetween(left, right) ?? "same"]}
                </span>
              </p>
            )}
          </div>
        </Panel>

        <Panel title={L.versionA}>
          {a ? (
            <ul className="flex flex-col gap-1 p-3 text-xs">
              {a.rows.map((row) => (
                <li
                  key={row.id}
                  className="font-mono text-neutral-700 dark:text-neutral-200"
                >
                  {L[row.id]} {row.value}
                </li>
              ))}
              <li className="mt-1 text-neutral-500">
                {L.normalized}: {a.full}
              </li>
            </ul>
          ) : (
            <p className="p-3 text-xs text-neutral-400">{L.notValid}</p>
          )}
        </Panel>

        <Panel title={L.versionB}>
          {b ? (
            <ul className="flex flex-col gap-1 p-3 text-xs">
              {b.rows.map((row) => (
                <li
                  key={row.id}
                  className="font-mono text-neutral-700 dark:text-neutral-200"
                >
                  {L[row.id]} {row.value}
                </li>
              ))}
              <li className="mt-1 text-neutral-500">
                {L.normalized}: {b.full}
              </li>
            </ul>
          ) : (
            <p className="p-3 text-xs text-neutral-400">{L.notValid}</p>
          )}
        </Panel>
      </Split>

      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>{L.quickChecks}</span>
        {OPERATORS.map((op) => {
          const holds =
            delta !== null &&
            ((op === "=" && delta === 0) ||
              (op === ">" && delta > 0) ||
              (op === "<" && delta < 0) ||
              (op === ">=" && delta >= 0) ||
              (op === "<=" && delta <= 0));
          return (
            <span
              key={op}
              className={`rounded border px-1.5 py-0.5 font-mono ${
                holds
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              A {op} B
            </span>
          );
        })}
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={symbol ? `A ${symbol} B` : ""}
      />
    </div>
  );
}
