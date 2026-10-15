"use client";

import { useMemo, useState } from "react";
import { CopyButton, Panel, ToolButton, editorClass } from "@/components/kit";
import { useLang, useText } from "@/lib/i18n";
import { claimDate, decodeJwt, NUMERIC_CLAIMS } from "./format";
import { strings } from "./locale";

type Expiry = "expired" | "pending" | "active";

function expiryOf(payload: Record<string, unknown> | null): Expiry | null {
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now >= payload.exp) return "expired";
  if (typeof payload.nbf === "number" && now < payload.nbf) return "pending";
  return "active";
}

const toneOf: Record<Expiry, "ok" | "warn" | "bad"> = {
  active: "ok",
  pending: "warn",
  expired: "bad",
};

const toneClass = {
  ok: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  bad: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function JwtDecoder() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const result = useMemo(() => decodeJwt(input), [input]);
  const claims = result.payload?.data;
  const expiry = expiryOf(claims ?? null);
  const expiryLabel =
    expiry === null
      ? ""
      : expiry === "expired"
        ? L.expired
        : expiry === "pending"
          ? L.notYetValid
          : L.active;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <Panel
        title={L.token}
        actions={
          <>
            <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <textarea
          className={editorClass + " min-h-20 flex-none"}
          spellCheck={false}
          placeholder={L.pasteToken}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Panel>

      {result.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </div>
      )}

      {claims && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">{L.signatureLabel}</span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {L.notVerified}
          </span>
          {expiry && (
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${toneClass[toneOf[expiry]]}`}
            >
              {expiryLabel}
            </span>
          )}
        </div>
      )}

      {claims && (
        <Panel title={L.registeredClaims}>
          <table className="w-full text-left text-xs">
            <tbody>
              {NUMERIC_CLAIMS.filter((k) => k in claims).map((k) => (
                <tr
                  key={k}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-1 pr-2 font-mono text-neutral-500">{k}</td>
                  <td className="py-1 pr-2 font-mono">{String(claims[k])}</td>
                  <td className="py-1 text-neutral-500">
                    {claimDate(claims[k]) ?? ""}
                  </td>
                </tr>
              ))}
              {Object.keys(claims).filter((k) => !NUMERIC_CLAIMS.includes(k))
                .length === 0 &&
                NUMERIC_CLAIMS.filter((k) => k in claims).length === 0 && (
                  <tr>
                    <td className="py-1 text-neutral-400" colSpan={3}>
                      {L.noClaims}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </Panel>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel
          title={L.header}
          actions={
            result.header?.json ? (
              <CopyButton getText={() => result.header!.json!} />
            ) : undefined
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={result.header?.json ?? ""}
            placeholder={L.header}
          />
        </Panel>
        <Panel
          title={L.payload}
          actions={
            result.payload?.json ? (
              <CopyButton getText={() => result.payload!.json!} />
            ) : undefined
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={result.payload?.json ?? ""}
            placeholder={L.payload}
          />
        </Panel>
      </div>
    </div>
  );
}
