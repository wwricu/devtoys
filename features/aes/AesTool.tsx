"use client";

import { useState } from "react";
import { CopyButton, Panel, Segmented, StatusLine, ToolButton, editorClass, useStoredState } from "@/components/kit";
import { ALGORITHMS, decrypt, encrypt, type AesAlgorithm } from "./format";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "encrypt", label: "Encrypt" },
  { value: "decrypt", label: "Decrypt" },
];

type Mode = "encrypt" | "decrypt";

export default function AesTool() {
  const [mode, setMode] = useStoredState<Mode>("aes.mode", "encrypt");
  const [algorithm, setAlgorithm] = useStoredState<AesAlgorithm>("aes.algorithm", "A256GCM");
  const [secret, setSecret] = useStoredState<string>("aes.key", "");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (input.trim() === "") {
      setOutput("");
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "encrypt"
          ? await encrypt(input, secret, algorithm)
          : await decrypt(input, secret, algorithm);
      setOutput(result);
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={mode} options={modeOptions} onChange={setMode} ariaLabel="Direction" />
        <Segmented value={algorithm} options={ALGORITHMS} onChange={setAlgorithm} ariaLabel="Algorithm" />
        <input
          type="password"
          className="w-52 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="Passphrase"
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <ToolButton onClick={run}>{busy ? "Working…" : mode === "encrypt" ? "Encrypt" : "Decrypt"}</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel
          title={mode === "encrypt" ? "Plain text" : "Encrypted payload"}
          actions={
            <>
              <ToolButton onClick={() => { setInput(""); setOutput(""); }}>Clear</ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={mode === "encrypt" ? "Text to encrypt…" : "Paste Base64 payload…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={mode === "encrypt" ? "Encrypted payload" : "Plain text"}
          actions={
            <>
              <ToolButton onClick={() => setInput(output)} title="Move output back into the input">
                Output to Input
              </ToolButton>
              <CopyButton getText={() => output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Result"
            value={output}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          busy
            ? "Deriving a key with PBKDF2-SHA-256, 150 000 iterations…"
            : output
              ? `${algorithm} · salt + IV + tag are inside the Base64 payload`
              : "Encryption runs in your browser with the Web Crypto API"
        }
      />
    </div>
  );
}
