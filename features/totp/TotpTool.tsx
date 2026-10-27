"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useText } from "@/lib/i18n";
import {
  bytesToBase32,
  otpauthUri,
  totp,
  verifyTotp,
  type TotpOptions,
} from "./format";
import { strings } from "./locale";

const randomSecret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return bytesToBase32(bytes);
};

/** Result of the manual code check, kept structured so it re-translates. */
type Verdict =
  | { kind: "match"; counter: number }
  | { kind: "none" }
  | { kind: "error"; message: string };

export default function TotpTool() {
  const L = useText(strings);
  const [secret, setSecret] = useStoredState(
    "totp.secret",
    "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  );
  const [issuer, setIssuer] = useStoredState("totp.issuer", "Dev Toys");
  const [account, setAccount] = useStoredState(
    "totp.account",
    "user@example.com",
  );
  const [digits, setDigits] = useStoredState("totp.digits", 6);
  const [period, setPeriod] = useStoredState("totp.period", 30);
  const [algorithm, setAlgorithm] = useStoredState<TotpOptions["algorithm"]>(
    "totp.algorithm",
    "SHA-1",
  );
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(period);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // Hash names are language-neutral, so the labels stay as printed.
  const algorithmOptions: {
    value: TotpOptions["algorithm"];
    label: string;
  }[] = [
    { value: "SHA-1", label: "SHA-1" },
    { value: "SHA-256", label: "SHA-256" },
    { value: "SHA-512", label: "SHA-512" },
  ];

  const options = useMemo<TotpOptions>(
    () => ({ secret, digits, period, algorithm, at: now }),
    [secret, digits, period, algorithm, now],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    totp(options)
      .then((result) => {
        if (!alive) return;
        setCode(result.code);
        setSecondsLeft(result.secondsLeft);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setCode("");
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [options]);

  const uri = useMemo(
    () =>
      error
        ? ""
        : otpauthUri({
            label: account,
            issuer,
            options: { secret, digits, period, algorithm },
          }),
    [account, issuer, secret, digits, period, algorithm, error],
  );

  const runCheck = async () => {
    if (check.trim() === "") {
      setVerdict(null);
      return;
    }
    try {
      const counter = await verifyTotp({ ...options, at: Date.now() }, check);
      setVerdict(
        counter === null ? { kind: "none" } : { kind: "match", counter },
      );
    } catch (err) {
      setVerdict({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const verdictText = (v: Verdict) => {
    if (v.kind === "match") return fill(L.validAt, { counter: v.counter });
    if (v.kind === "none") return L.noMatch;
    // Secret decoding problems are technical diagnostics, kept as printed.
    return v.message;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-72 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder={L.secretHint}
          spellCheck={false}
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <ToolButton onClick={() => setSecret(randomSecret())}>
          {L.newSecret}
        </ToolButton>
        <Segmented
          value={algorithm}
          options={algorithmOptions}
          onChange={setAlgorithm}
          ariaLabel={L.algorithm}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          {L.digits}
          <input
            type="number"
            className="w-14 rounded border border-neutral-300 bg-white px-1.5 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            value={digits}
            min={6}
            max={10}
            onChange={(e) =>
              setDigits(Math.max(6, Math.min(10, Number(e.target.value) || 6)))
            }
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          {L.period}
          <input
            type="number"
            className="w-14 rounded border border-neutral-300 bg-white px-1.5 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            value={period}
            min={5}
            max={300}
            onChange={(e) =>
              setPeriod(
                Math.max(5, Math.min(300, Number(e.target.value) || 30)),
              )
            }
          />
          s
        </label>
      </div>

      <Split>
        <Panel title={L.currentCode}>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4">
            <p className="font-mono text-4xl tracking-widest text-neutral-800 dark:text-neutral-100">
              {code || "------"}
            </p>
            <div className="h-1 w-40 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-1000"
                style={{ width: `${(secondsLeft / period) * 100}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500">
              {fill(L.remaining, { seconds: secondsLeft })}
            </p>
            <div className="mt-2 flex w-full flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                {L.verifyCode}
                <input
                  className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
                  placeholder={L.codeHint}
                  value={check}
                  spellCheck={false}
                  onChange={(e) => setCheck(e.target.value)}
                  onBlur={runCheck}
                />
                <ToolButton onClick={runCheck}>{L.check}</ToolButton>
              </label>
              {verdict && (
                <p className="text-xs text-neutral-500">
                  {verdictText(verdict)}
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title={L.provisioning}
          actions={<CopyButton getText={() => uri} />}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
            <label className="flex items-center gap-2">
              {L.issuer}
              <input
                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              {L.account}
              <input
                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </label>
            <p className="break-all font-mono text-neutral-700 dark:text-neutral-200">
              {uri}
            </p>
            <p className="text-neutral-400">
              {fill(L.localNote, { algorithm })}
            </p>
          </div>
        </Panel>
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={code ? fill(L.status, { algorithm, digits, period }) : ""}
      />
    </div>
  );
}
