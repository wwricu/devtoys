"use client";

import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { slugStats, slugify, type SlugOptions } from "./format";

const SEPARATORS: { value: "-" | "_" | " "; label: string }[] = [
  { value: "-", label: "hyphen" },
  { value: "_", label: "underscore" },
  { value: " ", label: "space" },
];

const YES_NO: { value: "yes" | "no"; label: string }[] = [
  { value: "yes", label: "yes" },
  { value: "no", label: "no" },
];

export default function SlugTool() {
  const [separator, setSeparator] = useStoredState<SlugOptions["separator"]>(
    "slug.sep",
    "-",
  );
  const [lower, setLower] = useStoredState<"yes" | "no">("slug.lower", "yes");
  const [unicode, setUnicode] = useStoredState<"yes" | "no">(
    "slug.unicode",
    "no",
  );
  const [limit, setLimit] = useStoredState<string>("slug.limit", "0");

  return (
    <SimpleTransform
      inputPlaceholder="Type a title to turn into a slug"
      controls={
        <>
          <Segmented
            value={separator}
            options={SEPARATORS}
            onChange={setSeparator}
            ariaLabel="Separator"
          />
          <Segmented
            value={lower}
            options={YES_NO}
            onChange={setLower}
            ariaLabel="Lower case"
          />
          <Segmented
            value={unicode}
            options={YES_NO}
            onChange={setUnicode}
            ariaLabel="Keep non-Latin letters"
          />
          <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            Max
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-16 rounded border border-neutral-300 bg-transparent px-1 py-0.5 font-mono text-xs dark:border-neutral-700"
            />
          </label>
          <ToolButton
            onClick={() => {
              setSeparator("-");
              setLower("yes");
              setUnicode("no");
              setLimit("0");
            }}
          >
            Reset
          </ToolButton>
        </>
      }
      run={(input) => {
        if (input.trim() === "")
          return {
            output: "",
            error: null,
            note: "Slugify strips punctuation and accents",
          };
        const options: SlugOptions = {
          separator,
          lower: lower === "yes",
          preserveUnicode: unicode === "yes",
          maxLength: Math.max(0, Math.round(Number(limit) || 0)),
        };
        const output = slugify(input, options);
        return {
          output,
          error:
            output === ""
              ? "Nothing left after removing the non-word characters"
              : null,
          note: slugStats(input, output, separator),
        };
      }}
    />
  );
}
