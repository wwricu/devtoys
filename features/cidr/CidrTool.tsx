"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, StatusLine, ToolButton, useStoredState } from "@/components/kit";
import { parseCidr, rangeSummary, subnets, type CidrInfo } from "./format";

const examples = ["192.168.1.10/24", "10.0.0.0 255.255.0.0", "203.0.113.45/32"];

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 px-3 py-1.5 last:border-0 dark:border-neutral-800">
      <span className="shrink-0 text-xs text-neutral-500">{label}</span>
      <span className="break-all text-right font-mono text-xs text-neutral-800 dark:text-neutral-100">
        {value}
        {hint ? <span className="ml-1 text-neutral-400">{hint}</span> : null}
      </span>
    </div>
  );
}

function Details({ info }: { info: CidrInfo }) {
  const halves = subnets(info);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
      <Panel title="Network">
        <div className="flex flex-col">
          <Row label="CIDR" value={info.cidr} />
          <Row label="Netmask" value={info.netmask} hint={`/${info.prefix}`} />
          <Row label="Wildcard" value={info.wildcard} />
          <Row label="Binary mask" value={info.binaryMask} />
          <Row label="Class" value={info.privateRange} />
          <Row label="Reverse zone" value={info.reverseZone} />
        </div>
      </Panel>
      <Panel
        title="Range"
        actions={<CopyButton getText={() => `${info.network}-${info.broadcast}`} />}
      >
        <div className="flex flex-col">
          <Row label="Network address" value={info.network} />
          <Row label="Broadcast" value={info.broadcast} />
          <Row label="First host" value={info.first} />
          <Row label="Last host" value={info.last} />
          <Row label="Total addresses" value={info.total.toLocaleString()} />
          <Row label="Usable hosts" value={info.hosts.toLocaleString()} />
        </div>
      </Panel>
      {halves.length > 0 && (
        <Panel title="Subnets">
          <div className="flex flex-col">
            {halves.map((s) => (
              <Row key={s.cidr} label={s.cidr} value={s.network} hint={`${s.hosts} hosts`} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function CidrTool() {
  const [stored, setStored] = useStoredState<string>("cidr.input", "");
  const [text, setText] = useState(stored);
  const result = useMemo(() => parseCidr(text), [text]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-64 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="192.168.1.10/24 or address + netmask"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setStored(e.target.value);
          }}
        />
        {examples.map((ex) => (
          <ToolButton key={ex} onClick={() => { setText(ex); setStored(ex); }} title={ex}>
            <span className="font-mono">{ex}</span>
          </ToolButton>
        ))}
        <ToolButton
          onClick={() => {
            setText("");
            setStored("");
          }}
        >
          Clear
        </ToolButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel title="Address">
          {result.info ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4">
              <p className="font-mono text-2xl text-neutral-800 dark:text-neutral-100">
                {result.info.cidr}
              </p>
              <p className="text-xs text-neutral-500">{result.info.privateRange}</p>
              <p className="text-xs text-neutral-500">
                {rangeSummary(result.info)} — {result.info.hosts.toLocaleString()} usable hosts
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">
              Enter an IPv4 address with a CIDR prefix, a netmask, or neither (assumes /24).
              Resolution happens in your browser.
            </p>
          )}
        </Panel>
        {result.info ? (
          <Details info={result.info} />
        ) : (
          <Panel title="Details">
            <p className="p-3 text-xs text-neutral-400">Network details appear here.</p>
          </Panel>
        )}
      </div>

      <StatusLine
        error={result.error ? { message: result.error, line: 1, column: 1 } : null}
        info={result.info ? `/${result.info.prefix} · ${result.info.total.toLocaleString()} addresses` : ""}
      />
    </div>
  );
}
