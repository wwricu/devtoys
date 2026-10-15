"use client";

import { useEffect, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  hmacOf,
  normalizeSignature,
  type Digest,
  type HmacResult,
} from "./format";
import { strings } from "./locale";

export default function HmacTool() {
  const L = useText(strings);
  const [digest, setDigest] = useStoredState<Digest>("hmac.digest", "SHA-256");
  const [secretHex, setSecretHex] = useStoredState("hmac.secretHex", false);
  const [secret, setSecret] = useState("secret");
  const [message, setMessage] = useState("the quick brown fox");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<HmacResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Digest names are language-neutral, so the labels stay as printed.
  const digestOptions: { value: Digest; label: string }[] = [
    { value: "SHA-1", label: "SHA-1" },
    { value: "SHA-256", label: "SHA-256" },
    { value: "SHA-384", label: "SHA-384" },
    { value: "SHA-512", label: "SHA-512" },
  ];

  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      if (message === "" || secret === "") {
        setResult(null);
        setError(null);
        return;
      }
      hmacOf(secret, message, digest, secretHex)
        .then((r) => {
          if (alive) {
            setResult(r);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (alive) {
            setResult(null);
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [secret, message, digest, secretHex]);

  const checked = normalizeSignature(expected);
  const verdict =
    checked === "" || !result
      ? null
      : result.hex === checked || result.base64 === checked
        ? { ok: true }
        : { ok: false };

  const inputClass =
    "w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={digest}
          options={digestOptions}
          onChange={setDigest}
          ariaLabel={L.hash}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={secretHex}
            onChange={(e) => setSecretHex(e.target.checked)}
          />
          {L.keyIsHex}
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Panel title={L.key} className="flex-none">
            <input
              className={inputClass + " m-2"}
              spellCheck={false}
              placeholder={L.sharedSecret}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </Panel>
          <Panel
            title={L.message}
            actions={<CopyButton getText={() => message} />}
            className="min-h-32"
          >
            <textarea
              className={editorClass}
              spellCheck={false}
              placeholder={L.messageHint}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Panel>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Panel title={L.signature} className="flex-none">
            <div className="flex flex-col gap-2 p-2 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-neutral-500">{L.hex}</span>
                  {result && <CopyButton getText={() => result.hex} />}
                </div>
                <p className="break-all font-mono text-neutral-800 dark:text-neutral-200">
                  {result?.hex ?? "—"}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-neutral-500">{L.base64}</span>
                  {result && <CopyButton getText={() => result.base64} />}
                </div>
                <p className="break-all font-mono text-neutral-800 dark:text-neutral-200">
                  {result?.base64 ?? "—"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title={L.verifyTitle} className="flex-none">
            <div className="p-2">
              <input
                className={inputClass}
                spellCheck={false}
                placeholder={L.verifyHint}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
              {verdict && (
                <p
                  className={`mt-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                    verdict.ok
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {verdict.ok ? L.matches : L.mismatch}
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={result ? fill(L.computed, { digest }) : L.enterKey}
      />
    </div>
  );
}
