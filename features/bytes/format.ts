export interface ByteUnit {
  symbol: string;
  size: number; // bytes per unit
}

export const BYTE_UNITS: ByteUnit[] = [
  { symbol: "B", size: 1 },
  { symbol: "KB", size: 1e3 },
  { symbol: "MB", size: 1e6 },
  { symbol: "GB", size: 1e9 },
  { symbol: "TB", size: 1e12 },
  { symbol: "PB", size: 1e15 },
  { symbol: "KiB", size: 1 << 10 },
  { symbol: "MiB", size: 1 << 20 },
  { symbol: "GiB", size: 1 << 30 },
  { symbol: "TiB", size: 2 ** 40 },
  { symbol: "PiB", size: 2 ** 50 },
];

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6);
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function convertBytes(value: number, fromSymbol: string) {
  const from = BYTE_UNITS.find((u) => u.symbol === fromSymbol)!;
  const bytes = value * from.size;
  return {
    bytes,
    rows: BYTE_UNITS.map((u) => ({
      symbol: u.symbol,
      value: formatNumber(bytes / u.size),
    })),
  };
}
