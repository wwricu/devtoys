"use client";

import { useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  parseCidr,
  rangeSummary,
  subnets,
  type CidrClass,
  type CidrInfo,
} from "./format";
import { strings } from "./locale";

type Text = (typeof strings)["en"];

/** Map a network category id plus its range onto a translated label. */
function classLabel(L: Text, id: CidrClass, range: string): string {
  return fill(L[id], { range });
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
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
  const L = useText(strings);
  const halves = subnets(info);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
      <Panel title={L.network}>
        <div className="flex flex-col">
          <Row label={L.cidr} value={info.cidr} />
          <Row
            label={L.netmask}
            value={info.netmask}
            hint={`/${info.prefix}`}
          />
          <Row label={L.wildcard} value={info.wildcard} />
          <Row label={L.binaryMask} value={info.binaryMask} />
          <Row
            label={L.class}
            value={classLabel(L, info.classId, info.classRange)}
          />
          <Row label={L.reverseZone} value={info.reverseZone} />
        </div>
      </Panel>
      <Panel
        title={L.range}
        actions={
          <CopyButton getText={() => `${info.network}-${info.broadcast}`} />
        }
      >
        <div className="flex flex-col">
          <Row label={L.networkAddress} value={info.network} />
          <Row label={L.broadcast} value={info.broadcast} />
          <Row label={L.firstHost} value={info.first} />
          <Row label={L.lastHost} value={info.last} />
          <Row label={L.totalAddresses} value={info.total.toLocaleString()} />
          <Row label={L.usableHosts} value={info.hosts.toLocaleString()} />
        </div>
      </Panel>
      {halves.length > 0 && (
        <Panel title={L.subnets}>
          <div className="flex flex-col">
            {halves.map((s) => (
              <Row
                key={s.cidr}
                label={s.cidr}
                value={s.network}
                hint={fill(L.hostsHint, { hosts: s.hosts })}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

const examples = ["192.168.1.10/24", "10.0.0.0 255.255.0.0", "203.0.113.45/32"];

export default function CidrTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [stored, setStored] = useStoredState<string>("cidr.input", "");
  const [text, setText] = useState(stored);
  const result = useMemo(() => parseCidr(text), [text]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-64 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder={L.inputHint}
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setStored(e.target.value);
          }}
        />
        {examples.map((ex) => (
          <ToolButton
            key={ex}
            onClick={() => {
              setText(ex);
              setStored(ex);
            }}
            title={ex}
          >
            <span className="font-mono">{ex}</span>
          </ToolButton>
        ))}
        <ToolButton
          onClick={() => {
            setText("");
            setStored("");
          }}
        >
          {t.clear}
        </ToolButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel title={L.address}>
          {result.info ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4">
              <p className="font-mono text-2xl text-neutral-800 dark:text-neutral-100">
                {result.info.cidr}
              </p>
              <p className="text-xs text-neutral-500">
                {classLabel(L, result.info.classId, result.info.classRange)}
              </p>
              <p className="text-xs text-neutral-500">
                {fill(L.usableLine, {
                  range: rangeSummary(result.info),
                  hosts: result.info.hosts.toLocaleString(),
                })}
              </p>
            </div>
          ) : (
            <p className="p-3 text-xs text-neutral-400">{L.addressEmpty}</p>
          )}
        </Panel>
        {result.info ? (
          <Details info={result.info} />
        ) : (
          <Panel title={L.details}>
            <p className="p-3 text-xs text-neutral-400">{L.detailsEmpty}</p>
          </Panel>
        )}
      </div>

      <StatusLine
        error={
          result.error ? { message: result.error, line: 1, column: 1 } : null
        }
        info={
          result.info
            ? fill(L.statusLine, {
                prefix: result.info.prefix,
                total: result.info.total.toLocaleString(),
              })
            : ""
        }
      />
    </div>
  );
}
