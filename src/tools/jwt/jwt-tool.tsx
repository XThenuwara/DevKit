import React, { useEffect, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import { CopyButton } from "@/components/shared/copy-button";
import { ToolPanel, ToolShell } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Key, Eye, EyeOff, Sparkles } from "lucide-react";

const HMAC_ALGS: Record<string, (message: string, key: string) => CryptoJS.lib.WordArray> = {
  HS256: CryptoJS.HmacSHA256,
  HS384: CryptoJS.HmacSHA384,
  HS512: CryptoJS.HmacSHA512,
};

const base64UrlEncode = (str: string) =>
  btoa(unescape(encodeURIComponent(str)))
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (base64Url: string) => {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decodeURIComponent(escape(atob(base64)));
};

const wordArrayToBase64Url = (wa: CryptoJS.lib.WordArray) =>
  CryptoJS.enc.Base64.stringify(wa)
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signHmac = (alg: string, signingInput: string, secret: string) => {
  const fn = HMAC_ALGS[alg];
  if (!fn) return null;
  return wordArrayToBase64Url(fn(signingInput, secret));
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const SAMPLE_HEADER = pretty({ alg: "HS256", typ: "JWT" });
const SAMPLE_SECRET = "devkit-secret";

const samplePayload = () => {
  const now = Math.floor(Date.now() / 1000);
  return pretty({
    sub: "1234567890",
    name: "DevKit User",
    iat: now,
    exp: now + 3600,
  });
};

type EditSource = "token" | "claims";

type SignatureStatus = "unsigned" | "unverified" | "valid" | "invalid" | "unsupported";

export const JwtTool: React.FC = () => {
  const [token, setToken] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [headerError, setHeaderError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [alg, setAlg] = useState<string>("");
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus>("unverified");
  const [expiryState, setExpiryState] = useState<{
    status: "none" | "valid" | "expired";
    message: string;
  }>({ status: "none", message: "" });

  const lastEdited = useRef<EditSource>("token");
  const originalSignature = useRef("");

  const updateExpiry = (decodedPayload: Record<string, unknown> | null) => {
    const exp = decodedPayload?.exp;
    if (typeof exp !== "number") {
      setExpiryState({ status: "none", message: "No expiration claim (exp) on this token." });
      return;
    }
    const expMs = exp * 1000;
    const now = Date.now();
    if (now > expMs) {
      const diffMin = Math.round((now - expMs) / 60000);
      const diffHours = (diffMin / 60).toFixed(1);
      setExpiryState({
        status: "expired",
        message: `Expired ${diffMin < 60 ? `${diffMin}m` : `${diffHours}h`} ago.`,
      });
    } else {
      const diffMin = Math.round((expMs - now) / 60000);
      const diffHours = (diffMin / 60).toFixed(1);
      setExpiryState({
        status: "valid",
        message: `Expires in ${diffMin < 60 ? `${diffMin}m` : `${diffHours}h`}.`,
      });
    }
  };

  const applySignatureStatus = (algorithm: string, signingInput: string, sig: string, secretValue: string) => {
    if (algorithm === "none" || !sig) {
      setSignatureStatus("unsigned");
      return;
    }
    if (!HMAC_ALGS[algorithm]) {
      setSignatureStatus("unsupported");
      return;
    }
    if (!secretValue) {
      setSignatureStatus("unverified");
      return;
    }
    const computed = signHmac(algorithm, signingInput, secretValue);
    setSignatureStatus(computed === sig ? "valid" : "invalid");
  };

  const decodeToken = (jwtToken: string) => {
    if (!jwtToken.trim()) {
      setHeaderText("");
      setPayloadText("");
      setSignatureText("");
      setPayload(null);
      setAlg("");
      setTokenError(null);
      setHeaderError(null);
      setPayloadError(null);
      setSignatureStatus("unverified");
      setExpiryState({ status: "none", message: "" });
      originalSignature.current = "";
      return;
    }

    const parts = jwtToken.trim().split(".");
    if (parts.length !== 3) {
      setTokenError("A JWT must contain exactly two dots (header.payload.signature)");
      setSignatureStatus("unverified");
      return;
    }

    try {
      const decodedHeader = JSON.parse(base64UrlDecode(parts[0])) as Record<string, unknown>;
      const decodedPayload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
      const sig = parts[2];
      const algorithm = typeof decodedHeader.alg === "string" ? decodedHeader.alg : "";

      setTokenError(null);
      setHeaderError(null);
      setPayloadError(null);
      setHeaderText(pretty(decodedHeader));
      setPayloadText(pretty(decodedPayload));
      setSignatureText(sig);
      setPayload(decodedPayload);
      setAlg(algorithm);
      originalSignature.current = sig;
      updateExpiry(decodedPayload);
      applySignatureStatus(algorithm, `${parts[0]}.${parts[1]}`, sig, secret);
    } catch (e: unknown) {
      setTokenError("Failed to decode token segments: " + (e instanceof Error ? e.message : "invalid Base64 or JSON"));
      setSignatureStatus("unverified");
    }
  };

  const encodeClaims = (headerJson: string, payloadJson: string, secretValue: string) => {
    if (!headerJson.trim() && !payloadJson.trim()) {
      setToken("");
      setSignatureText("");
      setPayload(null);
      setTokenError(null);
      return;
    }

    let parsedHeader: Record<string, unknown>;
    let parsedPayload: Record<string, unknown>;

    try {
      parsedHeader = JSON.parse(headerJson) as Record<string, unknown>;
      setHeaderError(null);
    } catch (e: unknown) {
      setHeaderError("Invalid header JSON: " + (e instanceof Error ? e.message : "parse error"));
      return;
    }

    try {
      parsedPayload = JSON.parse(payloadJson) as Record<string, unknown>;
      setPayloadError(null);
    } catch (e: unknown) {
      setPayloadError("Invalid payload JSON: " + (e instanceof Error ? e.message : "parse error"));
      return;
    }

    const algorithm = typeof parsedHeader.alg === "string" ? parsedHeader.alg : "HS256";
    const headerB64 = base64UrlEncode(JSON.stringify(parsedHeader));
    const payloadB64 = base64UrlEncode(JSON.stringify(parsedPayload));
    const signingInput = `${headerB64}.${payloadB64}`;

    let sig = originalSignature.current;
    if (algorithm === "none") {
      sig = "";
    } else if (HMAC_ALGS[algorithm] && secretValue) {
      sig = signHmac(algorithm, signingInput, secretValue) ?? "";
      originalSignature.current = sig;
    }

    const nextToken = `${signingInput}.${sig}`;
    setToken(nextToken);
    setSignatureText(sig);
    setPayload(parsedPayload);
    setAlg(algorithm);
    setTokenError(null);
    updateExpiry(parsedPayload);
    applySignatureStatus(algorithm, signingInput, sig, secretValue);
  };

  useEffect(() => {
    if (lastEdited.current !== "token") return;
    decodeToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (lastEdited.current === "claims") {
      encodeClaims(headerText, payloadText, secret);
      return;
    }
    const parts = token.trim().split(".");
    if (parts.length !== 3 || !token.trim()) return;
    try {
      const decodedHeader = JSON.parse(base64UrlDecode(parts[0])) as Record<string, unknown>;
      const algorithm = typeof decodedHeader.alg === "string" ? decodedHeader.alg : "";
      applySignatureStatus(algorithm, `${parts[0]}.${parts[1]}`, parts[2], secret);
    } catch {
      // Token is still being edited or is malformed; decode effect owns that error.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerText, payloadText, secret]);

  const handleTokenChange = (value: string) => {
    lastEdited.current = "token";
    setToken(value);
  };

  const handleHeaderChange = (value: string) => {
    lastEdited.current = "claims";
    setHeaderText(value);
  };

  const handlePayloadChange = (value: string) => {
    lastEdited.current = "claims";
    setPayloadText(value);
  };

  const handleSecretChange = (value: string) => {
    // Keep lastEdited as-is: a pasted token should only be verified, not rewritten.
    // After claim edits, lastEdited is already "claims" and the token is re-signed.
    setSecret(value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      lastEdited.current = "token";
      setToken(text);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    lastEdited.current = "token";
    setToken("");
    setSecret("");
  };

  const loadSample = () => {
    lastEdited.current = "claims";
    setHeaderText(SAMPLE_HEADER);
    setPayloadText(samplePayload());
    setSecret(SAMPLE_SECRET);
  };

  const formatEpoch = (val: unknown) => {
    if (typeof val !== "number") return String(val);
    const date = new Date(val * 1000);
    return `${date.toLocaleString()} (Local) / ${date.toUTCString()}`;
  };

  const hasClaims = Boolean(headerText || payloadText);

  return (
    <ToolShell
      title="JWT Encoder / Decoder"
      description="Paste a token to inspect it, edit the header or payload JSON, and encode it back. HMAC (HS256 / HS384 / HS512) signing happens entirely in the browser."
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-5">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between">
              <span className="text-xs font-bold text-foreground/85">Encoded Token</span>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={loadSample} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Sample
                </Button>
                <Button variant="ghost" size="sm" onClick={handlePaste} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  disabled={!token && !secret}
                >
                  Clear
                </Button>
              </div>
            </div>

            <textarea
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="Paste encoded JWT here (e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
              className="min-h-0 w-full flex-1 resize-none overflow-y-auto break-all rounded-xl border border-border/50 bg-background p-3 font-mono text-xs leading-relaxed focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
            />

            {token.trim() && !tokenError && (
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Header
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                    <span className="h-2 w-2 rounded-full bg-sky-500" /> Payload
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Signature
                  </span>
                </div>
                <CopyButton value={token.trim()} label="Copy Token" />
              </div>
            )}
          </div>

          {token && (
            <div className="flex shrink-0 flex-col gap-2">
              {tokenError ? (
                <StatusBanner
                  tone="rose"
                  icon={<AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
                  title="Malformed token"
                  message={tokenError}
                />
              ) : (
                <>
                  <StatusBanner
                    tone={
                      signatureStatus === "valid"
                        ? "emerald"
                        : signatureStatus === "invalid"
                          ? "rose"
                          : signatureStatus === "unsigned"
                            ? "amber"
                            : "slate"
                    }
                    icon={
                      signatureStatus === "valid" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : signatureStatus === "invalid" ? (
                        <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <Key className="h-5 w-5 text-muted-foreground" />
                      )
                    }
                    title={
                      signatureStatus === "valid"
                        ? "Signature verified"
                        : signatureStatus === "invalid"
                          ? "Invalid signature"
                          : signatureStatus === "unsigned"
                            ? "Unsigned token"
                            : signatureStatus === "unsupported"
                              ? `Cannot sign ${alg || "this algorithm"} here`
                              : "Signature not verified"
                    }
                    message={
                      signatureStatus === "valid"
                        ? `HMAC ${alg} signature matches the secret.`
                        : signatureStatus === "invalid"
                          ? "The secret does not match this token's signature. Encoding with the current secret will replace it."
                          : signatureStatus === "unsigned"
                            ? 'alg is "none" or the signature segment is empty.'
                            : signatureStatus === "unsupported"
                              ? "RSA/ECDSA signing needs a private key. Header and payload can still be edited; the existing signature is kept (and will be invalid after edits)."
                              : HMAC_ALGS[alg]
                                ? "Enter an HMAC secret to verify or re-sign this token."
                                : "Paste a token or load a sample to get started."
                    }
                  />
                  {expiryState.status !== "none" && (
                    <StatusBanner
                      tone={expiryState.status === "expired" ? "amber" : "emerald"}
                      icon={<Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                      title={expiryState.status === "expired" ? "Token expired" : "Token is in date"}
                      message={expiryState.message}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-auto lg:col-span-7">
          {tokenError && !hasClaims ? (
            <ToolPanel className="min-h-[220px] items-center justify-center p-8 text-center text-xs font-mono text-destructive">
              <ShieldAlert className="mb-1 h-8 w-8 text-destructive" />
              <span className="font-bold">Format Error</span>
              <span>{tokenError}</span>
            </ToolPanel>
          ) : hasClaims ? (
            <>
              <EditableJsonBlock
                title="Header: Metadata"
                accent="rose"
                value={headerText}
                onChange={handleHeaderChange}
                error={headerError}
              />

              <EditableJsonBlock
                title="Payload: Claims"
                accent="sky"
                value={payloadText}
                onChange={handlePayloadChange}
                error={payloadError}
              />

              {payload && (payload.exp || payload.iat || payload.nbf) && (
                <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 text-left text-xs text-foreground/85 flex flex-col gap-2.5">
                  <span className="font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Timestamps Summary
                  </span>
                  {typeof payload.exp === "number" && (
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-mono text-muted-foreground font-semibold">exp (Expiration):</span>
                      <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.exp)}</span>
                    </div>
                  )}
                  {typeof payload.iat === "number" && (
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-mono text-muted-foreground font-semibold">iat (Issued At):</span>
                      <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.iat)}</span>
                    </div>
                  )}
                  {typeof payload.nbf === "number" && (
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-mono text-muted-foreground font-semibold">nbf (Not Before):</span>
                      <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.nbf)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Signature {alg ? `(${alg})` : ""}
                    </span>
                  </div>
                  <CopyButton value={signatureText} label="Copy Signature" />
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border/50 border-l-4 border-emerald-500 bg-background/50 p-4">
                  <div className="font-mono text-xs leading-relaxed text-emerald-700 dark:text-emerald-300 break-all">
                    {signatureText || "(empty)"}
                  </div>

                  <div className="border-t border-border pt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      HMAC secret — used to verify and re-sign HS256 / HS384 / HS512
                    </span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showSecret ? "text" : "password"}
                          value={secret}
                          onChange={(e) => handleSecretChange(e.target.value)}
                          placeholder="Enter secret to verify or encode..."
                          className="font-mono text-xs h-9 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title={showSecret ? "Hide secret" : "Show secret"}
                        >
                          {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Editing header or payload live-encodes a new token. Provide a secret to produce a valid HMAC signature. RSA/ECDSA algorithms stay unsigned here.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ToolPanel className="min-h-[220px] items-center justify-center gap-3 p-10 text-center text-xs font-mono text-muted-foreground">
              <p>Paste a JWT on the left, or start from a sample and edit the claims.</p>
              <Button variant="outline" size="sm" onClick={loadSample} className="h-8 text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Load sample token
              </Button>
            </ToolPanel>
          )}
        </div>
      </div>
    </ToolShell>
  );
};

const StatusBanner: React.FC<{
  tone: "emerald" | "amber" | "rose" | "slate";
  icon: React.ReactNode;
  title: string;
  message: string;
}> = ({ tone, icon, title, message }) => {
  const tones = {
    emerald: "bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300",
    amber: "bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300",
    rose: "bg-rose-50/70 border-rose-300 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-300",
    slate: "bg-muted/40 border-border text-foreground",
  };
  return (
    <div className={`p-3 rounded-xl border flex gap-3 items-start ${tones[tone]}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex flex-col gap-0.5 text-left">
        <span className="font-bold text-sm">{title}</span>
        <span className="text-xs text-foreground/80 leading-normal">{message}</span>
      </div>
    </div>
  );
};

const EditableJsonBlock: React.FC<{
  title: string;
  accent: "rose" | "sky";
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}> = ({ title, accent, value, onChange, error }) => {
  const colors =
    accent === "rose"
      ? {
          dot: "bg-rose-500",
          label: "text-rose-600 dark:text-rose-400",
          border: "border-rose-500",
          text: "text-rose-700 dark:text-rose-300",
        }
      : {
          dot: "bg-sky-500",
          label: "text-sky-600 dark:text-sky-400",
          border: "border-sky-500",
          text: "text-sky-700 dark:text-sky-300",
        };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${colors.dot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.label}`}>{title}</span>
        </div>
        <CopyButton value={value} label="Copy JSON" />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`w-full min-h-[120px] p-3 rounded-xl border border-border/50 border-l-4 ${colors.border} bg-background/50 ${colors.text} font-mono text-xs leading-relaxed overflow-x-auto focus:outline-none focus:ring-1 focus:ring-ring/30 resize-y`}
      />
      {error && (
        <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-mono">
          {error}
        </span>
      )}
    </div>
  );
};
