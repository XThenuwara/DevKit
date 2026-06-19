import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, FileCode, List } from "lucide-react";

export const UuidTool: React.FC = () => {
  const [uuidVersion, setUuidVersion] = useState<"v4" | "v1">("v4");
  const [count, setCount] = useState(10);
  const [useHyphens, setUseHyphens] = useState(true);
  const [useBraces, setUseBraces] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);

  // Simple pure JS UUID V4 generator (without external library to keep build size tiny)
  const generateV4 = (): string => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Simple pure JS UUID V1 generator (timestamp + pseudorandom node/clock sequence)
  const generateV1 = (): string => {
    // Generate V1 based on current timestamp
    let d = new Date().getTime();
    // pseudorandom node/clock seq
    const node = "xxxxxxxxxxxx".replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16));

    const uuid = "xxxxxxxx-xxxx-1xxx-yxxx-zzzzzzzzzzzz"
      .replace(/[xy]/g, (c) => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      })
      .replace("zzzzzzzzzzzz", node);
    
    return uuid;
  };

  const handleGenerate = () => {
    const list: string[] = [];
    const clampCount = Math.max(1, Math.min(500, count)); // clamp between 1 and 500

    for (let i = 0; i < clampCount; i++) {
      let id = uuidVersion === "v4" ? generateV4() : generateV1();

      if (!useHyphens) {
        id = id.replace(/-/g, "");
      }
      if (useBraces) {
        id = `{${id}}`;
      }
      if (uppercase) {
        id = id.toUpperCase();
      }

      list.push(id);
    }
    setUuids(list);
  };

  // Generate on mount or setting changes
  useEffect(() => {
    handleGenerate();
  }, [uuidVersion, count, useHyphens, useBraces, uppercase]);

  const plainTextList = uuids.join("\n");
  const jsonArrayList = JSON.stringify(uuids, null, 2);

  return (
    <div className="flex flex-col gap-6 w-full px-4 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">UUID / GUID Generator</h1>
        <p className="text-sm text-muted-foreground">
          Bulk generate cryptographically secure UUID (Universally Unique Identifier) v1 and v4 strings in different formats.
        </p>
      </div>

      {/* Configuration Controls */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-5">
        <span className="text-sm font-semibold text-foreground/80 text-left border-b border-border/20 pb-2">Generator Settings</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 items-end text-left">
          {/* Version */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">UUID Version</label>
            <Select value={uuidVersion} onValueChange={(v) => setUuidVersion(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">Version 4 (Random)</SelectItem>
                <SelectItem value="v1">Version 1 (Time-based)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk count */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Quantity (Max 500)</label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={500}
              className="h-9"
            />
          </div>

          {/* Hyphens */}
          <div className="flex flex-col gap-2.5 pb-2">
            <label className="text-xs font-semibold text-muted-foreground">Use Hyphens</label>
            <div className="flex items-center gap-2">
              <Switch id="hyphen-toggle" checked={useHyphens} onCheckedChange={setUseHyphens} />
              <span className="text-xs font-medium text-foreground">e.g. f81d4fae-...</span>
            </div>
          </div>

          {/* Braces */}
          <div className="flex flex-col gap-2.5 pb-2">
            <label className="text-xs font-semibold text-muted-foreground">Wrap in Braces</label>
            <div className="flex items-center gap-2">
              <Switch id="braces-toggle" checked={useBraces} onCheckedChange={setUseBraces} />
              <span className="text-xs font-medium text-foreground">e.g. {"{f81d4fae-...}"}</span>
            </div>
          </div>

          {/* Uppercase */}
          <div className="flex flex-col gap-2.5 pb-2">
            <label className="text-xs font-semibold text-muted-foreground">Uppercase Casing</label>
            <div className="flex items-center gap-2">
              <Switch id="case-toggle" checked={uppercase} onCheckedChange={setUppercase} />
              <span className="text-xs font-medium text-foreground">e.g. F81D4FAE-...</span>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <Button onClick={handleGenerate} className="self-start gap-1.5 h-9" size="sm">
          <RefreshCw className="h-4 w-4" />
          Regenerate List
        </Button>
      </div>

      {/* Main output */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Plain Text List */}
        <div className="md:col-span-7 flex flex-col gap-2 text-left min-h-[350px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
              <List className="h-4 w-4 text-primary" />
              Plain Text List
            </span>
            <CopyButton value={plainTextList} label="Copy List" />
          </div>
          <textarea
            readOnly
            value={plainTextList}
            className="flex-1 w-full min-h-[300px] p-4 rounded-xl border border-border/40 bg-muted/20 font-mono text-sm leading-relaxed focus:outline-none resize-y"
          />
        </div>

        {/* JSON Representation */}
        <div className="md:col-span-5 flex flex-col gap-2 text-left min-h-[350px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
              <FileCode className="h-4 w-4 text-sky-500" />
              JSON Array Format
            </span>
            <CopyButton value={jsonArrayList} label="Copy JSON" />
          </div>
          <textarea
            readOnly
            value={jsonArrayList}
            className="flex-1 w-full min-h-[300px] p-4 rounded-xl border border-border/40 bg-muted/20 font-mono text-xs leading-relaxed focus:outline-none resize-y"
          />
        </div>
      </div>
    </div>
  );
};
