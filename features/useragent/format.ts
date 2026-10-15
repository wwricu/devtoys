export interface AgentInfo {
  browser: string;
  browserVersion: string;
  engine: string;
  engineVersion: string;
  os: string;
  osVersion: string;
  device: string;
  raw: string;
}

function firstNumber(value: string | null): string {
  if (!value) return "";
  const match = /^(\d+)/.exec(value);
  return match ? match[1] : value;
}

export function parseUserAgent(ua: string): AgentInfo {
  const raw = ua.trim();
  const tokens = raw.replace(/^.*?\(|\).*/g, " ").length > 0 ? [...raw.matchAll(/([A-Za-z0-9._-]+)\/([0-9][0-9a-zA-Z._-]*)/g)].map((m) => m[0]) : [];
  const inside = [...raw.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join("; ");
  const names = tokens.map((t) => t.split("/")[0]);

  const versionOf = (name: string) => {
    const index = names.indexOf(name);
    return index < 0 ? null : tokens[index].slice(name.length + 1);
  };

  const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(raw);

  let browser = "Unknown";
  let version: string | null = null;

  const toolToken = tokens.find((t) =>
    /^(curl|wget|httpie|axios|python-requests|node-fetch|okhttp|java|go-http-client|libwww-perl|postman-runtime|insomnia|unity)/i.test(
      t.split("/")[0],
    ),
  );
  const botToken = tokens.find((t) => /(bot|crawler|spider|crawling)/i.test(t.split("/")[0]));

  if (toolToken) {
    const name = toolToken.split("/")[0];
    browser = `${name} (command line tool)`;
    version = toolToken.slice(name.length + 1);
  } else if (botToken) {
    const name = botToken.split("/")[0];
    browser = `${name} (bot)`;
    version = botToken.slice(name.length + 1);
  } else if (names.includes("Edg") && names.includes("Chrome")) {
    browser = "Microsoft Edge";
    version = versionOf("Edg");
  } else if (names.includes("OPR") || names.includes("Opera")) {
    browser = "Opera";
    version = versionOf("OPR") ?? versionOf("Opera");
  } else if (names.includes("CriOS")) {
    browser = "Chrome (iOS)";
    version = versionOf("CriOS");
  } else if (names.includes("FxiOS")) {
    browser = "Firefox (iOS)";
    version = versionOf("FxiOS");
  } else if (names.includes("Silk")) {
    browser = "Amazon Silk";
    version = versionOf("Silk");
  } else if (names.includes("SamsungBrowser")) {
    browser = "Samsung Internet";
    version = versionOf("SamsungBrowser");
  } else if (names.includes("Electron")) {
    browser = "Electron app";
    version = versionOf("Electron");
  } else if (names.includes("Fennec") && names.includes("Firefox")) {
    browser = "Firefox Mobile";
    version = versionOf("Fennec") ?? versionOf("Firefox");
  } else if (names.includes("Firefox")) {
    browser = "Firefox";
    version = versionOf("Firefox");
  } else if (names.includes("OPiOS")) {
    browser = "Opera (iOS)";
    version = versionOf("OPiOS");
  } else if (names.includes("Chrome")) {
    browser = isPhone ? "Chrome Mobile" : "Chrome";
    version = versionOf("Chrome");
  } else if (names.includes("Safari") && names.includes("Version")) {
    browser = isPhone ? "Safari Mobile" : "Safari";
    version = versionOf("Version");
  } else if (names.includes("Version")) {
    browser = "Other browser";
    version = versionOf("Version");
  }

  const iosWebKit = names.includes("CriOS") || names.includes("FxiOS") || names.includes("OPiOS");
  let engine = "Unknown";
  let engineVersion: string | null = null;
  if (names.includes("Firefox") || names.includes("Fennec")) {
    engine = "Gecko";
    engineVersion = versionOf("Firefox") ?? versionOf("Gecko");
  } else if (iosWebKit) {
    engine = "WebKit";
    engineVersion = versionOf("AppleWebKit");
  } else if (
    ["Chrome", "Edg", "OPR", "SamsungBrowser", "Electron", "Silk"].some((n) => names.includes(n))
  ) {
    engine = "Blink";
    engineVersion = versionOf("Chrome") ?? versionOf("Edg") ?? versionOf("OPR");
  } else if (names.includes("AppleWebKit") || names.includes("Safari")) {
    engine = "WebKit";
    engineVersion = versionOf("AppleWebKit") ?? versionOf("Safari");
  }

  let os = "Unknown";
  let osVersion = "";
  const known: [RegExp, string][] = [
    [/Windows NT 10\.0/, "Windows 10 or 11"],
    [/Windows NT 6\.3/, "Windows 8.1"],
    [/Windows NT 6\.1/, "Windows 7"],
    [/Windows/, "Windows"],
    [/iPhone|iPad|iPod/, "iOS"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Android ([0-9.]+)/, "Android"],
    [/CrOS/, "ChromeOS"],
    [/Linux/, "Linux"],
    [/KaOS/, "KaOS"],
  ];
  for (const [pattern, label] of known) {
    if (pattern.test(inside || raw)) {
      os = label;
      const versionMatch = /Windows NT ([0-9.]+)/.exec(raw) ?? /Android ([0-9.]+)/.exec(raw) ?? /Mac OS X ([0-9_.]+)/.exec(raw) ?? /CPU (?:iPhone )?OS ([0-9_]+)/.exec(raw);
      osVersion = versionMatch ? versionMatch[1].replace(/_/g, ".") : "";
      break;
    }
  }
  if (os === "macOS" && /like Mac OS X/.test(raw)) os = "iOS";

  let device = "Desktop";
  if (/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(raw)) device = "Phone";
  else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(raw)) device = "Tablet";
  else if (/SmartTV|Tizen|BRAVIA|CrKey|Firefox OS|TV/i.test(raw)) device = "TV";
  else if (/bot|crawler|spider/i.test(raw)) device = "Automated agent";

  return {
    browser,
    browserVersion: version ?? "",
    engine,
    engineVersion: engineVersion ?? "",
    os,
    osVersion,
    device,
    raw,
  };
}

/** Major-version shorthand plus the compatibility story browsers tell. */
export function summariseAgent(info: AgentInfo): string[] {
  const rows: string[] = [
    `${info.browser}${info.browserVersion ? ` ${info.browserVersion}` : ""}`,
    `engine: ${info.engine}${info.engineVersion ? ` ${info.engineVersion}` : ""}`,
    `system: ${info.os}${info.osVersion ? ` ${info.osVersion}` : ""}`,
    `device: ${info.device}`,
  ];
  if (info.browserVersion) rows.push(`major version: ${firstNumber(info.browserVersion)}`);
  return rows;
}
