import { useState, useMemo } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { ScanText, BarChart3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function TextAnalyzerTool() {
  const [text, setText] = useState("");
  const [find, setFind] = useState("");
  const [regex, setRegex] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);

  const stats = useMemo(() => {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split("\n").length : 0;
    const emptyLines = text ? text.split("\n").filter(l => !l.trim()).length : 0;
    const bytes = new Blob([text]).size;

    return { chars, charsNoSpaces, words, lines, emptyLines, bytes };
  }, [text]);

  const occurrenceCount = useMemo(() => {
    if (!find) return 0;
    try {
      if (regex) {
        const flags = "g" + (ignoreCase ? "i" : "");
        const regExpr = new RegExp(find, flags);
        const matches = text.match(regExpr);
        return matches ? matches.length : 0;
      } else {
        const target = ignoreCase ? find.toLowerCase() : find;
        const searchIn = ignoreCase ? text.toLowerCase() : text;
        let count = 0;
        let pos = 0;
        while (true) {
          pos = searchIn.indexOf(target, pos);
          if (pos >= 0) {
            count++;
            pos += target.length;
          } else {
            break;
          }
        }
        return count;
      }
    } catch {
      return 0; // Invalid regex
    }
  }, [text, find, regex, ignoreCase]);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 px-1 pb-3 shrink-0">
        <ScanText className="h-4 w-4 text-primary shrink-0" />
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-foreground leading-tight">Text Analyzer</h1>
          <p className="text-[11px] text-muted-foreground/80 leading-tight">Count words, characters, lines, and occurrences</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 gap-4 p-1">
        {/* Input Area */}
        <div className="flex-1 min-h-0 relative flex flex-col rounded-lg border border-border/40 bg-card/30 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0 bg-muted/20">
            <span className="text-xs font-semibold text-foreground/80">Input Text</span>
            <CopyButton value={text} label="Copy" />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here to analyze..."
            className="flex-1 w-full p-4 bg-transparent resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 text-foreground"
          />
        </div>

        {/* Stats & Search Panel */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* General Stats */}
          <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground/80">Statistics</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <StatRow label="Characters" value={stats.chars} />
              <StatRow label="Characters (no spaces)" value={stats.charsNoSpaces} />
              <StatRow label="Words" value={stats.words} />
              <StatRow label="Lines" value={stats.lines} />
              <StatRow label="Empty Lines" value={stats.emptyLines} />
              <StatRow label="Bytes (UTF-8)" value={stats.bytes} />
            </div>
          </div>

          {/* Occurrences Finder */}
          <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <Search className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground/80">Count Occurrences</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Search For</span>
                <Input
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  placeholder="Word, character, or regex..."
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <Checkbox checked={ignoreCase} onCheckedChange={(c) => setIgnoreCase(!!c)} />
                  <span className="select-none font-medium text-xs">Ignore Case</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <Checkbox checked={regex} onCheckedChange={(c) => setRegex(!!c)} />
                  <span className="select-none font-medium text-xs">Use Regular Expression</span>
                </label>
              </div>

              <div className="mt-2 pt-3 border-t border-border/40 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Matches Found</span>
                <span className="text-lg font-bold text-primary">{occurrenceCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold font-mono">{value.toLocaleString()}</span>
  </div>
);
