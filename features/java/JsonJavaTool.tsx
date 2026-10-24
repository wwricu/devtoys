"use client";

import { useState } from "react";
import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform, type TransformResult } from "@/components/transform";
import { fill, useText } from "@/lib/i18n";
import { defaultJavaOptions, jsonToJava, type JavaStyle } from "./jsonToJava";
import { javaClassToJson } from "./javaToJson";
import { strings } from "./locale";

type Direction = "jsonToJava" | "javaToJson";

export default function JsonJavaTool() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "java.direction",
    "jsonToJava",
  );
  const [style, setStyle] = useStoredState<JavaStyle>("java.style", "pojo");
  const [className, setClassName] = useState(defaultJavaOptions.rootName);

  const toJava = direction === "jsonToJava";

  const run = (input: string): TransformResult => {
    if (input.trim() === "") return { output: "", error: null };
    if (toJava) {
      const { output, error, classes } = jsonToJava(input, {
        rootName: className,
        style,
      });
      return {
        output,
        error,
        note: error ? undefined : fill(L.noteClasses, { count: classes }),
      };
    }
    const { output, error, root, unresolved } = javaClassToJson(input);
    if (error) return { output: "", error };
    const note =
      unresolved.length > 0
        ? `${fill(L.noteRoot, { root })} · ${fill(L.noteUnresolved, { count: unresolved.length })}`
        : fill(L.noteRoot, { root });
    return { output, error: null, note };
  };

  return (
    <SimpleTransform
      run={run}
      inputPlaceholder={toJava ? L.jsonHint : L.javaHint}
      outputPlaceholder={toJava ? L.outputJava : L.outputJson}
      controls={
        <>
          <Segmented
            value={direction}
            options={[
              { value: "jsonToJava", label: L.jsonToJava },
              { value: "javaToJson", label: L.javaToJson },
            ]}
            onChange={setDirection}
            ariaLabel={L.direction}
          />
          {toJava && (
            <>
              <input
                aria-label={L.classHintLabel}
                className="w-32 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
                placeholder={defaultJavaOptions.rootName}
                spellCheck={false}
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <Segmented
                value={style}
                options={[
                  { value: "pojo", label: L.pojo },
                  { value: "lombok", label: L.lombok },
                  { value: "record", label: L.record },
                ]}
                onChange={setStyle}
                ariaLabel={L.styleLabel}
              />
            </>
          )}
        </>
      }
    />
  );
}
