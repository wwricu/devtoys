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
import { useLang, useText } from "@/lib/i18n";
import { markdownToHtml, sanitizeHtml } from "./format";
import { strings } from "./locale";

type View = "html" | "preview";

export default function MarkdownTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const [view, setView] = useStoredState<View>("markdown.view", "html");
  const html = useMemo(() => markdownToHtml(input), [input]);

  const viewOptions: { value: View; label: string }[] = [
    { value: "html", label: L.html },
    { value: "preview", label: L.preview },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.output}
        </span>
        <Segmented
          ariaLabel={L.outputView}
          value={view}
          options={viewOptions}
          onChange={setView}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={L.markdown}
          actions={
            <>
              <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.sample}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={view === "html" ? L.html : L.preview}
          actions={<CopyButton getText={() => html} />}
        >
          {view === "html" ? (
            <textarea
              className={editorClass}
              spellCheck={false}
              readOnly
              value={html}
              placeholder={L.htmlResult}
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
