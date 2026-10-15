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
import {
  ALPHABETS,
  alphabetFor,
  base58ToBytes,
  bytesToBase58,
  bytesToHex,
  decodeCheck,
  encodeCheck,
  hexToBytes,
} from "./format";

type Direction = "to58" | "from58" | "hexTo58" | "58ToHex";

const directions: { value: Direction; label: string }[] = [
  { value: "to58", label: "Text to Base58" },
  { value: "from58", label: "Base58 to Text" },
  { value: "hexTo58", label: "Hex to Base58" },
  { value: "58ToHex", label: "Base58 to Hex" },
];

export default function Base58Tool() {
  const [direction, setDirection] = useStoredState<Direction>("b58.direction", "to58");
  const [alphabet, setAlphabet] = useStoredState<string>("b58.alphabet", "bitcoin");
  const [checked, setChecked] = useStoredState<boolean>("b58.check", false);
  const [input, setInput] = useState("Hello, Base58!");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    const letters = alphabetFor(alphabet);
    try {
      switch (direction) {
        case "to58": {
          const bytes = new TextEncoder().encode(input);
          setOutput(checked ? await encodeCheck(bytes, letters) : bytesToBase58(bytes, letters));
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
          setOutput(checked ? await encodeCheck(bytes, letters) : bytesToBase58(bytes, letters));
          break;
        }
        case "58ToHex": {
          const bytes = checked ? await decodeCheck(input, letters) : base58ToBytes(input, letters);
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
        <Segmented value={direction} options={directions} onChange={setDirection} ariaLabel="Direction" />
        <Segmented
          value={alphabet}
          options={ALPHABETS}
          onChange={setAlphabet}
          ariaLabel="Alphabet"
        />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          Base58Check
        </label>
        <ToolButton onClick={run}>Convert</ToolButton>
        <ToolButton onClick={() => setInput(output)} title="Move output back into the input">
          Output to Input
        </ToolButton>
        <ToolButton onClick={() => setInput("")}>Clear</ToolButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <Panel title="Input" actions={<CopyButton getText={() => input} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={direction === "to58" ? "Text to encode" : "Base58 text"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Panel>
        <Panel title="Output" actions={<CopyButton getText={() => output} />}>
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            value={output}
            placeholder="Result"
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={
          output
            ? `${checked ? "Base58Check" : "Base58"} · ${alphabet} alphabet · ${output.length} characters`
            : "Nothing runs outside this tab"
        }
      />
    </div>
  );
}
