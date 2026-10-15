"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { describePem, fingerprint, type DerNode, type PemBlock } from "./format";

const toneClass = {
  ok: "text-green-700 dark:text-green-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-red-700 dark:text-red-300",
};

function NodeRow({
  node,
  depth,
  showHex,
}: {
  node: DerNode;
  depth: number;
  showHex: boolean;
}) {
  const meta =
    node.text !== null && !node.constructed ? (
      <span className="ml-1.5 break-all text-neutral-700 dark:text-neutral-200">
        {node.text.length > 120 ? node.text.slice(0, 120) + "…" : node.text}
      </span>
    ) : null;
  const hex = showHex ? (
    <span className="ml-1.5 break-all text-neutral-400">{node.hex.slice(0, 96)}</span>
  ) : null;

  if (node.children.length === 0)
    return (
      <div className="py-0.5" style={{ paddingLeft: depth * 12 }}>
        <span className="text-neutral-500">{node.label}</span>
        {meta}
        {hex}
      </div>
    );

  return (
    <details open={depth < 2} style={{ paddingLeft: depth * 12 }}>
      <summary className="cursor-pointer py-0.5 select-none">
        <span className="text-neutral-500">{node.label}</span>
        <span className="ml-1.5 text-neutral-400">({node.children.length})</span>
        {hex}
      </summary>
      {node.children.map((child, i) => (
        <NodeRow key={i} node={child} depth={depth + 1} showHex={showHex} />
      ))}
    </details>
  );
}

function Block({
  block,
  print,
  showHex,
}: {
  block: PemBlock;
  print: string;
  showHex: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          {block.title}
        </span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {block.type}
        </span>
        <span className="text-neutral-500">{block.der?.length ?? 0} bytes DER</span>
        {print && (
          <span className="break-all font-mono text-[11px] text-neutral-500">
            SHA-256 {print}
          </span>
        )}
      </div>

      {block.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {block.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {block.sections.map((section) => (
          <Panel key={section.title} title={section.title}>
            <div className="min-h-0 overflow-y-auto">
              <table className="w-full table-fixed text-left text-xs">
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="w-1/3 break-words py-1 pr-2 text-neutral-500">
                        {row.label}
                      </td>
                      <td
                        className={`break-all py-1 font-mono ${
                          row.tone ? toneClass[row.tone] : "text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {row.value}
                        {row.hint && (
                          <span className="ml-1.5 text-neutral-500">({row.hint})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}

        {block.tree && (
          <Panel
            title="ASN.1 structure"
            className="lg:col-span-2"
            actions={
              <span className="text-[11px] text-neutral-400">
                click a branch to expand
              </span>
            }
          >
            <div className="min-h-0 max-h-72 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
              <NodeRow node={block.tree} depth={0} showHex={showHex} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

const EXAMPLE = `-----BEGIN CERTIFICATE-----
MIIB/DCCAaKgAwIBAgIUPKzbLVocAEW7yENXVpLLNd0nNMQwCgYIKoZIzj0EAwIw
PDELMAkGA1UEBhMCVVMxFDASBgNVBAoMC0V4YW1wbGUgT3JnMRcwFQYDVQQDDA5l
Yy5leGFtcGxlLmNvbTAeFw0yNjEwMTQyMjIyMjZaFw0yNjExMTMyMjIyMjZaMDwx
CzAJBgNVBAYTAlVTMRQwEgYDVQQKDAtFeGFtcGxlIE9yZzEXMBUGA1UEAwwOZWMu
ZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAReCbJJpLs3nPnX
10h+kl5zvgitsH5YYkwvnLwp6WozcKJKlAnbwQQRN5iP9Py5MT/+CJE8h8pJOtON
scIyoPhdo4GBMH8wHQYDVR0OBBYEFFSzfTcSDN7PxqGK1I+LaTjsQUdsMB8GA1Ud
IwQYMBaAFFSzfTcSDN7PxqGK1I+LaTjsQUdsMBIGA1UdEwEB/wQIMAYBAf8CAQAw
DgYDVR0PAQH/BAQDAgEGMBkGA1UdEQQSMBCCDmVjLmV4YW1wbGUuY29tMAoGCCqG
SM49BAMCA0gAMEUCIQDLLYkDqeWWDLhgBerlwvrsReSSv3Mb3tGqVUvo5drCawIg
Otlmf9Wevg430aRXU1K2UhaZvIbd57sDp3+bKkvF920=
-----END CERTIFICATE-----`;

export default function PemDecoder() {
  const [input, setInput] = useState("");
  const [showHex, setShowHex] = useStoredState("pem.showHex", false);
  const [prints, setPrints] = useState<string[]>([]);
  const result = useMemo(() => describePem(input), [input]);

  useEffect(() => {
    let alive = true;
    const blocks = result.blocks;
    if (blocks.length === 0) {
      setPrints([]);
      return;
    }
    Promise.all(
      blocks.map((b) => (b.der ? fingerprint(b.der) : Promise.resolve(""))),
    ).then((list) => {
      if (alive) setPrints(list);
    });
    return () => {
      alive = false;
    };
  }, [input, result]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Panel
        title="PEM text"
        actions={
          <>
            <ToolButton onClick={() => setInput(EXAMPLE)}>Example</ToolButton>
            <ToolButton onClick={() => setShowHex(!showHex)} title="Show raw bytes per node">
              {showHex ? "Hide bytes" : "Show bytes"}
            </ToolButton>
            <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <textarea
          className={editorClass + " min-h-28 flex-none"}
          spellCheck={false}
          placeholder="Paste a PEM block: a certificate, a key, a CSR or a revocation list"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Panel>

      {result.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {result.blocks.map((block, i) => (
          <div key={i} className="mb-2">
            <Block block={block} print={prints[i] ?? ""} showHex={showHex} />
          </div>
        ))}
      </div>

      <StatusLine
        info={
          result.blocks.length
            ? `${result.blocks.length} object${result.blocks.length === 1 ? "" : "s"} decoded locally, nothing is uploaded`
            : "Paste PEM text above"
        }
      />
    </div>
  );
}
