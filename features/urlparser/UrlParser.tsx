"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, editorClass } from "@/components/kit";
import { parseUrl, type UrlParts } from "./format";

function Row({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <div className="flex items-start gap-2 border-b border-neutral-100 py-1.5 dark:border-neutral-800">
      <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs">{value}</span>
      <CopyButton getText={() => value} />
    </div>
  );
}

const EXAMPLE = "https://user:pass@example.com:8443/a/b/c.txt?q=hello%20world&tag=x&tag=y&empty#sec%203";

export default function UrlParser() {
  const [input, setInput] = useState("");
  const result = useMemo(() => parseUrl(input), [input]);
  const parts: UrlParts | null = result.parts;

  const queryText = parts ? parts.params.map((p) => `${p.key}=${p.value}`).join("&") : "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <Panel
        title="URL"
        actions={
          <>
            <ToolButton onClick={() => setInput(EXAMPLE)} title="Load an example">
              Example
            </ToolButton>
            <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <textarea
          className={editorClass + " min-h-16 flex-none"}
          spellCheck={false}
          placeholder="Paste a URL, with or without the scheme…"
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
        <p className="text-xs text-neutral-400">
          No scheme found: parsed as if it started with https://
        </p>
      )}

      {parts && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title="Components">
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              <Row label="Protocol" value={parts.protocol} />
              <Row label="Username" value={parts.username} />
              <Row label="Password" value={parts.password} />
              <Row label="Host" value={parts.host} />
              <Row label="Hostname" value={parts.hostname} />
              <Row label="Port" value={parts.port} />
              <Row label="Path" value={parts.path} />
              <Row label="Query" value={parts.search} />
              <Row label="Fragment" value={parts.hash} />
              <Row label="Origin" value={parts.origin} />
              <Row label="Segments" value={parts.segments.join(" / ")} />
            </div>
          </Panel>

          <Panel
            title={`Query parameters (${parts.params.length})`}
            actions={parts.params.length > 0 ? <CopyButton getText={() => queryText} /> : undefined}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              {parts.params.length === 0 && (
                <p className="py-2 text-xs text-neutral-400">No query parameters.</p>
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
                    {p.value === "" ? <span className="text-neutral-400">(empty)</span> : p.value}
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
