"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { defaultXmlJsonOptions, jsonToXml, xmlToJson, type XmlJsonOptions } from "./convert";

type Direction = "xml" | "json";

const directionOptions: { value: Direction; label: string }[] = [
  { value: "xml", label: "XML to JSON" },
  { value: "json", label: "JSON to XML" },
];

const attributeOptions: { value: string; label: string }[] = [
  { value: "keep", label: "Keep attributes" },
  { value: "drop", label: "Drop attributes" },
];

const options = (keepAttributes: boolean): XmlJsonOptions => ({
  ...defaultXmlJsonOptions,
  ignoreAttributes: !keepAttributes,
});

export default function XmlJsonConverter() {
  const [direction, setDirection] = useStoredState<Direction>("xmljson.direction", "xml");
  const [keep, setKeep] = useStoredState<string>("xmljson.attributes", "keep");

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented
            value={direction}
            options={directionOptions}
            onChange={setDirection}
            ariaLabel="Direction"
          />
          <Segmented
            value={keep}
            options={attributeOptions}
            onChange={setKeep}
            ariaLabel="Attribute handling"
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        if (direction === "xml") {
          const { value, error } = xmlToJson(input, options(keep === "keep"));
          if (error) return { output: "", error };
          return { output: JSON.stringify(value, null, 2), error: null, note: "read as XML" };
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(input);
        } catch (err) {
          return { output: "", error: err instanceof Error ? err.message : String(err) };
        }
        const { output, error } = jsonToXml(parsed, options(keep === "keep"));
        return error ? { output: "", error } : { output, error: null, note: "written as XML" };
      }}
      inputPlaceholder={
        direction === "xml"
          ? '<book id="1"><title>Title</title></book>'
          : '{\n  "book": { "@_id": "1", "title": "Title" }\n}'
      }
    />
  );
}
