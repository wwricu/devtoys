"use client";

import { useState } from "react";
import { CopyButton, Panel, Segmented, ToolButton, editorClass, useStoredState } from "@/components/kit";
import { HMAC_ALGS, signJwt, verifyJwt, type HmacAlg, type VerifyResult } from "./sign";

const DEFAULT_HEADER = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
const DEFAULT_PAYLOAD = '{\n  "sub": "1234567890",\n  "name": "Ada",\n  "iat": 1700000000\n}';

const algOptions = HMAC_ALGS.map((a) => ({ value: a, label: a }));

export default function JwtSigner() {
  const [alg, setAlg] = useStoredState<HmacAlg>("jwt.alg", "HS256");
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [secret, setSecret] = useState("your-256-bit-secret");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  const sign = async () => {
    try {
      setError(null);
      const jwt = await signJwt({ alg, header, payload, secret });
      setToken(jwt);
    } catch (err) {
      setToken("");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const verify = async () => {
    setError(null);
    setResult(await verifyJwt(verifying, secret));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={alg} options={algOptions} onChange={setAlg} ariaLabel="Algorithm" />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          Secret
          <input
            className="w-56 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            spellCheck={false}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </label>
        <ToolButton onClick={sign}>Sign</ToolButton>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
        <Panel title="Header">
          <textarea
            className={editorClass}
            spellCheck={false}
            value={header}
            onChange={(e) => setHeader(e.target.value)}
          />
        </Panel>
        <Panel title="Payload">
          <textarea
            className={editorClass}
            spellCheck={false}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </Panel>
      </div>

      <Panel title="Signed token" actions={token ? <CopyButton getText={() => token} /> : undefined}>
        <textarea
          className={editorClass + " min-h-16 flex-none"}
          spellCheck={false}
          readOnly
          placeholder="Press Sign to create a token…"
          value={token}
        />
      </Panel>

      <Panel
        title="Verify"
        actions={<ToolButton onClick={verify}>Check signature</ToolButton>}
      >
        <div className="flex flex-col gap-1 p-2">
          <textarea
            className={editorClass + " min-h-14 flex-none rounded border border-neutral-200 dark:border-neutral-800"}
            spellCheck={false}
            placeholder="Paste a token to verify with the same secret…"
            value={verifying}
            onChange={(e) => setVerifying(e.target.value)}
          />
          {result && (
            <p
              className={`text-xs ${
                result.verified
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {result.alg ? `${result.alg}: ` : ""}
              {result.message}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
