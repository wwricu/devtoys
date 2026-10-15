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
import {
  curveNames,
  generateKeyPair,
  rsaModuli,
  signatureHash,
  signText,
  verifyText,
  type KeyAlgorithm,
} from "./format";

const algorithmOptions: { value: KeyAlgorithm; label: string }[] = [
  { value: "RSA", label: "RSA" },
  { value: "EC", label: "ECDSA" },
];

const optionsFor = (algorithm: KeyAlgorithm) =>
  (algorithm === "RSA" ? rsaModuli.map(String) : curveNames).map((value) => ({
    value,
    label: value,
  }));

export default function KeyPairTool() {
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
  const [status, setStatus] = useState(
    "Generate a key pair or paste a PEM block",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const read = await generateKeyPair(algorithm, size);
    setBusy(false);
    if (read.error) {
      setError(read.error);
      setStatus("No key pair was produced");
      return;
    }
    setPrivatePem(read.privatePem);
    setPublicPem(read.publicPem);
    setKeyPair({ publicJwk: read.publicJwk, privateJwk: read.privateJwk });
    setSignature("");
    setStatus(
      `${algorithm} ${size} pair, signs with ${signatureHash(algorithm, size)}`,
    );
  };

  const sign = async () => {
    setBusy(true);
    setError(null);
    const read = await signText(algorithm, size, privatePem, message);
    setBusy(false);
    if (read.error) {
      setError(read.error);
      setStatus("The message was not signed");
      return;
    }
    setSignature(read.signature);
    setStatus(`Signature created, ${read.signature.length} base64 characters`);
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
      setStatus("The signature could not be checked");
      return;
    }
    setError(
      read.ok ? null : "The signature does not verify against this public key",
    );
    setStatus(
      read.ok
        ? "Signature is valid for this message"
        : "Signature does not match",
    );
  };

  const clear = () => {
    setPrivatePem("");
    setPublicPem("");
    setKeyPair(null);
    setSignature("");
    setJwk(false);
    setError(null);
    setStatus("Generate a key pair or paste a PEM block");
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
          ariaLabel="Algorithm"
        />
        <Segmented
          value={size}
          options={optionsFor(algorithm)}
          onChange={setSize}
          ariaLabel="Key size"
        />
        <ToolButton
          onClick={() => void generate()}
          title="Create a new pair in this tab"
        >
          {busy ? "Working…" : "Generate"}
        </ToolButton>
        <ToolButton
          onClick={() => setJwk(!jwk)}
          title={
            keyPair ? "Switch between PEM and JWK" : "Generate a pair first"
          }
        >
          {jwk ? "Show PEM" : "Show JWK"}
        </ToolButton>
        <ToolButton onClick={clear}>Clear</ToolButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 md:grid-cols-2 md:grid-rows-2">
        <Panel
          title="Private key"
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
          title="Public key"
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
        <Panel title="Message">
          <textarea
            className={editorClass}
            spellCheck={false}
            placeholder="Text to sign"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Panel>
        <Panel
          title="Signature"
          actions={
            <>
              <ToolButton
                onClick={() => void sign()}
                title="Sign the message with the private key"
              >
                Sign
              </ToolButton>
              <ToolButton
                onClick={() => void verify()}
                title="Check the signature against the public key"
              >
                Verify
              </ToolButton>
              <CopyButton getText={() => signature} />
            </>
          }
        >
          <textarea
            className={editorClass}
            spellCheck={false}
            readOnly
            placeholder="Base64 signature"
            value={signature}
          />
        </Panel>
      </div>

      <StatusLine
        error={error ? { message: error, line: 1, column: 1 } : null}
        info={status}
      />
    </div>
  );
}
