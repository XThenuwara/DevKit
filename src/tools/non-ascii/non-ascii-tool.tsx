import React, { useState, useMemo } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { Trash2, IterationCcw, Info, Wand2 } from "lucide-react";

interface NonAsciiChar {
  char: string;
  hex: string;
  count: number;
}

export const NonAsciiTool: React.FC = () => {
  const [inputText, setInputText] = useState("");

  const isAscii = (char: string) => {
    const code = char.charCodeAt(0);
    // Standard ASCII is 0-127
    // We also consider standard whitespace (\n, \r, \t) as valid
    return code <= 127;
  };

  const getHexCode = (char: string) => {
    return "U+" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
  };

  const { segments, characterMap, totalNonAscii } = useMemo(() => {
    const map = new Map<string, NonAsciiChar>();
    let total = 0;
    
    // We will build an array of segments: { text: string, isNonAscii: boolean }
    const segments: { text: string; isNonAscii: boolean; hex?: string }[] = [];
    
    if (!inputText) return { segments, characterMap: map, totalNonAscii: total };

    let currentSegmentText = "";
    let inNonAscii = false;

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      
      // Some characters like surrogate pairs need special handling, but charCodeAt is mostly fine
      // for basic identification since it will flag both surrogate halves as non-ASCII.
      const ascii = isAscii(char);

      if (!ascii) {
        // Record in map
        if (map.has(char)) {
          map.get(char)!.count++;
        } else {
          map.set(char, { char, hex: getHexCode(char), count: 1 });
        }
        total++;

        if (!inNonAscii && currentSegmentText) {
          segments.push({ text: currentSegmentText, isNonAscii: false });
          currentSegmentText = "";
        }
        inNonAscii = true;
        // For non-ASCII, we usually want them individually wrapped for tooltips
        segments.push({ text: char, isNonAscii: true, hex: getHexCode(char) });
      } else {
        if (inNonAscii) {
          inNonAscii = false;
        }
        currentSegmentText += char;
      }
    }

    if (currentSegmentText) {
      segments.push({ text: currentSegmentText, isNonAscii: false });
    }

    return { segments, characterMap: map, totalNonAscii: total };
  }, [inputText]);

  const handleRemoveNonAscii = () => {
    const clean = inputText.split("").filter(isAscii).join("");
    setInputText(clean);
  };

  const handleReplaceWithSpace = () => {
    const clean = inputText.split("").map((c) => (isAscii(c) ? c : " ")).join("");
    setInputText(clean);
  };

  const loadExample = () => {
    // string with non-ascii characters (zero width space, curly quotes, emoji, right-to-left mark, etc.)
    const sample = `Hello world!\u200B This is an “example” string with some hidden characters.\nIt also contains an emoji 🚀 and a right-to-left mark \u200F.\nLet's see if it catches them!`;
    setInputText(sample);
  };

  return (
    <ToolLayout
      title="Non-ASCII Identifier"
      description="Identify, highlight, and remove hidden or non-ASCII characters from text."
      inputValue={inputText}
      onInputChange={setInputText}
      inputType="textarea"
      outputType="textarea"
      outputLabel="Preview & Inspector"
      allowPaste={true}
      allowClear={true}
      customInputActions={
        <Button variant="ghost" size="sm" onClick={loadExample} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary gap-1">
          <Wand2 className="h-2.5 w-2.5" /> Load Example
        </Button>
      }
      customOutputActions={
        totalNonAscii > 0 ? (
          <>
            <span className="px-2 py-0.5 mr-2 rounded-full bg-destructive/10 text-[10px] font-semibold text-destructive border border-destructive/20">
              {totalNonAscii} found
            </span>
            <Button variant="ghost" size="sm" onClick={handleReplaceWithSpace} className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground">
              <IterationCcw className="h-3 w-3 mr-1" /> Replace with Space
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemoveNonAscii} className="h-7 px-2 text-[10px] text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Remove All
            </Button>
          </>
        ) : null
      }
      outputChildren={
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden border border-border rounded-xl">
            {/* Visual Preview */}
            <div className="flex-1 min-w-0 p-4 overflow-y-auto border-r border-border/40 bg-background/50 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
              {!inputText ? (
                <span className="text-muted-foreground/40 italic">Input text to analyze...</span>
              ) : (
                segments.map((seg, i) =>
                  seg.isNonAscii ? (
                    <span
                      key={i}
                      title={seg.hex}
                      className="inline-block bg-destructive/20 text-destructive font-bold px-0.5 rounded-[2px] border border-destructive/30 mx-[1px] cursor-help"
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i} className="text-foreground">
                      {seg.text}
                    </span>
                  )
                )
              )}
            </div>

            {/* Inspector Sidebar */}
            <div className="w-full lg:w-[280px] shrink-0 flex flex-col bg-muted/10">
              <div className="px-4 py-2 border-b border-border/40 bg-muted/20 shrink-0">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detected Characters</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {characterMap.size === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                    <Info className="h-6 w-6 mb-2 opacity-20" />
                    <p className="text-xs">No non-ASCII characters found.</p>
                  </div>
                ) : (
                  Array.from(characterMap.values()).map((info, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-bold text-lg">
                          {info.char}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-medium text-foreground">{info.hex}</span>
                          <span className="text-[10px] text-muted-foreground">{info.count} occurence{info.count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <CopyButton value={info.char} className="h-6 w-6" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};
