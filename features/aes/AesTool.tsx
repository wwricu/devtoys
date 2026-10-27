"use client";

import { useState } from "react";
import {
  CopyButton,
  editorClass,
  Panel,
  Segmented,
  Split,
  StatusLine,
  ToolButton,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import { decrypt, encrypt, type AesAlgorithm } from "./format";
import { strings } from "./locale";

type Mode = "encrypt" | "decrypt";

export default function AesTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [mode, setMode] = useStoredState<Mode>("aes.mode", "encrypt");
  const [algorithm, setAlgorithm] = useStoredState<AesAlgorithm>(
    "aes.algorithm",
    "A256GCM",
  );
  const [secret, setSecret] = useStoredState<string>("aes.key", "");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "encrypt", label: L.encrypt },
    { value: "decrypt", label: L.decrypt },
  ];

  // GCM parameter names are language-neutral, so the labels stay as printed.
  const algorithmOptions: { value: AesAlgorithm; label: string }[] = [
    { value: "A256GCM", label: "AES-256-GCM" },
    { value: "A128GCM", label: "AES-128-GCM" },
  ];

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
        <Segmented
          value={mode}
          options={modeOptions}
          onChange={setMode}
          ariaLabel={L.direction}
        />
        <Segmented
          value={algorithm}
          options={algorithmOptions}
          onChange={setAlgorithm}
          ariaLabel={L.algorithm}
        />
        <input
          type="password"
          className="w-52 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder={L.passphrase}
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <ToolButton onClick={run}>
          {busy ? L.working : mode === "encrypt" ? L.encrypt : L.decrypt}
        </ToolButton>
      </div>

      <Split>
        <Panel
          title={mode === "encrypt" ? L.plainText : L.payload}
          actions={
            <>
              <ToolButton
                onClick={() => {
                  setInput("");
                  setOutput("");
                }}
              >
                {t.clear}
              </ToolButton>
              <CopyButton getText={() => input} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={mode === "encrypt" ? L.encryptHint : L.payloadHint}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel
          title={mode === "encrypt" ? L.payload : L.plainText}
          actions={
            <>
              <ToolButton
                onClick={() => setInput(output)}
                title={t.outputToInputHint}
              >
                {t.outputToInput}
              </ToolButton>
              <CopyButton getText={() => output} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={t.result}
            value={output}
          />
        </Panel>
      </Split>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          busy
            ? L.deriving
            : output
              ? fill(L.payloadNote, { alg: algorithm })
              : L.localNote
        }
      />
    </div>
  );
}
