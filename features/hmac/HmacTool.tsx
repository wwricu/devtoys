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
import { DIGESTS, hmacOf, normalizeSignature, type Digest, type HmacResult } from "./format";

export default function HmacTool() {
  const [digest, setDigest] = useStoredState<Digest>("hmac.digest", "SHA-256");
  const [secretHex, setSecretHex] = useStoredState("hmac.secretHex", false);
  const [secret, setSecret] = useState("secret");
  const [message, setMessage] = useState("the quick brown fox");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<HmacResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (message === "" || secret === "") {
      setResult(null);
      setError(null);
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
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
        ? { label: "Signature matches", tone: "ok" as const }
        : { label: "Signature does not match", tone: "bad" as const };

  const inputClass =
    "w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={digest} options={DIGESTS} onChange={setDigest} ariaLabel="Hash" />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={secretHex}
            onChange={(e) => setSecretHex(e.target.checked)}
          />
          Key is hex
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Panel title="Key" className="flex-none">
            <input
              className={inputClass + " m-2"}
              spellCheck={false}
              placeholder="Shared secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </Panel>
          <Panel
            title="Message"
            actions={<CopyButton getText={() => message} />}
            className="min-h-32"
          >
            <textarea
              className={editorClass}
              spellCheck={false}
              placeholder="Payload to sign…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Panel>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Panel title="Signature" className="flex-none">
            <div className="flex flex-col gap-2 p-2 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-neutral-500">Hex</span>
                  {result && <CopyButton getText={() => result.hex} />}
                </div>
                <p className="break-all font-mono text-neutral-800 dark:text-neutral-200">
                  {result?.hex ?? "—"}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-neutral-500">Base64</span>
                  {result && <CopyButton getText={() => result.base64} />}
                </div>
                <p className="break-all font-mono text-neutral-800 dark:text-neutral-200">
                  {result?.base64 ?? "—"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Verify a received signature" className="flex-none">
            <div className="p-2">
              <input
                className={inputClass}
                spellCheck={false}
                placeholder="sha256=abc123… or bare hex/base64"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
              {verdict && (
                <p
                  className={`mt-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                    verdict.tone === "ok"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {verdict.label}
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          result
            ? `HMAC-${digest} computed in your browser, nothing is uploaded`
            : "Enter a key and a message"
        }
      />
    </div>
  );
}
