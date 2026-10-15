export interface UrlParam {
  key: string;
  value: string;
}

export interface UrlParts {
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  path: string;
  search: string;
  hash: string;
  origin: string;
  segments: string[];
  params: UrlParam[];
  inferredScheme: boolean;
}

export interface UrlParseResult {
  parts: UrlParts | null;
  error: string | null;
}

function decode(token: string): string {
  try {
    return decodeURIComponent(token.replace(/\+/g, " "));
  } catch {
    return token;
  }
}

export function parseUrl(text: string): UrlParseResult {
  const raw = text.trim();
  if (raw === "") return { parts: null, error: null };
  if (/\s/.test(raw))
    return { parts: null, error: "A URL cannot contain whitespace" };

  let u: URL;
  let inferredScheme = false;
  try {
    u = new URL(raw);
  } catch {
    try {
      u = new URL(`https://${raw}`);
      inferredScheme = true;
    } catch {
      return { parts: null, error: "Not a parseable URL" };
    }
  }

  const params: UrlParam[] = [];
  const query = u.search.replace(/^\?/, "");
  if (query !== "")
    for (const pair of query.split("&")) {
      const eq = pair.indexOf("=");
      if (eq === -1) params.push({ key: decode(pair), value: "" });
      else params.push({ key: decode(pair.slice(0, eq)), value: decode(pair.slice(eq + 1)) });
    }

  const segments = u.pathname.split("/").filter((s) => s !== "");

  return {
    parts: {
      protocol: inferredScheme ? "" : u.protocol,
      username: u.username,
      password: u.password,
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      path: decode(u.pathname),
      search: decode(u.search.replace(/^\?/, "")),
      hash: decode(u.hash.replace(/^#/, "")),
      origin: inferredScheme ? "" : u.origin,
      segments: segments.map(decode),
      params,
      inferredScheme,
    },
    error: null,
  };
}
