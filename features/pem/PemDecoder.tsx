"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CopyButton,
  Panel,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  describePem,
  fingerprint,
  type DerNode,
  type FieldRow,
  type PemBlock,
} from "./format";
import { strings } from "./locale";

type L = typeof strings.en;

const toneClass = {
  ok: "text-green-700 dark:text-green-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-red-700 dark:text-red-300",
};

/**
 * The viewer prints a fixed technical vocabulary (it mirrors what an X.509
 * reader shows). Only this display layer translates it; OID values, tag names
 * and every decoded byte stay exactly as parsed.
 */
const BLOCK_TITLES: Record<string, keyof L> = {
  "X.509 certificate": "x509Certificate",
  "Trusted certificate": "trustedCertificate",
  "Certificate signing request": "certificateRequest",
  "Public key": "publicKey",
  "RSA public key": "rsaPublicKey",
  "Private key": "privateKey",
  "RSA private key": "rsaPrivateKey",
  "EC private key": "ecPrivateKey",
  "Revocation list": "revocationList",
  "Encrypted private key": "encryptedPrivateKey",
};

const SECTION_TITLES: Record<string, keyof L> = {
  Identity: "identity",
  Subject: "subject",
  Issuer: "issuer",
  Validity: "validity",
  "Public key": "publicKey",
  "Private key": "privateKey",
  Extensions: "extensions",
  "Requested subject": "requestedSubject",
  "Requested extensions": "requestedExtensions",
  Attributes: "attributes",
  Signature: "signature",
  Key: "key",
  "Revocation list": "revocationList",
  "CRL extensions": "crlExtensions",
  "Encrypted key": "encryptedKey",
};

const ROW_LABELS: Record<string, keyof L> = {
  Algorithm: "algorithm",
  "Key size": "keySize",
  "Public exponent": "publicExponent",
  Curve: "curve",
  Format: "format",
  Encryption: "encryption",
  "Serial number": "serialNumber",
  "Serial (decimal)": "serialDecimal",
  Version: "version",
  "Signature algorithm": "signatureAlgorithm",
  "Distinguished name": "distinguishedName",
  Note: "note",
  "Not before": "notBefore",
  "Not after": "notAfter",
  Status: "status",
  "Private factors": "privateFactors",
  "This update": "thisUpdate",
  "Next update": "nextUpdate",
  Issuer: "issuer",
  "Revoked certificates": "revokedCertificates",
  "Serial numbers": "serialNumbers",
  "Public key": "publicKey",
};

/** Rows whose value is a verdict word rather than parsed data. */
const ROW_VALUE_LABELS = new Set(["Status", "Note", "Distinguished name"]);

const ROW_VALUES: Record<string, keyof L> = {
  Valid: "valid",
  Expired: "expired",
  "Not valid yet": "notValidYet",
  "self-signed": "selfSigned",
  "(empty)": "emptyValue",
};

function term(table: Record<string, keyof L>, text: string, L: L): string {
  const key = table[text];
  return key ? L[key] : text;
}

function NodeRow({
  node,
  depth,
  showHex,
}: {
  node: DerNode;
  depth: number;
  showHex: boolean;
}) {
  const meta =
    node.text !== null && !node.constructed ? (
      <span className="ml-1.5 break-all text-neutral-700 dark:text-neutral-200">
        {node.text.length > 120 ? node.text.slice(0, 120) + "…" : node.text}
      </span>
    ) : null;
  const hex = showHex ? (
    <span className="ml-1.5 break-all text-neutral-400">
      {node.hex.slice(0, 96)}
    </span>
  ) : null;

  if (node.children.length === 0)
    return (
      <div className="py-0.5" style={{ paddingLeft: depth * 12 }}>
        <span className="text-neutral-500">{node.label}</span>
        {meta}
        {hex}
      </div>
    );

  return (
    <details open={depth < 2} style={{ paddingLeft: depth * 12 }}>
      <summary className="cursor-pointer py-0.5 select-none">
        <span className="text-neutral-500">{node.label}</span>
        <span className="ml-1.5 text-neutral-400">
          ({node.children.length})
        </span>
        {hex}
      </summary>
      {node.children.map((child, i) => (
        <NodeRow key={i} node={child} depth={depth + 1} showHex={showHex} />
      ))}
    </details>
  );
}

function Block({
  block,
  print,
  showHex,
  L,
}: {
  block: PemBlock;
  print: string;
  showHex: boolean;
  L: L;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          {term(BLOCK_TITLES, block.title, L)}
        </span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {block.type}
        </span>
        <span className="text-neutral-500">
          {fill(L.derSize, { count: block.der?.length ?? 0 })}
        </span>
        {print && (
          <span className="break-all font-mono text-[11px] text-neutral-500">
            SHA-256 {print}
          </span>
        )}
      </div>

      {block.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {block.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {block.sections.map((section) => (
          <Panel
            key={section.title}
            title={term(SECTION_TITLES, section.title, L)}
          >
            <div className="min-h-0 overflow-y-auto">
              <table className="w-full table-fixed text-left text-xs">
                <tbody>
                  {section.rows.map((row, i) => (
                    <Row key={i} row={row} L={L} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}

        {block.tree && (
          <Panel
            title={L.asn1}
            className="lg:col-span-2"
            actions={
              <span className="text-[11px] text-neutral-400">
                {L.expandHint}
              </span>
            }
          >
            <div className="min-h-0 max-h-72 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
              <NodeRow node={block.tree} depth={0} showHex={showHex} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Row({ row, L }: { row: FieldRow; L: L }) {
  const hint =
    row.hintDays === undefined
      ? ""
      : fill(row.hintDays === 1 ? L.daysOne : L.daysMany, {
          days: row.hintDays,
        });
  const value = ROW_VALUE_LABELS.has(row.label)
    ? term(ROW_VALUES, row.value, L)
    : row.value;

  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
      <td className="w-1/3 break-words py-1 pr-2 text-neutral-500">
        {term(ROW_LABELS, row.label, L)}
      </td>
      <td
        className={`break-all py-1 font-mono ${
          row.tone
            ? toneClass[row.tone]
            : "text-neutral-800 dark:text-neutral-200"
        }`}
      >
        {value}
        {hint && <span className="ml-1.5 text-neutral-500">({hint})</span>}
      </td>
    </tr>
  );
}

const EXAMPLE = `-----BEGIN CERTIFICATE-----
MIIB/DCCAaKgAwIBAgIUPKzbLVocAEW7yENXVpLLNd0nNMQwCgYIKoZIzj0EAwIw
PDELMAkGA1UEBhMCVVMxFDASBgNVBAoMC0V4YW1wbGUgT3JnMRcwFQYDVQQDDA5l
Yy5leGFtcGxlLmNvbTAeFw0yNjEwMTQyMjIyMjZaFw0yNjExMTMyMjIyMjZaMDwx
CzAJBgNVBAYTAlVTMRQwEgYDVQQKDAtFeGFtcGxlIE9yZzEXMBUGA1UEAwwOZWMu
ZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAReCbJJpLs3nPnX
10h+kl5zvgitsH5YYkwvnLwp6WozcKJKlAnbwQQRN5iP9Py5MT/+CJE8h8pJOtON
scIyoPhdo4GBMH8wHQYDVR0OBBYEFFSzfTcSDN7PxqGK1I+LaTjsQUdsMB8GA1Ud
IwQYMBaAFFSzfTcSDN7PxqGK1I+LaTjsQUdsMBIGA1UdEwEB/wQIMAYBAf8CAQAw
DgYDVR0PAQH/BAQDAgEGMBkGA1UdEQQSMBCCDmVjLmV4YW1wbGUuY29tMAoGCCqG
SM49BAMCA0gAMEUCIQDLLYkDqeWWDLhgBerlwvrsReSSv3Mb3tGqVUvo5drCawIg
Otlmf9Wevg430aRXU1K2UhaZvIbd57sDp3+bKkvF920=
-----END CERTIFICATE-----`;

export default function PemDecoder() {
  const { t } = useLang();
  const L = useText(strings);
  const [input, setInput] = useState("");
  const [showHex, setShowHex] = useStoredState("pem.showHex", false);
  const [prints, setPrints] = useState<string[]>([]);
  const result = useMemo(() => describePem(input), [input]);

  useEffect(() => {
    let alive = true;
    const blocks = result.blocks;
    // An empty block list resolves to [] here, so the panel never keeps stale prints.
    Promise.all(
      blocks.map((b) => (b.der ? fingerprint(b.der) : Promise.resolve(""))),
    ).then((list) => {
      if (alive) setPrints(list);
    });
    return () => {
      alive = false;
    };
  }, [input, result]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Panel
        title={L.pemText}
        actions={
          <>
            <ToolButton onClick={() => setInput(EXAMPLE)}>
              {L.example}
            </ToolButton>
            <ToolButton
              onClick={() => setShowHex(!showHex)}
              title={L.bytesHint}
            >
              {showHex ? L.hideBytes : L.showBytes}
            </ToolButton>
            <ToolButton onClick={() => setInput("")}>{t.clear}</ToolButton>
            <CopyButton getText={() => input} />
          </>
        }
      >
        <textarea
          className={editorClass + " min-h-28 flex-none"}
          spellCheck={false}
          placeholder={L.pasteHint}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Panel>

      {result.error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {result.blocks.map((block, i) => (
          <div key={i} className="mb-2">
            <Block
              block={block}
              print={prints[i] ?? ""}
              showHex={showHex}
              L={L}
            />
          </div>
        ))}
      </div>

      <StatusLine
        info={
          result.blocks.length
            ? fill(result.blocks.length === 1 ? L.decodedOne : L.decodedMany, {
                count: result.blocks.length,
              })
            : L.pasteAbove
        }
      />
    </div>
  );
}
