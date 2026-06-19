import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
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
    <div className="flex flex-col gap-6 w-full px-4 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Secure Password Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create strong, random passwords client-side using custom rules and evaluate their entropy strength.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Config Panel */}
        <div className="md:col-span-5 p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-5 text-left">
          <span className="text-sm font-semibold text-foreground/80 border-b border-border/20 pb-2">Settings</span>

          {/* Length slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Password Length</span>
              <span className="text-primary font-mono">{length} chars</span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-muted border-none rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Switches */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Uppercase (A-Z)</span>
              <Switch checked={includeUppercase} onCheckedChange={setIncludeUppercase} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Lowercase (a-z)</span>
              <Switch checked={includeLowercase} onCheckedChange={setIncludeLowercase} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Numbers (0-9)</span>
              <Switch checked={includeNumbers} onCheckedChange={setIncludeNumbers} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Symbols (!@#$...)</span>
              <Switch checked={includeSymbols} onCheckedChange={setIncludeSymbols} />
            </div>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5 border-t border-border/20 pt-4">
            <label className="text-xs font-semibold text-muted-foreground">Passwords Quantity (Max 50)</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="h-9 font-mono text-xs bg-background/50"
            />
          </div>

          <Button onClick={generatePasswords} size="sm" className="w-full gap-1.5 h-9 mt-1">
            <RefreshCw className="h-4 w-4" />
            Regenerate Passwords
          </Button>
        </div>

        {/* Right Output Panel */}
        <div className="md:col-span-7 flex flex-col gap-5 text-left">
          {/* Strength evaluator */}
          {passwords.length > 0 && passwords[0] !== "Please select at least one character set" && (
            <div className="p-4 rounded-xl border border-border bg-card flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1">
                  {strengthInfo.score >= 75 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : strengthInfo.score >= 50 ? (
                    <Shield className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  )}
                  Strength Evaluation
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white ${strengthInfo.color}`}
                >
                  {strengthInfo.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${strengthInfo.color}`}
                  style={{ width: `${strengthInfo.score}%` }}
                />
              </div>

              <span className="text-[10px] text-muted-foreground leading-normal">{strengthInfo.description}</span>
            </div>
          )}

          {/* Passwords results list */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground/80">Generated Passwords</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {showPasswords ? "Hide Value" : "Reveal Value"}
              </Button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {passwords.map((pwd, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 transition-all font-mono text-sm leading-relaxed"
                >
                  <span className={`pl-2 break-all ${!showPasswords ? "select-none text-muted-foreground/60 filter blur-[3px]" : "text-foreground"}`}>
                    {pwd}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CopyButton value={pwd} size="sm" variant="ghost" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
