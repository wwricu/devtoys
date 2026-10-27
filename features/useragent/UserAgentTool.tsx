"use client";

import { useMemo, useState } from "react";
import { editorClass, Panel, Split, StatusLine, ToolButton } from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import { parseUserAgent, summariseAgent } from "./format";
import { strings } from "./locale";

const SAMPLES: { label: string; ua: string }[] = [
  {
    label: "Chrome",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    label: "Safari",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  },
  {
    label: "iPhone",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  },
  {
    label: "Firefox",
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  {
    label: "Android",
    ua: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  },
  { label: "curl", ua: "curl/8.4.0" },
];

export default function UserAgentTool() {
  const L = useText(strings);
  const [ua, setUa] = useState(SAMPLES[0].ua);

  const info = useMemo(() => parseUserAgent(ua), [ua]);
  const rows = useMemo(() => summariseAgent(info), [info]);
  const known =
    info.browser !== "Unknown" || info.os !== "Unknown" || ua.trim() === "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToolButton onClick={() => setUa(navigator.userAgent)}>
          {L.useThisBrowser}
        </ToolButton>
        {SAMPLES.map(({ label, ua: sample }) => (
          <ToolButton key={label} onClick={() => setUa(sample)} title={sample}>
            {label}
          </ToolButton>
        ))}
      </div>

      <Split>
        <Panel title={L.userAgentString}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.pasteHint}
            value={ua}
            onChange={(e) => setUa(e.target.value)}
          />
        </Panel>
        <Panel title={L.parsed}>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
            {ua.trim() === "" ? (
              <p className="text-xs text-neutral-400">{L.pasteInspect}</p>
            ) : (
              <>
                {rows.map((row) => (
                  <p
                    key={row.id}
                    className="font-mono text-xs text-neutral-700 dark:text-neutral-200"
                  >
                    {L[row.id]}:{" "}
                    {row.id === "device" ? L[row.value] : row.value}
                  </p>
                ))}
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-neutral-500">{L.browser}</dt>
                  <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                    {info.browser} {info.browserVersion}
                  </dd>
                  <dt className="text-neutral-500">{L.engine}</dt>
                  <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                    {info.engine} {info.engineVersion}
                  </dd>
                  <dt className="text-neutral-500">{L.system}</dt>
                  <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                    {info.os} {info.osVersion}
                  </dd>
                  <dt className="text-neutral-500">{L.device}</dt>
                  <dd className="font-mono text-neutral-800 dark:text-neutral-100">
                    {L[info.device]}
                  </dd>
                </dl>
              </>
            )}
          </div>
        </Panel>
      </Split>

      <StatusLine
        error={
          ua.trim() !== "" && !known
            ? { message: "Unrecognised User-Agent pattern", line: 1, column: 1 }
            : null
        }
        info={known ? fill(L.countInfo, { count: ua.length }) : ""}
      />
    </div>
  );
}
