"use client";

import { useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  HMAC_ALGS,
  signJwt,
  verifyJwt,
  type HmacAlg,
  type VerifyResult,
} from "./sign";
import { strings } from "./locale";

const DEFAULT_HEADER = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
const DEFAULT_PAYLOAD =
  '{\n  "sub": "1234567890",\n  "name": "Ada",\n  "iat": 1700000000\n}';

export default function JwtSigner() {
  const L = useText(strings);
  const [alg, setAlg] = useStoredState<HmacAlg>("jwt.alg", "HS256");
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [secret, setSecret] = useState("your-256-bit-secret");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  // JWA algorithm ids are language-neutral, so the labels stay as printed.
  const algOptions = HMAC_ALGS.map((a) => ({ value: a, label: a }));

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

  const verdict = (r: VerifyResult) => {
    switch (r.code) {
      case "segments":
        return L.verifySegments;
      case "header":
        return L.verifyHeader;
      case "unsupported-alg":
        return fill(L.verifyOnlyHmac, { alg: r.reportedAlg ?? "" });
      case "matches":
        return L.verifyMatches;
      default:
        return L.verifyMismatch;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={alg}
          options={algOptions}
          onChange={setAlg}
          ariaLabel={L.algorithm}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          {L.secret}
          <input
            className="w-56 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            spellCheck={false}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </label>
        <ToolButton onClick={sign}>{L.sign}</ToolButton>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <Split>
        <Panel title={L.header}>
          <textarea
            className={editorClass}
            spellCheck={false}
            value={header}
            onChange={(e) => setHeader(e.target.value)}
          />
        </Panel>
        <Panel title={L.payload}>
          <textarea
            className={editorClass}
            spellCheck={false}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </Panel>
      </Split>

      <Panel
        title={L.signedToken}
        actions={token ? <CopyButton getText={() => token} /> : undefined}
      >
        <textarea
          className={editorClass + " min-h-16 flex-none"}
          spellCheck={false}
          readOnly
          placeholder={L.pressSign}
          value={token}
        />
      </Panel>

      <Panel
        title={L.verify}
        actions={<ToolButton onClick={verify}>{L.checkSignature}</ToolButton>}
      >
        <div className="flex flex-col gap-1 p-2">
          <textarea
            className={
              editorClass +
              " min-h-14 flex-none rounded border border-neutral-200 dark:border-neutral-800"
            }
            spellCheck={false}
            placeholder={L.verifyHint}
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
              {verdict(result)}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
