"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, editorClass } from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { parseUrl, type UrlParts } from "./format";
import { strings } from "./locale";

function Row({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <div className="flex items-start gap-2 border-b border-neutral-100 py-1.5 dark:border-neutral-800">
      <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs">
        {value}
      </span>
      <CopyButton getText={() => value} />
    </div>
  );
}

const EXAMPLE =
  "https://user:pass@example.com:8443/a/b/c.txt?q=hello%20world&tag=x&tag=y&empty#sec%203";

export default function UrlParser() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const result = useMemo(() => parseUrl(input), [input]);
  const parts: UrlParts | null = result.parts;

  const queryText = parts
    ? parts.params.map((p) => `${p.key}=${p.value}`).join("&")
    : "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <Panel
        title={L.url}
        actions={
          <>
            <ToolButton onClick={() => setInput(EXAMPLE)} title={L.exampleHint}>
              {L.example}
            </ToolButton>
            <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <textarea
          className={editorClass + " min-h-16 flex-none"}
          spellCheck={false}
          placeholder={L.pasteHint}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Panel>

      {result.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </div>
      )}

      {parts?.inferredScheme && (
        <p className="text-xs text-neutral-400">{L.inferredNote}</p>
      )}

      {parts && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title={L.components}>
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              <Row label={L.protocol} value={parts.protocol} />
              <Row label={L.username} value={parts.username} />
              <Row label={L.password} value={parts.password} />
              <Row label={L.host} value={parts.host} />
              <Row label={L.hostname} value={parts.hostname} />
              <Row label={L.port} value={parts.port} />
              <Row label={L.path} value={parts.path} />
              <Row label={L.query} value={parts.search} />
              <Row label={L.fragment} value={parts.hash} />
              <Row label={L.origin} value={parts.origin} />
              <Row label={L.segments} value={parts.segments.join(" / ")} />
            </div>
          </Panel>

          <Panel
            title={fill(L.queryParams, { count: parts.params.length })}
            actions={
              parts.params.length > 0 ? (
                <CopyButton getText={() => queryText} />
              ) : undefined
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              {parts.params.length === 0 && (
                <p className="py-2 text-xs text-neutral-400">{L.noParams}</p>
              )}
              {parts.params.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 border-b border-neutral-100 py-1.5 dark:border-neutral-800"
                >
                  <span className="w-40 shrink-0 break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {p.key}
                  </span>
                  <span className="min-w-0 flex-1 break-all font-mono text-xs">
                    {p.value === "" ? (
                      <span className="text-neutral-400">{L.emptyValue}</span>
                    ) : (
                      p.value
                    )}
                  </span>
                  <CopyButton getText={() => p.value} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
