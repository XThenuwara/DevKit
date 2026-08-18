import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { ToolPanel, ToolShell } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, ShieldCheck, ShieldAlert, Shield, Eye, EyeOff } from "lucide-react";

export const PasswordTool: React.FC = () => {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [passwords, setPasswords] = useState<string[]>([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [strengthInfo, setStrengthInfo] = useState<{
    score: number; // 0 to 100
    label: string;
    color: string;
    description: string;
  }>({ score: 0, label: "Weak", color: "bg-destructive", description: "" });

  const generatePasswords = () => {
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:",./<>?';

    let charPool = "";
    if (includeUppercase) charPool += uppercaseChars;
    if (includeLowercase) charPool += lowercaseChars;
    if (includeNumbers) charPool += numberChars;
    if (includeSymbols) charPool += symbolChars;

    if (!charPool) {
      setPasswords(["Please select at least one character set"]);
      return;
    }

    const list: string[] = [];
    for (let q = 0; q < Math.max(1, Math.min(50, quantity)); q++) {
      let pwd = "";
      // Ensure we have at least one character of each selected type
      const mandatory: string[] = [];
      if (includeUppercase) mandatory.push(uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]);
      if (includeLowercase) mandatory.push(lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)]);
      if (includeNumbers) mandatory.push(numberChars[Math.floor(Math.random() * numberChars.length)]);
      if (includeSymbols) mandatory.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);

      // Add random characters to fill up the remaining length
      for (let i = mandatory.length; i < length; i++) {
        pwd += charPool[Math.floor(Math.random() * charPool.length)];
      }

      // Prepend mandatory characters and shuffle
      const fullArr = [...mandatory, ...pwd.split("")];
      // Fisher-Yates shuffle
      for (let i = fullArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fullArr[i], fullArr[j]] = [fullArr[j], fullArr[i]];
      }
      list.push(fullArr.join(""));
    }

    setPasswords(list);
  };

  // Calculate Shannon entropy/strength
  const evaluateStrength = (pwd: string) => {
    if (!pwd || pwd === "Please select at least one character set") {
      setStrengthInfo({ score: 0, label: "Invalid", color: "bg-destructive", description: "" });
      return;
    }

    let poolSize = 0;
    if (includeUppercase) poolSize += 26;
    if (includeLowercase) poolSize += 26;
    if (includeNumbers) poolSize += 10;
    if (includeSymbols) poolSize += 32;

    if (poolSize === 0) return;

    // Entropy formula: L * log2(R)
    const entropy = pwd.length * Math.log2(poolSize);

    let score = 0;
    let label = "";
    let color = "";
    let description = "";

    if (entropy < 40) {
      score = 25;
      label = "Weak";
      color = "bg-destructive";
      description = "Easily brute-forced. Increase length or complexity.";
    } else if (entropy < 60) {
      score = 50;
      label = "Medium";
      color = "bg-amber-500";
      description = "Decent strength. Recommended length is at least 12 characters.";
    } else if (entropy < 80) {
      score = 75;
      label = "Strong";
      color = "bg-emerald-500";
      description = "Very secure. Hard to compromise.";
    } else {
      score = 100;
      label = "Very Secure";
      color = "bg-emerald-600 shadow-glow shadow-emerald-500/25";
      description = "Excellent password entropy. Suitable for critical accounts.";
    }

    setStrengthInfo({ score, label, color, description });
  };

  useEffect(() => {
    generatePasswords();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, quantity]);

  useEffect(() => {
    if (passwords.length > 0) {
      evaluateStrength(passwords[0]);
    }
  }, [passwords]);

  return (
    <ToolShell
      title="Secure Password Generator"
      description="Create random passwords client-side with custom rules and entropy strength."
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-12">
        <ToolPanel className="gap-4 p-3 md:col-span-5">
          <span className="text-xs font-bold text-foreground/85">Settings</span>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Length</span>
              <span className="font-mono text-primary">{length}</span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-background/50 accent-primary"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Uppercase (A-Z)</span>
              <Switch checked={includeUppercase} onCheckedChange={setIncludeUppercase} />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Lowercase (a-z)</span>
              <Switch checked={includeLowercase} onCheckedChange={setIncludeLowercase} />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Numbers (0-9)</span>
              <Switch checked={includeNumbers} onCheckedChange={setIncludeNumbers} />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Symbols (!@#$...)</span>
              <Switch checked={includeSymbols} onCheckedChange={setIncludeSymbols} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border/50 pt-3">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="h-8 bg-background/50 font-mono text-xs"
            />
          </div>
          <Button onClick={generatePasswords} size="sm" className="h-8 w-full gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </ToolPanel>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden md:col-span-7">
          {passwords.length > 0 && passwords[0] !== "Please select at least one character set" && (
            <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {strengthInfo.score >= 75 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : strengthInfo.score >= 50 ? (
                    <Shield className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  )}
                  Strength
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white ${strengthInfo.color}`}>
                  {strengthInfo.label}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                <div className={`h-full rounded-full transition-all duration-500 ${strengthInfo.color}`} style={{ width: `${strengthInfo.score}%` }} />
              </div>
              <span className="text-[10px] leading-normal text-muted-foreground">{strengthInfo.description}</span>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between">
              <span className="text-xs font-bold text-foreground/85">Generated passwords</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {showPasswords ? "Hide" : "Reveal"}
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {passwords.map((pwd, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 font-mono text-sm"
                >
                  <span className={`break-all pl-2 ${!showPasswords ? "select-none text-muted-foreground/60 blur-[3px]" : "text-foreground"}`}>
                    {pwd}
                  </span>
                  <CopyButton value={pwd} size="sm" variant="ghost" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
};
