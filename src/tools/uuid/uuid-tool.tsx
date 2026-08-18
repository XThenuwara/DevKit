import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { ToolPanel, ToolShell } from "@/components/shared/tool-layout";
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
    <ToolShell
      title="UUID / GUID Generator"
      description="Bulk generate UUID v1 and v4 strings with hyphens, braces, and casing options."
      actions={
        <Button onClick={handleGenerate} className="h-7 gap-1.5 text-xs" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
          <div className="flex min-w-[140px] flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
            <Select value={uuidVersion} onValueChange={(v) => setUuidVersion(v as any)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">v4 Random</SelectItem>
                <SelectItem value="v1">v1 Time-based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[110px] flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={500}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="hyphen-toggle" checked={useHyphens} onCheckedChange={setUseHyphens} />
            <label htmlFor="hyphen-toggle" className="text-xs font-medium">Hyphens</label>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="braces-toggle" checked={useBraces} onCheckedChange={setUseBraces} />
            <label htmlFor="braces-toggle" className="text-xs font-medium">Braces</label>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="case-toggle" checked={uppercase} onCheckedChange={setUppercase} />
            <label htmlFor="case-toggle" className="text-xs font-medium">Uppercase</label>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-12">
          <ToolPanel className="md:col-span-7 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
                <List className="h-3.5 w-3.5 text-primary" />
                Plain Text
              </span>
              <CopyButton value={plainTextList} label="Copy" />
            </div>
            <textarea
              readOnly
              value={plainTextList}
              className="min-h-0 w-full flex-1 resize-none rounded-lg border border-border/50 bg-background/50 p-3 font-mono text-xs leading-relaxed focus:outline-none"
            />
          </ToolPanel>
          <ToolPanel className="md:col-span-5 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
                <FileCode className="h-3.5 w-3.5" />
                JSON Array
              </span>
              <CopyButton value={jsonArrayList} label="Copy" />
            </div>
            <textarea
              readOnly
              value={jsonArrayList}
              className="min-h-0 w-full flex-1 resize-none rounded-lg border border-border/50 bg-background/50 p-3 font-mono text-xs leading-relaxed focus:outline-none"
            />
          </ToolPanel>
        </div>
      </div>
    </ToolShell>
  );
};
