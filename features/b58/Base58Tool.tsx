"use client";

import { useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  alphabetFor,
  base58ToBytes,
  bytesToBase58,
  bytesToHex,
  decodeCheck,
  encodeCheck,
  hexToBytes,
} from "./format";
import { strings } from "./locale";

type Direction = "to58" | "from58" | "hexTo58" | "58ToHex";

export default function Base58Tool() {
  const { t } = useLang();
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "b58.direction",
    "to58",
  );
  const [alphabet, setAlphabet] = useStoredState<string>(
    "b58.alphabet",
    "bitcoin",
  );
  const [checked, setChecked] = useStoredState<boolean>("b58.check", false);
  const [input, setInput] = useState("Hello, Base58!");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const directions: { value: Direction; label: string }[] = [
    { value: "to58", label: L.textTo58 },
    { value: "from58", label: L.b58ToText },
    { value: "hexTo58", label: L.hexTo58 },
    { value: "58ToHex", label: L.b58ToHex },
  ];

  const alphabetOptions: { value: string; label: string }[] = [
    { value: "bitcoin", label: L.bitcoin },
    { value: "ripple", label: L.ripple },
  ];

  const run = async () => {
    setError(null);
    const letters = alphabetFor(alphabet);
    try {
      switch (direction) {
        case "to58": {
          const bytes = new TextEncoder().encode(input);
          setOutput(
            checked
              ? await encodeCheck(bytes, letters)
              : bytesToBase58(bytes, letters),
          );
          break;
        }
        case "from58": {
          const bytes = checked
            ? await decodeCheck(input, letters)
            : base58ToBytes(input, letters);
          setOutput(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
          break;
        }
        case "hexTo58": {
          const bytes = hexToBytes(input);
          setOutput(
            checked
              ? await encodeCheck(bytes, letters)
              : bytesToBase58(bytes, letters),
          );
          break;
        }
        case "58ToHex": {
          const bytes = checked
            ? await decodeCheck(input, letters)
            : base58ToBytes(input, letters);
          setOutput(bytesToHex(bytes));
          break;
        }
      }
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          options={directions}
          onChange={setDirection}
          ariaLabel={L.direction}
        />
        <Segmented
          value={alphabet}
          options={alphabetOptions}
          onChange={setAlphabet}
          ariaLabel={L.alphabet}
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {L.base58check}
        </label>
        <ToolButton onClick={run}>{L.convert}</ToolButton>
        <ToolButton
          onClick={() => setInput(output)}
          title={t.outputToInputHint}
        >
          {t.outputToInput}
        </ToolButton>
        <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel title={t.input} actions={<CopyButton getText={() => input} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={
              direction === "to58" ? L.inputTextHint : L.inputB58Hint
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title={t.output} actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={output}
            placeholder={t.result}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? fill(L.stats, {
                algo: checked ? L.base58check : L.base58,
                alphabet: alphabet === "ripple" ? L.ripple : L.bitcoin,
                n: output.length,
              })
            : L.privacy
        }
      />
    </div>
  );
}
