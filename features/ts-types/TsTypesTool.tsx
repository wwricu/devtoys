"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { defaultTsOptions, jsonToTypeScript } from "./format";

const yesNo: { value: string; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function TsTypesTool() {
  const [exportTypes, setExportTypes] = useStoredState<string>(
    "tstypes.export",
    "yes",
  );
  const [arraySyntax, setArraySyntax] = useStoredState<string>(
    "tstypes.array",
    "no",
  );
  const [readonly, setReadonly] = useStoredState<string>(
    "tstypes.readonly",
    "no",
  );
  const [unknownAsAny, setUnknownAsAny] = useStoredState<string>(
    "tstypes.any",
    "no",
  );

  return (
    <SimpleTransform
      controls={
        <>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            export
          </span>
          <Segmented
            ariaLabel="Export declarations"
            value={exportTypes}
            options={yesNo}
            onChange={setExportTypes}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Array&lt;T&gt;
          </span>
          <Segmented
            ariaLabel="Array syntax"
            value={arraySyntax}
            options={yesNo}
            onChange={setArraySyntax}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            readonly
          </span>
          <Segmented
            ariaLabel="Readonly members"
            value={readonly}
            options={yesNo}
            onChange={setReadonly}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            unknown as any
          </span>
          <Segmented
            ariaLabel="Unknown type"
            value={unknownAsAny}
            options={yesNo}
            onChange={setUnknownAsAny}
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        const { output, error } = jsonToTypeScript(input, {
          ...defaultTsOptions,
          exportTypes: exportTypes === "yes",
          preferArraySyntax: arraySyntax === "yes",
          readonly: readonly === "yes",
          unknownAsAny: unknownAsAny === "yes",
        });
        return { output, error, note: error ? undefined : "interfaces" };
      }}
      inputPlaceholder='{\n  "id": 1,\n  "tags": ["a", "b"]\n}'
      outputPlaceholder="TypeScript declarations"
    />
  );
}
