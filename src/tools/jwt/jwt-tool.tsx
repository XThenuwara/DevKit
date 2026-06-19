import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Key } from "lucide-react";

export const JwtTool: React.FC = () => {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [signatureText, setSignatureText] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<{
    status: "valid" | "expired" | "invalid";
    message: string;
    timeLeft?: string;
  }>({ status: "invalid", message: "No token provided" });

  const decodeJwt = (jwtToken: string) => {
    setErrorMsg(null);
    if (!jwtToken.trim()) {
      setHeader(null);
      setPayload(null);
      setSignatureText("");
      setValidationState({ status: "invalid", message: "No token provided" });
      return;
    }

    const parts = jwtToken.split(".");
    if (parts.length !== 3) {
      setErrorMsg("A JWT token must contain exactly two dots (Header.Payload.Signature)");
      setHeader(null);
      setPayload(null);
      setSignatureText("");
      setValidationState({ status: "invalid", message: "Malformed JWT structure" });
      return;
    }

    try {
      // Decode Header and Payload (UTF-8 safe base64 decoding)
      const decodeSegment = (base64Url: string) => {
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        // Pad base64
        while (base64.length % 4) {
          base64 += "=";
        }
        return JSON.parse(decodeURIComponent(escape(atob(base64))));
      };

      const decodedHeader = decodeSegment(parts[0]);
      const decodedPayload = decodeSegment(parts[1]);
      
      setHeader(decodedHeader);
      setPayload(decodedPayload);
      setSignatureText(parts[2]);

      // Validate dates
      if (decodedPayload.exp) {
        const expTimestamp = decodedPayload.exp * 1000;
        const now = Date.now();
        if (now > expTimestamp) {
          const diffMin = Math.round((now - expTimestamp) / 60000);
          const diffHours = (diffMin / 60).toFixed(1);
          setValidationState({
            status: "expired",
            message: `Token has expired! Expired around ${diffMin < 60 ? `${diffMin}m` : `${diffHours}h`} ago.`,
          });
        } else {
          const diffMin = Math.round((expTimestamp - now) / 60000);
          const diffHours = (diffMin / 60).toFixed(1);
          setValidationState({
            status: "valid",
            message: `Token is active. Expires in ${diffMin < 60 ? `${diffMin}m` : `${diffHours}h`}.`,
            timeLeft: diffMin < 60 ? `${diffMin} minutes` : `${diffHours} hours`,
          });
        }
      } else {
        setValidationState({
          status: "valid",
          message: "Token has valid structure, but does not contain an expiration claim (exp).",
        });
      }
    } catch (e: any) {
      setErrorMsg("Failed to decode token segments: " + e.message);
      setHeader(null);
      setPayload(null);
      setSignatureText("");
      setValidationState({ status: "invalid", message: "Invalid Base64 or JSON structure" });
    }
  };

  useEffect(() => {
    decodeJwt(token);
  }, [token]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    setToken("");
  };

  // Human-readable date fields from payload
  const formatEpoch = (val: any) => {
    if (typeof val !== "number") return String(val);
    const date = new Date(val * 1000);
    return `${date.toLocaleString()} (Local) / ${date.toUTCString()}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full px-4 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">JWT Decoder</h1>
        <p className="text-sm text-muted-foreground">
          Decode JSON Web Tokens (JWT) payload and header segments instantly on the client-side. No data is sent to any server.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Token Input & Verification */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground/80">Encoded Token</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePaste}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  disabled={!token}
                >
                  Clear
                </Button>
              </div>
            </div>

            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste encoded JWT here (e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
              className="flex-1 w-full min-h-[300px] p-4 rounded-xl border border-border bg-background hover:bg-background/80 focus:bg-background focus:border-ring/50 focus:ring-1 focus:ring-ring/30 focus:outline-none transition-all resize-y font-mono text-xs leading-relaxed break-all shadow-sm"
            />
          </div>

          {/* Validation Status Indicator */}
          {token && (
            <div
              className={`p-4 rounded-xl border flex gap-3.5 items-start animate-in slide-in-from-bottom-2 duration-300 ${
                validationState.status === "valid"
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300"
                  : validationState.status === "expired"
                  ? "bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300"
                  : "bg-rose-50/70 border-rose-300 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-300"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {validationState.status === "valid" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : validationState.status === "expired" ? (
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-bold text-sm capitalize">
                  {validationState.status === "valid"
                    ? "Signature/Token Verified"
                    : validationState.status === "expired"
                    ? "Token Expired"
                    : "Structure Verification"}
                </span>
                <span className="text-xs text-foreground/80 leading-normal">{validationState.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Decoded Sections */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-destructive/30 bg-destructive/5 rounded-xl p-8 text-center text-destructive font-mono text-xs gap-1.5 min-h-[300px] shadow-sm">
              <ShieldAlert className="h-8 w-8 text-destructive animate-bounce mb-1" />
              <span className="font-bold">Format Error</span>
              <span>{errorMsg}</span>
            </div>
          ) : header || payload ? (
            <div className="flex flex-col gap-6">
              {/* Header Segment */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Header: Metadata</span>
                  </div>
                  <CopyButton value={JSON.stringify(header, null, 2)} label="Copy Header" />
                </div>
                <pre className="p-4 rounded-xl border border-border border-l-4 border-rose-500 bg-card text-rose-700 dark:text-rose-300 font-mono text-xs leading-relaxed overflow-x-auto text-left shadow-sm">
                  {JSON.stringify(header, null, 2)}
                </pre>
              </div>

              {/* Payload Segment */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Payload: Claims</span>
                  </div>
                  <CopyButton value={JSON.stringify(payload, null, 2)} label="Copy Payload" />
                </div>
                <div className="flex flex-col gap-3">
                  <pre className="p-4 rounded-xl border border-border border-l-4 border-sky-500 bg-card text-sky-700 dark:text-sky-300 font-mono text-xs leading-relaxed overflow-x-auto text-left shadow-sm">
                    {JSON.stringify(payload, null, 2)}
                  </pre>

                  {/* Decoded claims summary if they exist */}
                  {(payload.exp || payload.iat || payload.nbf) && (
                    <div className="p-3.5 border border-border rounded-xl bg-card text-xs text-left flex flex-col gap-2.5 shadow-sm text-foreground/85">
                      <span className="font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Timestamps Summary
                      </span>
                      {payload.exp && (
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-mono text-muted-foreground font-semibold">exp (Expiration):</span>
                          <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.exp)}</span>
                        </div>
                      )}
                      {payload.iat && (
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-mono text-muted-foreground font-semibold">iat (Issued At):</span>
                          <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.iat)}</span>
                        </div>
                      )}
                      {payload.nbf && (
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-mono text-muted-foreground font-semibold">nbf (Not Before):</span>
                          <span className="col-span-2 font-mono text-foreground font-semibold">{formatEpoch(payload.nbf)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Signature</span>
                  </div>
                  <CopyButton value={signatureText} label="Copy Signature" />
                </div>
                <div className="p-4 rounded-xl border border-border border-l-4 border-emerald-500 bg-card text-emerald-700 dark:text-emerald-300 font-mono text-xs leading-relaxed text-left flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Key className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>HMACSHA256(</span>
                  </div>
                  <div className="pl-4 text-muted-foreground leading-normal">
                    base64UrlEncode(header) + "." + <br />
                    base64UrlEncode(payload), <br />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">your-256-bit-secret</span>
                  </div>
                  <span className="font-bold">)</span>
                  <div className="border-t border-border pt-2.5 mt-1 break-all text-foreground/70 dark:text-foreground/80">
                    {signatureText || "signature segment"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card rounded-xl text-center text-muted-foreground font-mono text-xs p-10 min-h-[350px] shadow-sm">
              Paste a JWT token on the left to inspect its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
