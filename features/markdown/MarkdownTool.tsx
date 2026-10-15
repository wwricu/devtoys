"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { markdownToHtml, sanitizeHtml } from "./format";

type View = "html" | "preview";
const viewOptions: { value: View; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "preview", label: "Preview" },
];

export default function MarkdownTool() {
  const [input, setInput] = useState("");
  const [view, setView] = useStoredState<View>("markdown.view", "html");
  const html = useMemo(() => markdownToHtml(input), [input]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Output
        </span>
        <Segmented
          ariaLabel="Output view"
          value={view}
          options={viewOptions}
          onChange={setView}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title="Markdown"
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="# Heading&#10;&#10;**bold** *italic* `code` [link](https://example.com)&#10;&#10;- list item"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title={view === "html" ? "HTML" : "Preview"} actions={<CopyButton getText={() => html} />}>
          {view === "html" ? (
            <textarea
              className={editorClass}
              spellCheck={false}
              readOnly
              value={html}
              placeholder="HTML result"
            />
          ) : (
            <div
              className="md-preview min-h-0 flex-1 overflow-auto p-3 text-sm"
              // Safe: markdownToHtml escapes all input text and emits only
              // whitelisted tags; sanitizeHtml re-checks against a tag/attr allowlist.
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
