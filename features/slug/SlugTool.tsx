"use client";

import { Segmented, ToolButton, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { fill, useLang, useText } from "@/lib/i18n";
import { slugStats, slugify, type SlugOptions } from "./format";
import { strings } from "./locale";

export default function SlugTool() {
  const { t } = useLang();
  const L = useText(strings);
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

  const separators: { value: "-" | "_" | " "; label: string }[] = [
    { value: "-", label: L.hyphen },
    { value: "_", label: L.underscore },
    { value: " ", label: L.space },
  ];

  return (
    <SimpleTransform
      inputPlaceholder={L.titleHint}
      outputPlaceholder={t.result}
      controls={
        <>
          <Segmented
            value={separator}
            options={separators}
            onChange={setSeparator}
            ariaLabel={L.separator}
          />
          <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={lower === "yes"}
              onChange={(e) => setLower(e.target.checked ? "yes" : "no")}
              className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
            />
            {L.lowerCase}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={unicode === "yes"}
              onChange={(e) => setUnicode(e.target.checked ? "yes" : "no")}
              className="size-3.5 accent-neutral-700 dark:accent-neutral-300"
            />
            {L.keepUnicode}
          </label>
          <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            {L.max}
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
            {t.reset}
          </ToolButton>
        </>
      }
      run={(input) => {
        if (input.trim() === "")
          return { output: "", error: null, note: L.stripNote };
        const options: SlugOptions = {
          separator,
          lower: lower === "yes",
          preserveUnicode: unicode === "yes",
          maxLength: Math.max(0, Math.round(Number(limit) || 0)),
        };
        const output = slugify(input, options);
        const { words, parts } = slugStats(input, output, separator);
        return {
          output,
          error: output === "" ? L.nothingLeft : null,
          note: fill(L.stats, { words, parts }),
        };
      }}
    />
  );
}
