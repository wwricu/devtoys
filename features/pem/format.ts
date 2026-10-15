import { derToBytes, nodeTime, parseDer, type DerNode } from "./der";

export { parseDer, derToBytes, type DerNode } from "./der";

export interface FieldRow {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "bad";
}

export interface FieldSection {
  title: string;
  rows: FieldRow[];
}

export interface PemBlock {
  /** the armor word, e.g. CERTIFICATE */
  type: string;
  title: string;
  der: Uint8Array | null;
  sections: FieldSection[];
  tree: DerNode | null;
  error: string | null;
}

export interface PemResult {
  blocks: PemBlock[];
  error: string | null;
}

const ALG_OIDS: Record<string, string> = {
  "1.2.840.113549.1.1.1": "RSA",
  "1.2.840.113549.1.1.4": "MD5 with RSA",
  "1.2.840.113549.1.1.5": "SHA-1 with RSA",
  "1.2.840.113549.1.1.10": "RSASSA-PSS",
  "1.2.840.113549.1.1.11": "SHA-256 with RSA",
  "1.2.840.113549.1.1.12": "SHA-384 with RSA",
  "1.2.840.113549.1.1.13": "SHA-512 with RSA",
  "1.2.840.10040.4.1": "DSA",
  "1.2.840.10040.4.3": "SHA-1 with DSA",
  "1.2.840.10045.2.1": "EC",
  "1.2.840.10045.4.1": "SHA-1 with ECDSA",
  "1.2.840.10045.4.3.1": "SHA-224 with ECDSA",
  "1.2.840.10045.4.3.2": "SHA-256 with ECDSA",
  "1.2.840.10045.4.3.3": "SHA-384 with ECDSA",
  "1.2.840.10045.4.3.4": "SHA-512 with ECDSA",
  "1.3.101.110": "X25519",
  "1.3.101.111": "X448",
  "1.3.101.112": "Ed25519",
  "1.3.101.113": "Ed448",
  "2.16.840.1.101.3.4.2.1": "SHA-256",
  "2.16.840.1.101.3.4.2.2": "SHA-384",
  "2.16.840.1.101.3.4.2.3": "SHA-512",
};

const RSA_OID = "1.2.840.113549.1.1.1";
const EC_OID = "1.2.840.10045.2.1";
const DSA_OID = "1.2.840.10040.4.1";

const CURVES: Record<string, { name: string; bits: number }> = {
  "1.2.840.10045.3.1.1": { name: "prime192v1", bits: 192 },
  "1.2.840.10045.3.1.7": { name: "P-256 (prime256v1)", bits: 256 },
  "1.3.132.0.34": { name: "P-384 (secp384r1)", bits: 384 },
  "1.3.132.0.35": { name: "P-521 (secp521r1)", bits: 521 },
  "1.3.132.0.10": { name: "secp256k1", bits: 256 },
};

const ATTR_OIDS: Record<string, string> = {
  "2.5.4.3": "CN",
  "2.5.4.4": "SN",
  "2.5.4.5": "serialNumber",
  "2.5.4.6": "C",
  "2.5.4.7": "L",
  "2.5.4.8": "ST",
  "2.5.4.9": "street",
  "2.5.4.10": "O",
  "2.5.4.11": "OU",
  "2.5.4.12": "postOfficeBox",
  "2.5.4.13": "description",
  "2.5.4.15": "businessCategory",
  "2.5.4.16": "postalCode",
  "2.5.4.17": "postalAddress",
  "2.5.4.20": "telephoneNumber",
  "2.5.4.41": "pseudonym",
  "2.5.4.42": "GN",
  "2.5.4.43": "initials",
  "2.5.4.44": "generationQualifier",
  "2.5.4.45": "X500UniqueIdentifier",
  "2.5.4.46": "dnQualifier",
  "0.9.2342.19200300.100.1.1": "email",
  "0.9.2342.19200300.100.1.25": "DC",
};

const EXT_OIDS: Record<string, string> = {
  "2.5.29.14": "Subject Key Identifier",
  "2.5.29.15": "Key Usage",
  "2.5.29.16": "Private Key Usage Period",
  "2.5.29.17": "Subject Alternative Name",
  "2.5.29.18": "Issuer Alternative Name",
  "2.5.29.19": "Basic Constraints",
  "2.5.29.20": "CRL Number",
  "2.5.29.21": "Reason Code",
  "2.5.29.23": "Hold Instruction Code",
  "2.5.29.30": "Name Constraints",
  "2.5.29.31": "CRL Distribution Points",
  "2.5.29.32": "Certificate Policies",
  "2.5.29.33": "Policy Mappings",
  "2.5.29.35": "Authority Key Identifier",
  "2.5.29.36": "Policy Constraints",
  "2.5.29.37": "Extended Key Usage",
  "2.5.29.46": "Freshest CRL",
  "2.5.29.54": "Inhibit Any Policy",
  "1.3.6.1.5.5.7.1.1": "Authority Info Access",
  "1.3.6.1.5.5.7.1.24": "TLS Feature",
};

const EKU_OIDS: Record<string, string> = {
  "1.3.6.1.5.5.7.3.1": "TLS Web Server Authentication",
  "1.3.6.1.5.5.7.3.2": "TLS Web Client Authentication",
  "1.3.6.1.5.5.7.3.3": "Code Signing",
  "1.3.6.1.5.5.7.3.4": "E-mail Protection",
  "1.3.6.1.5.5.7.3.8": "Time Stamping",
  "1.3.6.1.5.5.7.3.9": "OCSP Signing",
  "2.23.140.1.1": "DV Extended Validation",
  "2.23.140.1.2.1": "Domain Validated",
  "2.23.140.1.2.2": "Subject Alternative Name (DV)",
  "2.23.140.1.3": "OV Extended Validation",
  "2.23.140.1.4.1": "Organization Validated",
  "2.23.140.1.5.1": "Individual Validated",
};

const KEY_USAGE_BITS = [
  "Digital Signature",
  "Content Commitment",
  "Key Encipherment",
  "Data Encipherment",
  "Key Agreement",
  "Certificate Sign",
  "CRL Sign",
  "Encipher Only",
  "Decipher Only",
];

const ACCESS_METHODS: Record<string, string> = {
  "1.3.6.1.5.5.7.48.1": "OCSP",
  "1.3.6.1.5.5.7.48.2": "CA Issuers",
};

const STRING_TAGS = [0x0c, 0x12, 0x13, 0x14, 0x16, 0x1e];

function childAt(node: DerNode | null, index: number): DerNode | null {
  return node !== null && index >= 0 && index < node.children.length
    ? node.children[index]
    : null;
}

function contextNode(node: DerNode | null, tag: number): DerNode | null {
  return node?.children.find((c) => c.cls === "context" && c.tag === tag) ?? null;
}

function findTag(node: DerNode | null, tag: number): DerNode | null {
  return node?.children.find((c) => c.cls === "universal" && c.tag === tag) ?? null;
}

function oidOf(seq: DerNode | null): string {
  if (!seq) return "";
  if (seq.cls === "universal" && seq.tag === 0x06) return seq.text ?? "";
  return findTag(seq, 0x06)?.text ?? "";
}

function algName(seq: DerNode | null): string {
  const oid = oidOf(seq);
  if (!oid) return "unknown";
  return ALG_OIDS[oid] ?? `unknown (${oid})`;
}

function bytesText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function colonHex(bytes: Uint8Array, separator = ":"): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && separator) out += separator;
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out.toUpperCase();
}

function bitLength(bytes: Uint8Array): number {
  let i = 0;
  while (i < bytes.length && bytes[i] === 0) i++;
  const body = bytes.subarray(i);
  if (body.length === 0) return 0;
  return (body.length - 1) * 8 + body[0].toString(2).length;
}

function intOf(node: DerNode | null): number | null {
  if (!node) return null;
  const n = Number(node.text);
  return Number.isFinite(n) ? n : null;
}

/** BIT STRING content (unused-bit byte first) -> used bit indexes */
function bitFlags(bytes: Uint8Array): number[] {
  if (bytes.length === 0) return [];
  const unused = bytes[0];
  const usable = Math.max(0, (bytes.length - 1) * 8 - unused);
  const set: number[] = [];
  for (let i = 0; i < usable; i++) {
    const byte = bytes[1 + (i >> 3)];
    if ((byte & (1 << (7 - (i & 7)))) !== 0) set.push(i);
  }
  return set;
}

function dnParts(name: DerNode | null): { label: string; value: string }[] {
  const parts: { label: string; value: string }[] = [];
  for (const rdn of name?.children ?? []) {
    for (const atv of rdn.children) {
      const oid = oidOf(atv);
      const value = childAt(atv, 1);
      if (!value) continue;
      parts.push({
        label: ATTR_OIDS[oid] ?? (oid || "?"),
        value: value.text ?? colonHex(derToBytes(value)),
      });
    }
  }
  return parts;
}

function dnString(name: DerNode | null): string {
  return dnParts(name)
    .map((p) => `${p.label}=${p.value}`)
    .join(", ");
}

function generalName(node: DerNode): string {
  if (node.cls !== "context") return node.text ?? node.hex;
  const bytes = derToBytes(node);
  const text = node.text ?? bytesText(bytes);
  switch (node.tag) {
    case 0:
      return `otherName:${text.replace(/[^\x20-\x7e]/g, ".")}`;
    case 1:
      return `email:${text}`;
    case 2:
      return `DNS:${text}`;
    case 3:
      return `X400:${text}`;
    case 4:
      return `directory:${dnString(node)}`;
    case 5:
      return `EDIParty:${text}`;
    case 6:
      return `URI:${text}`;
    case 7:
      if (bytes.length === 4) return `IP Address:${[...bytes].join(".")}`;
      if (bytes.length === 16) {
        const groups: string[] = [];
        for (let i = 0; i < 16; i += 2)
          groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
        return `IP Address:${groups.join(":")}`;
      }
      return `registeredID:${node.hex}`;
    default:
      return node.hex;
  }
}

function subtreeNames(subtreeSeq: DerNode): string {
  return subtreeSeq.children
    .map((subtree) => generalName(childAt(subtree, 0) ?? subtree))
    .join(", ");
}

function collectStrings(node: DerNode, out: string[]): void {
  if (node.cls === "universal" && STRING_TAGS.includes(node.tag) && node.text !== null)
    out.push(node.text);
  for (const child of node.children) collectStrings(child, out);
}

/** GeneralNames are context-tagged, so they can hide anywhere in a value. */
function collectNames(node: DerNode, out: string[]): void {
  if (node.cls === "context" && !node.constructed && node.text !== null)
    out.push(generalName(node));
  else if (node.cls === "universal" && STRING_TAGS.includes(node.tag) && node.text !== null)
    out.push(node.text);
  for (const child of node.children) collectNames(child, out);
}

function nested(bytes: Uint8Array): DerNode | null {
  return parseDer(bytes).root;
}

/** Decode an extension's OCTET STRING payload into one display line. */
function extensionValue(oid: string, value: DerNode): string {
  const inner = nested(derToBytes(value));
  if (!inner) return value.hex;

  switch (oid) {
    case "2.5.29.19": {
      const ca = findTag(inner, 0x01);
      const pathLen = findTag(inner, 0x02);
      const parts = [`CA:${ca?.text === "true" ? "TRUE" : "FALSE"}`];
      if (pathLen) parts.push(`path length: ${pathLen.text}`);
      return parts.join(", ");
    }
    case "2.5.29.15": {
      const names = bitFlags(derToBytes(inner)).map(
        (i) => KEY_USAGE_BITS[i] ?? `bit ${i}`,
      );
      return names.join(", ") || "none";
    }
    case "2.5.29.17":
    case "2.5.29.18":
      return inner.children.map(generalName).join(", ") || inner.hex;
    case "2.5.29.14":
      return colonHex(derToBytes(inner));
    case "2.5.29.35": {
      const parts: string[] = [];
      const id = contextNode(inner, 0);
      const serial = contextNode(inner, 2);
      const issuer = contextNode(inner, 1);
      if (id) parts.push(`keyid:${colonHex(derToBytes(id))}`);
      if (issuer) parts.push(`dirname:${dnString(issuer)}`);
      if (serial) parts.push(`serial:${colonHex(derToBytes(serial), "")}`);
      return parts.join(", ") || inner.hex;
    }
    case "2.5.29.37":
      return (
        inner.children.map((c) => EKU_OIDS[oidOf(c)] ?? oidOf(c)).filter(Boolean).join(", ") ||
        "any usage"
      );
    case "2.5.29.30": {
      const permitted = contextNode(inner, 0);
      const excluded = contextNode(inner, 1);
      const parts: string[] = [];
      if (permitted) parts.push(`permitted: ${subtreeNames(permitted)}`);
      if (excluded) parts.push(`excluded: ${subtreeNames(excluded)}`);
      return parts.join(" · ") || inner.hex;
    }
    case "1.3.6.1.5.5.7.1.1":
      return inner.children
        .map((entry) => {
          const method = ACCESS_METHODS[oidOf(entry)] ?? oidOf(entry);
          const location = childAt(entry, 1);
          return `${method} - ${location ? generalName(location) : ""}`;
        })
        .join(", ");
    case "2.5.29.31": {
      const names: string[] = [];
      collectNames(inner, names);
      return names.join(", ") || inner.hex;
    }
    case "2.5.29.32": {
      const policies = inner.children.map((c) => oidOf(childAt(c, 0))).filter(Boolean);
      const urls: string[] = [];
      collectStrings(inner, urls);
      return [...policies, ...urls].join(", ") || inner.hex;
    }
    case "2.5.29.21":
      return inner.text ?? `reason: ${inner.hex}`;
    case "2.5.29.20":
      return inner.text ?? inner.hex;
    case "2.5.29.16": {
      const notBefore = childAt(inner, 0);
      const notAfter = childAt(inner, 1);
      return [notBefore?.text, notAfter?.text].filter(Boolean).join(" → ") || inner.hex;
    }
    default: {
      const texts: string[] = [];
      collectStrings(inner, texts);
      if (texts.length) return texts.join(", ");
      return inner.text ?? colonHex(derToBytes(inner));
    }
  }
}

function spkiRows(spki: DerNode | null): FieldRow[] {
  if (!spki) return [];
  const algorithm = childAt(spki, 0);
  const bitString = childAt(spki, 1);
  const oid = oidOf(algorithm);
  const rows: FieldRow[] = [
    { label: "Algorithm", value: ALG_OIDS[oid] ?? `unknown (${oid || "?"})` },
  ];

  const raw = bitString ? derToBytes(bitString) : new Uint8Array(0);
  const content = raw.subarray(1);

  if (oid === RSA_OID) {
    const key = nested(content);
    const modulus = childAt(key, 0);
    const exponent = childAt(key, 1);
    if (modulus)
      rows.push({ label: "Key size", value: `${bitLength(derToBytes(modulus))} bits` });
    if (exponent) rows.push({ label: "Public exponent", value: exponent.text ?? "" });
  } else if (oid === EC_OID) {
    const curve = CURVES[oidOf(childAt(algorithm, 1))];
    if (curve) {
      rows.push({ label: "Curve", value: curve.name });
      rows.push({ label: "Key size", value: `${curve.bits} bits` });
    } else {
      const first = content[0] === 0x04 ? content.subarray(1) : content;
      rows.push({
        label: "Key size",
        value: `${Math.ceil(first.length / 2) * 8} bits`,
      });
    }
  } else if (oid === DSA_OID) {
    const p = childAt(childAt(algorithm, 1), 0);
    if (p) rows.push({ label: "Key size", value: `${bitLength(derToBytes(p))} bits` });
  } else if (content.length > 0) {
    rows.push({ label: "Key size", value: `${content.length * 8} bits` });
  }
  return rows;
}

function extensionRows(extSeq: DerNode | null | undefined): FieldRow[] {
  if (!extSeq) return [];
  return extSeq.children.flatMap((ext) => {
    const oid = oidOf(ext);
    const valueNode = findTag(ext, 0x04);
    if (!oid || !valueNode) return [];
    const critical = findTag(ext, 0x01)?.text === "true";
    return [
      {
        label: `${EXT_OIDS[oid] ?? oid}${critical ? " (critical)" : ""}`,
        value: extensionValue(oid, valueNode),
      },
    ];
  });
}

function tbsSections(tbs: DerNode): FieldSection[] {
  const head = childAt(tbs, 0);
  const explicitVersion =
    head !== null && head.cls === "context" && head.tag === 0 && head.constructed;
  const implicitVersion = head !== null && head.cls === "universal" && head.tag === 0x02;
  const i = explicitVersion || implicitVersion ? 1 : 0;

  let version = "1 (X.509 v1)";
  if (explicitVersion || implicitVersion) {
    const v = intOf(explicitVersion ? childAt(head, 0) : head) ?? 0;
    version = `${v + 1} (X.509 v${v + 1})`;
  }

  const serial = childAt(tbs, i);
  const signature = childAt(tbs, i + 1);
  const issuer = childAt(tbs, i + 2);
  const validity = childAt(tbs, i + 3);
  const subject = childAt(tbs, i + 4);
  const spki = childAt(tbs, i + 5);

  const identity: FieldRow[] = [];
  if (serial) {
    identity.push({ label: "Serial number", value: colonHex(derToBytes(serial), "") });
    identity.push({ label: "Serial (decimal)", value: serial.text ?? serial.hex });
  }
  identity.push({ label: "Version", value: version });
  identity.push({ label: "Signature algorithm", value: algName(signature) });

  const sections: FieldSection[] = [{ title: "Identity", rows: identity }];

  const rowsOf = (name: DerNode | null): FieldRow[] => {
    const parts = dnParts(name);
    return parts.length
      ? parts.map((p) => ({ label: p.label, value: p.value }))
      : [{ label: "Distinguished name", value: "(empty)" }];
  };
  sections.push({ title: "Subject", rows: rowsOf(subject) });
  const issuerRows = rowsOf(issuer);
  if (dnString(subject) === dnString(issuer))
    issuerRows.push({ label: "Note", value: "self-signed", tone: "warn" });
  sections.push({ title: "Issuer", rows: issuerRows });

  const before = nodeTimeSafe(childAt(validity, 0));
  const after = nodeTimeSafe(childAt(validity, 1));
  const validityRows: FieldRow[] = [];
  if (before) validityRows.push({ label: "Not before", value: before.label });
  if (after) validityRows.push({ label: "Not after", value: after.label });
  const now = Date.now();
  if (before && after) {
    if (now < before.epoch)
      validityRows.push({ label: "Status", value: "Not valid yet", tone: "warn" });
    else if (now > after.epoch)
      validityRows.push({ label: "Status", value: "Expired", tone: "bad" });
    else {
      const days = Math.ceil((after.epoch - now) / 86_400_000);
      validityRows.push({
        label: "Status",
        value: "Valid",
        hint: `${days} day${days === 1 ? "" : "s"} remaining`,
        tone: "ok",
      });
    }
  }
  if (validityRows.length) sections.push({ title: "Validity", rows: validityRows });

  const keyRows = spkiRows(spki);
  if (keyRows.length) sections.push({ title: "Public key", rows: keyRows });

  const rows = extensionRows(childAt(contextNode(tbs, 3), 0));
  if (rows.length) sections.push({ title: "Extensions", rows });
  return sections;
}

function nodeTimeSafe(node: DerNode | null) {
  return node && (node.cls === "universal" && (node.tag === 0x17 || node.tag === 0x18))
    ? nodeTime(node)
    : null;
}

function csrSections(info: DerNode | null): FieldSection[] {
  if (!info) return [];
  const sections: FieldSection[] = [];
  const subject = childAt(info, 1);
  const parts = dnParts(subject);
  sections.push({
    title: "Requested subject",
    rows: parts.length
      ? parts.map((p) => ({ label: p.label, value: p.value }))
      : [{ label: "Distinguished name", value: "(empty)" }],
  });
  const keyRows = spkiRows(childAt(info, 2));
  if (keyRows.length) sections.push({ title: "Public key", rows: keyRows });

  const attributes = childAt(info, 3);
  if (attributes) {
    for (const attr of attributes.children) {
      const oid = oidOf(attr);
      if (oid === "1.2.840.113549.1.9.14") {
        const values = childAt(attr, 1);
        const extSeq = values?.children.find((c) => c.constructed && c.tag === 0x10);
        const rows = extensionRows(extSeq);
        if (rows.length) sections.push({ title: "Requested extensions", rows });
        continue;
      }
      const texts: string[] = [];
      collectNames(attr, texts);
      sections.push({
        title: "Attributes",
        rows: [{ label: ATTR_NAMES[oid] ?? oid, value: texts.join(", ") || "(binary)" }],
      });
    }
  }
  return sections;
}

const ATTR_NAMES: Record<string, string> = {
  "1.2.840.113549.1.9.7": "Challenge password",
  "1.2.840.113549.1.9.8": "Unstructured name",
  "1.2.840.113549.1.9.20": "Organisational name",
  "1.2.840.113549.1.9.14": "Requested extensions",
  "1.3.6.1.4.1.311.13.2.1": "Microsoft encrypting key",
};

function pkcs8Sections(root: DerNode): FieldSection[] {
  const algorithm = childAt(root, 1);
  const key = findTag(root, 0x04);
  const rows: FieldRow[] = [
    { label: "Format", value: "PKCS #8 PrivateKeyInfo" },
    { label: "Algorithm", value: algName(algorithm) },
  ];
  if (oidOf(algorithm) === RSA_OID && key) {
    const modulus = childAt(nested(derToBytes(key)), 1);
    if (modulus)
      rows.push({ label: "Key size", value: `${bitLength(derToBytes(modulus))} bits` });
  }
  return [{ title: "Private key", rows }];
}

function rsaPrivateSections(root: DerNode): FieldSection[] {
  const modulus = childAt(root, 1);
  const exponent = childAt(root, 2);
  const rows: FieldRow[] = [{ label: "Format", value: "PKCS #1 RSAPrivateKey" }];
  if (modulus)
    rows.push({ label: "Key size", value: `${bitLength(derToBytes(modulus))} bits` });
  if (exponent) rows.push({ label: "Public exponent", value: exponent.text ?? "" });
  rows.push({ label: "Private factors", value: "p, q, dP, dQ, q^-1 present" });
  return [{ title: "Private key", rows }];
}

function ecPrivateSections(root: DerNode): FieldSection[] {
  const rows: FieldRow[] = [{ label: "Format", value: "SEC1 ECPrivateKey" }];
  const curveOid = oidOf(contextNode(root, 0));
  const curve = CURVES[curveOid];
  if (curve) rows.push({ label: "Curve", value: curve.name });
  const publicKey = contextNode(root, 1);
  if (publicKey) rows.push({ label: "Public key", value: `${publicKey.hex.length / 2} bytes` });
  return [{ title: "Private key", rows }];
}

function crlSections(root: DerNode): FieldSection[] {
  const tbs = childAt(root, 0);
  if (!tbs) return [];
  const hasVersion = childAt(tbs, 0)?.cls === "universal" && childAt(tbs, 0)?.tag === 0x02;
  const i = hasVersion ? 1 : 0;
  const issuer = childAt(tbs, i + 1);
  const rows: FieldRow[] = [];
  if (issuer) rows.push({ label: "Issuer", value: dnString(issuer) });
  const thisUpdate = nodeTimeSafe(childAt(tbs, i + 2));
  if (thisUpdate) rows.push({ label: "This update", value: thisUpdate.label });
  const nextUpdate = nodeTimeSafe(childAt(tbs, i + 3));
  if (nextUpdate) rows.push({ label: "Next update", value: nextUpdate.label });

  const list = tbs.children
    .slice(i + 3)
    .find((c) => c.constructed && c.cls === "universal" && c.tag === 0x10);
  const revoked = list?.children ?? [];
  rows.push({ label: "Revoked certificates", value: String(revoked.length) });
  const serials = revoked
    .map((entry) => colonHex(derToBytes(childAt(entry, 0) ?? entry), ""))
    .filter(Boolean)
    .slice(0, 8);
  if (serials.length)
    rows.push({ label: "Serial numbers", value: serials.join(", ") });
  const sections: FieldSection[] = [{ title: "Revocation list", rows }];
  const crlExt = extensionRows(childAt(contextNode(tbs, 0), 0));
  if (crlExt.length) sections.push({ title: "CRL extensions", rows: crlExt });
  return sections;
}

function describe(type: string, root: DerNode): { title: string; sections: FieldSection[] } {
  const upper = type.toUpperCase();
  if (upper.includes("CERTIFICATE REQUEST")) {
    const info = childAt(root, 0);
    const sections = csrSections(info);
    const signature = childAt(root, 1);
    if (signature)
      sections.push({
        title: "Signature",
        rows: [{ label: "Algorithm", value: algName(signature) }],
      });
    return { title: "Certificate signing request", sections };
  }
  if (upper === "CERTIFICATE" || upper === "X509 CERTIFICATE") {
    const tbs = childAt(root, 0);
    return { title: "X.509 certificate", sections: tbs ? tbsSections(tbs) : [] };
  }
  if (upper === "TRUSTED CERTIFICATE") {
    const tbs = childAt(childAt(root, 0), 0);
    return { title: "Trusted certificate", sections: tbs ? tbsSections(tbs) : [] };
  }
  if (upper === "PUBLIC KEY")
    return { title: "Public key", sections: [{ title: "Key", rows: spkiRows(root) }] };
  if (upper === "RSA PUBLIC KEY") {
    const modulus = childAt(root, 0);
    const exponent = childAt(root, 1);
    const rows: FieldRow[] = [{ label: "Algorithm", value: "RSA" }];
    if (modulus)
      rows.push({ label: "Key size", value: `${bitLength(derToBytes(modulus))} bits` });
    if (exponent) rows.push({ label: "Public exponent", value: exponent.text ?? "" });
    return { title: "RSA public key", sections: [{ title: "Key", rows }] };
  }
  if (upper === "PRIVATE KEY") return { title: "Private key", sections: pkcs8Sections(root) };
  if (upper === "RSA PRIVATE KEY")
    return { title: "RSA private key", sections: rsaPrivateSections(root) };
  if (upper === "EC PRIVATE KEY")
    return { title: "EC private key", sections: ecPrivateSections(root) };
  if (upper === "X509 CRL") return { title: "Revocation list", sections: crlSections(root) };
  if (upper === "ENCRYPTED PRIVATE KEY")
    return {
      title: "Encrypted private key",
      sections: [
        {
          title: "Encrypted key",
          rows: [
            { label: "Format", value: "PKCS #8 EncryptedPrivateKeyInfo" },
            { label: "Encryption", value: algName(childAt(root, 0)) },
          ],
        },
      ],
    };
  return { title: type, sections: [] };
}

function base64ToBytes(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function describePem(text: string): PemResult {
  const trimmed = text.trim();
  if (trimmed === "") return { blocks: [], error: null };

  const armor = /-----BEGIN[ \t]*([A-Z0-9 ]*?)[ \t]*-----([\s\S]*?)-----END[ \t]*\1[ \t]*-----/g;
  const blocks: PemBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = armor.exec(trimmed)) !== null) {
    const type = match[1].trim();
    const body = match[2].replace(/[^A-Za-z0-9+/=]/g, "");
    let error: string | null = null;
    let root: DerNode | null = null;
    let der: Uint8Array | null = null;

    try {
      der = base64ToBytes(body);
      const parsed = parseDer(der);
      root = parsed.root;
      error = parsed.error;
    } catch {
      error = "The armor content is not valid Base64";
    }

    let title = type || "PEM";
    let sections: FieldSection[] = [];
    if (root && !error) {
      try {
        const described = describe(type, root);
        title = described.title;
        sections = described.sections.filter((s) => s.rows.length > 0);
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to read this object";
      }
    }

    blocks.push({ type: type || "PEM", title, der, sections, tree: root, error });
  }

  if (blocks.length === 0)
    return {
      blocks: [],
      error: "No PEM block found. Paste text between -----BEGIN and -----END lines.",
    };

  const begins = (trimmed.match(/-----BEGIN/g) ?? []).length;
  if (begins !== blocks.length)
    return {
      blocks,
      error: `${begins - blocks.length} BEGIN line(s) have no matching END line.`,
    };

  return { blocks, error: null };
}

/** SHA-256 over the DER bytes, formatted the way openssl prints fingerprints. */
export async function fingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes) as Uint8Array<ArrayBuffer>,
  );
  return colonHex(new Uint8Array(digest));
}
