export type UrlScope = "component" | "uri" | "form";

export function encodeUrl(text: string, scope: UrlScope): string {
  if (scope === "component") return encodeURIComponent(text);
  if (scope === "uri") return encodeURI(text);
  return encodeURIComponent(text)
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%27/g, "'")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%7E/g, "~");
}

export function decodeUrl(text: string, scope: UrlScope): string {
  const s = scope === "form" ? text.replace(/\+/g, " ") : text;
  return decodeURIComponent(s);
}
