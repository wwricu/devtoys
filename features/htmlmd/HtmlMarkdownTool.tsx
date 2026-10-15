"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { htmlToMarkdown } from "./format";

const setextOptions: { value: string; label: string }[] = [
  { value: "atx", label: "# Headings" },
  { value: "setext", label: "Underlined" },
];

const tableOptions: { value: string; label: string }[] = [
  { value: "md", label: "Tables as Markdown" },
  { value: "html", label: "Tables as HTML" },
];

export default function HtmlMarkdownTool() {
  const [setext, setSetext] = useStoredState<string>("htmlmd.setext", "atx");
  const [tables, setTables] = useStoredState<string>("htmlmd.tables", "md");

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented
            value={setext}
            options={setextOptions}
            onChange={setSetext}
            ariaLabel="Heading style"
          />
          <Segmented
            value={tables}
            options={tableOptions}
            onChange={setTables}
            ariaLabel="Table handling"
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        try {
          return {
            output: htmlToMarkdown(input, { setext: setext === "setext", keepTables: tables === "md" }),
            error: null,
          };
        } catch (err) {
          return { output: "", error: err instanceof Error ? err.message : String(err) };
        }
      }}
      inputPlaceholder="<h1>Title</h1>\n<p>Some <strong>markup</strong> to convert.</p>"
      outputPlaceholder="Markdown"
    />
  );
}
