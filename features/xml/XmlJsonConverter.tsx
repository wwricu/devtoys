"use client";

import { Segmented, useStoredState } from "@/components/kit";
import { SimpleTransform } from "@/components/transform";
import { useText } from "@/lib/i18n";
import {
  defaultXmlJsonOptions,
  jsonToXml,
  xmlToJson,
  type XmlJsonOptions,
} from "./convert";
import { strings } from "./locale";

type Direction = "xml" | "json";

const options = (keepAttributes: boolean): XmlJsonOptions => ({
  ...defaultXmlJsonOptions,
  ignoreAttributes: !keepAttributes,
});

export default function XmlJsonConverter() {
  const L = useText(strings);
  const [direction, setDirection] = useStoredState<Direction>(
    "xmljson.direction",
    "xml",
  );
  const [keep, setKeep] = useStoredState<string>("xmljson.attributes", "keep");

  const directionOptions: { value: Direction; label: string }[] = [
    { value: "xml", label: L.convXmlToJson },
    { value: "json", label: L.convJsonToXml },
  ];

  const attributeOptions: { value: string; label: string }[] = [
    { value: "keep", label: L.convKeepAttr },
    { value: "drop", label: L.convDropAttr },
  ];

  return (
    <SimpleTransform
      controls={
        <>
          <Segmented
            value={direction}
            options={directionOptions}
            onChange={setDirection}
            ariaLabel={L.convDirection}
          />
          <Segmented
            value={keep}
            options={attributeOptions}
            onChange={setKeep}
            ariaLabel={L.convAttrHandling}
          />
        </>
      }
      run={(input) => {
        if (input.trim() === "") return { output: "", error: null };
        if (direction === "xml") {
          const { value, error } = xmlToJson(input, options(keep === "keep"));
          if (error) return { output: "", error };
          return {
            output: JSON.stringify(value, null, 2),
            error: null,
            note: L.convReadNote,
          };
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(input);
        } catch (err) {
          return {
            output: "",
            error: err instanceof Error ? err.message : String(err),
          };
        }
        const { output, error } = jsonToXml(parsed, options(keep === "keep"));
        return error
          ? { output: "", error }
          : { output, error: null, note: L.convWriteNote };
      }}
      inputPlaceholder={
        direction === "xml"
          ? '<book id="1"><title>Title</title></book>'
          : '{\n  "book": { "@_id": "1", "title": "Title" }\n}'
      }
    />
  );
}
