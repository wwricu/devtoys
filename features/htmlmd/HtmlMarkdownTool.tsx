"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import { htmlToMarkdown } from "./format";
import { strings } from "./locale";

export default function HtmlMarkdownTool() {
  const L = useText(strings);
  const [setext, setSetext] = useStoredState<string>("htmlmd.setext", "atx");
  const [tables, setTables] = useStoredState<string>("htmlmd.tables", "md");

  const setextOptions: { value: string; label: string }[] = [
    { value: "atx", label: L.atx },
    { value: "setext", label: L.setext },
  ];

  const tableOptions: { value: string; label: string }[] = [
    { value: "md", label: L.tableMd },
    { value: "html", label: L.tableHtml },
  ];

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented
            value={setext}
            options={setextOptions}
            onChange={setSetext}
            ariaLabel={L.headingStyle}
          />
          <Segmented
            value={tables}
            options={tableOptions}
            onChange={setTables}
            ariaLabel={L.tableHandling}
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        try {
          return {
            output: htmlToMarkdown(input, {
              setext: setext === "setext",
              keepTables: tables === "md",
            }),
            error: null,
          };
        } catch (err) {
          return {
            output: "",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }}
      inputPlaceholder="<h1>Title</h1>\n<p>Some <strong>markup</strong> to convert.</p>"
      outputPlaceholder={L.markdown}
    />
  );
}
