"use client";

import { useState } from "react";
import {
  CopyButton,
  Panel,
  Segmented,
  StatusLine,
  ToolButton,
  editorClass,
  useStoredState,
} from "@/components/kit";
import { fill, useLang, useText } from "@/lib/i18n";
import {
  curveNames,
  generateKeyPair,
  rsaModuli,
  signatureHash,
  signText,
  verifyText,
  type KeyAlgorithm,
} from "./format";
import { strings } from "./locale";

/** What the last action produced; turned into text only while rendering. */
type Status =
  | { kind: "idle" }
  | { kind: "noPair" }
  | { kind: "pair"; alg: string; size: string; hash: string }
  | { kind: "unsigned" }
  | { kind: "signed"; chars: number }
  | { kind: "unchecked" }
  | { kind: "valid" }
  | { kind: "invalid" };

export default function KeyPairTool() {
  const { t } = useLang();
  const L = useText(strings);
  const [algorithm, setAlgorithm] = useStoredState<KeyAlgorithm>(
    "keys.algorithm",
    "RSA",
  );
  const [size, setSize] = useStoredState<string>("keys.size", "2048");
  const [privatePem, setPrivatePem] = useState("");
  const [publicPem, setPublicPem] = useState("");
  const [jwk, setJwk] = useState(false);
  const [keyPair, setKeyPair] = useState<{
    publicJwk: string;
    privateJwk: string;
  } | null>(null);
  const [message, setMessage] = useState("payload to be signed");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Key type names (RSA / ECDSA) and curve names are language-neutral.
  const algorithmOptions: { value: KeyAlgorithm; label: string }[] = [
    { value: "RSA", label: "RSA" },
    { value: "EC", label: "ECDSA" },
  ];

  const sizeOptions = (
    algorithm === "RSA" ? rsaModuli.map(String) : curveNames
  ).map((value) => ({ value, label: value }));

  const statusText = () => {
    switch (status.kind) {
      case "noPair":
        return L.statusNoPair;
      case "pair":
        return fill(L.statusPair, {
          alg: status.alg,
          size: status.size,
          hash: status.hash,
        });
      case "unsigned":
        return L.statusUnsigned;
      case "signed":
        return fill(L.statusSigned, { chars: status.chars });
      case "unchecked":
        return L.statusUnchecked;
      case "valid":
        return L.statusValid;
      case "invalid":
        return L.statusInvalid;
      default:
        return L.statusIdle;
    }
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    const read = await generateKeyPair(algorithm, size);
    setBusy(false);
    if (read.error) {
      setError(read.error);
      setStatus({ kind: "noPair" });
      return;
    }
    setPrivatePem(read.privatePem);
    setPublicPem(read.publicPem);
    setKeyPair({ publicJwk: read.publicJwk, privateJwk: read.privateJwk });
    setSignature("");
    setStatus({
      kind: "pair",
      alg: algorithm,
      size,
      hash: signatureHash(algorithm, size),
    });
  };

  const sign = async () => {
    setBusy(true);
    setError(null);
    const read = await signText(algorithm, size, privatePem, message);
    setBusy(false);
    if (read.error) {
      setError(read.error);
      setStatus({ kind: "unsigned" });
      return;
    }
    setSignature(read.signature);
    setStatus({ kind: "signed", chars: read.signature.length });
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const read = await verifyText(
      algorithm,
      size,
      publicPem,
      message,
      signature,
    );
    setBusy(false);
    if (read.error) {
      setError(read.error);
      setStatus({ kind: "unchecked" });
      return;
    }
    setError(read.ok ? null : L.errorNotVerified);
    setStatus(read.ok ? { kind: "valid" } : { kind: "invalid" });
  };

  const clear = () => {
    setPrivatePem("");
    setPublicPem("");
    setKeyPair(null);
    setSignature("");
    setJwk(false);
    setError(null);
    setStatus({ kind: "idle" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={algorithm}
          options={algorithmOptions}
          onChange={(value) => {
            setAlgorithm(value);
            setSize(value === "RSA" ? "2048" : "P-256");
          }}
          ariaLabel={L.algorithm}
        />
        <Segmented
          value={size}
          options={sizeOptions}
          onChange={setSize}
          ariaLabel={L.keySize}
        />
        <ToolButton onClick={() => void generate()} title={L.createHint}>
          {busy ? L.working : L.generate}
        </ToolButton>
        <ToolButton
          onClick={() => setJwk(!jwk)}
          title={keyPair ? L.toggleHint : L.needPairHint}
        >
          {jwk ? L.showPem : L.showJwk}
        </ToolButton>
        <ToolButton onClick={clear}>{t.clear}</ToolButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 md:grid-cols-2 md:grid-rows-2">
        <Panel
          title={L.privateKey}
          actions={
            <CopyButton
              getText={() => (jwk ? (keyPair?.privateJwk ?? "") : privatePem)}
            />
          }
        >
          {jwk && keyPair ? (
            <textarea
              className={editorClass}
              spellCheck={false}
              readOnly
              value={keyPair.privateJwk}
            />
          ) : (
            <textarea
              className={editorClass}
              spellCheck={false}
              placeholder="-----BEGIN PRIVATE KEY-----"
              value={privatePem}
              onChange={(e) => setPrivatePem(e.target.value)}
            />
          )}
        </Panel>
        <Panel
          title={L.publicKey}
          actions={
            <CopyButton
              getText={() => (jwk ? (keyPair?.publicJwk ?? "") : publicPem)}
            />
          }
        >
          {jwk && keyPair ? (
            <textarea
              className={editorClass}
              spellCheck={false}
              readOnly
              value={keyPair.publicJwk}
            />
          ) : (
            <textarea
              className={editorClass}
              spellCheck={false}
              placeholder="-----BEGIN PUBLIC KEY-----"
              value={publicPem}
              onChange={(e) => setPublicPem(e.target.value)}
            />
          )}
        </Panel>
        <Panel title={L.message}>
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder={L.messageHint}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Panel>
        <Panel
          title={L.signature}
          actions={
            <>
              <ToolButton onClick={() => void sign()} title={L.signHint}>
                {L.sign}
              </ToolButton>
              <ToolButton onClick={() => void verify()} title={L.verifyHint}>
                {L.verify}
              </ToolButton>
              <CopyButton getText={() => signature} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder={L.signatureHint}
            value={signature}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={statusText()}
      />
    </div>
  );
}
