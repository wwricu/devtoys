export interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string[];
  raw: string;
}

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function parseVersion(text: string): Semver | null {
  const raw = text.trim().replace(/^v/i, "");
  const match = SEMVER.exec(raw);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
    build: match[5] ? match[5].split(".") : [],
    raw,
  };
}

function compareIdentifiers(a: string, b: string): number {
  const numericA = /^\d+$/.test(a);
  const numericB = /^\d+$/.test(b);
  if (numericA && numericB) return Number(a) - Number(b);
  if (numericA) return -1;
  if (numericB) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Semver 2.0 precedence: build metadata is ignored. */
export function compareVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (const part of ["major", "minor", "patch"] as const) {
    if (a[part] !== b[part]) return a[part] < b[part] ? -1 : 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    const delta = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  if (a.prerelease.length === b.prerelease.length) return 0;
  return a.prerelease.length < b.prerelease.length ? -1 : 1;
}

export function describeVersion(text: string): string[] {
  const v = parseVersion(text);
  if (!v) return [];
  const rows = [
    `major ${v.major}`,
    `minor ${v.minor}`,
    `patch ${v.patch}`,
    v.prerelease.length ? `prerelease ${v.prerelease.join(".")}` : "prerelease -",
    v.build.length ? `build ${v.build.join(".")}` : "build -",
  ];
  return rows;
}

/** Which bump a change represents, comparing two versions. */
export function bumpBetween(left: string, right: string): string | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  const dir = compareVersions(left, right)!;
  if (dir === 0) return "same";
  if (dir > 0) return "downgrade";
  if (b.major > a.major) return "major";
  if (b.minor > a.minor) return "minor";
  if (b.patch > a.patch) return "patch";
  if (a.prerelease.length && !b.prerelease.length) return "promote (release)";
  if (a.prerelease.length && b.prerelease.length) return "prerelease";
  return "patch";
}
