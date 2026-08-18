import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlignLeft, Braces, Eye, Info } from "lucide-react";

const syntaxHighlight = (jsonStr: string) => {
  if (!jsonStr) return "";
  const escaped = jsonStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-purple-600 dark:text-purple-400 font-medium";
        } else {
          cls = "text-emerald-600 dark:text-emerald-400";
        }
      } else if (/true|false/.test(match)) {
        cls = "text-amber-600 dark:text-amber-500 font-semibold";
      } else if (/null/.test(match)) {
        cls = "text-gray-500 dark:text-gray-400 font-bold";
      } else {
        cls = "text-sky-600 dark:text-sky-400";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
};

export const JsonTool: React.FC = () => {
  const [inputJson, setInputJson] = useState("");
  const [outputJson, setOutputJson] = useState("");
  const [indentSize, setIndentSize] = useState("2");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"text" | "tree">("text");
  const [parsedData, setParsedData] = useState<any>(null);

  // Core Formatting Logic
  const formatJson = (jsonStr: string, indent: string) => {
    if (!jsonStr.trim()) {
      setOutputJson("");
      setErrorMsg(null);
      setParsedData(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      setParsedData(parsed);
      setErrorMsg(null);

      const spacer = indent === "tab" ? "\t" : parseInt(indent, 10);
      setOutputJson(JSON.stringify(parsed, null, spacer));
    } catch (e: any) {
      setErrorMsg(e.message);
      setOutputJson("");
      setParsedData(null);
    }
  };

  const minifyJson = () => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      setParsedData(parsed);
      setErrorMsg(null);
      setOutputJson(JSON.stringify(parsed));
    } catch (e: any) {
      setErrorMsg(e.message);
      setOutputJson("");
      setParsedData(null);
    }
  };

  // Run formatting when input json or indentation changes
  useEffect(() => {
    formatJson(inputJson, indentSize);
  }, [inputJson, indentSize]);

  // Collapsible Tree Node Renderer
  const TreeNode: React.FC<{ name?: string; value: any; isLast?: boolean }> = ({ name, value, isLast = true }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const serialized = JSON.stringify(value, null, 2);
        navigator.clipboard.writeText(serialized);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error("Failed to copy JSON subtree:", err);
      }
    };

    if (value === null) {
      return (
        <div
          className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-gray-500 font-bold">null</span>
          {!isLast && <span className="text-foreground/50">,</span>}
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}
        </div>
      );
    }

    if (typeof value === "undefined") {
      return null;
    }

    if (typeof value === "boolean") {
      return (
        <div
          className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-amber-500 font-semibold">{value.toString()}</span>
          {!isLast && <span className="text-foreground/50">,</span>}
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}
        </div>
      );
    }

    if (typeof value === "number") {
      return (
        <div
          className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-sky-500">{value}</span>
          {!isLast && <span className="text-foreground/50">,</span>}
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}
        </div>
      );
    }

    if (typeof value === "string") {
      return (
        <div
          className={`pl-4 font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-emerald-400">"{value}"</span>
          {!isLast && <span className="text-foreground/50">,</span>}
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <div
            className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
              copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
            }`}
            onDoubleClick={handleDoubleClick}
          >
            {name && <span className="text-purple-400">"{name}"</span>}
            {name && <span className="text-foreground/60">: </span>}
            <span className="text-foreground/60">[]</span>
            {!isLast && <span className="text-foreground/50">,</span>}
            {copied && (
              <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
                Copied!
              </span>
            )}
          </div>
        );
      }

      return (
        <div
          className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          <span
            className="cursor-pointer hover:bg-muted/30 select-none text-foreground/70"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            {collapsed ? "▶" : "▼"}{" "}
            {name && <span className="text-purple-400">"{name}"</span>}
            {name && <span className="text-foreground/60">: </span>}
            <span className="text-foreground/50">Array[{value.length}] [</span>
          </span>
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}

          {!collapsed && (
            <div className="border-l border-border/40 ml-1.5 my-0.5" onDoubleClick={(e) => e.stopPropagation()}>
              {value.map((item, index) => (
                <TreeNode key={index} value={item} isLast={index === value.length - 1} />
              ))}
            </div>
          )}

          {collapsed && <span className="text-foreground/40 font-semibold px-1">...</span>}
          <span className="text-foreground/50">]</span>
          {!isLast && <span className="text-foreground/50">,</span>}
        </div>
      );
    }

    // Object types
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div
          className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
            copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-foreground/60">{"{}"}</span>
          {!isLast && <span className="text-foreground/50">,</span>}
          {copied && (
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
              Copied!
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className={`pl-4 font-mono text-sm leading-relaxed rounded cursor-pointer transition-colors duration-150 hover:bg-primary/5 select-none ${
          copied ? "bg-emerald-500/10 dark:bg-emerald-500/20" : ""
        }`}
        onDoubleClick={handleDoubleClick}
      >
        <span
          className="cursor-pointer hover:bg-muted/30 select-none text-foreground/70"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
        >
          {collapsed ? "▶" : "▼"}{" "}
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-foreground/60">: </span>}
          <span className="text-foreground/50">{"{"}</span>
        </span>
        {copied && (
          <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-medium">
            Copied!
          </span>
        )}

        {!collapsed && (
          <div className="border-l border-border/40 ml-1.5 my-0.5" onDoubleClick={(e) => e.stopPropagation()}>
            {keys.map((key, index) => (
              <TreeNode key={key} name={key} value={value[key]} isLast={index === keys.length - 1} />
            ))}
          </div>
        )}

        {collapsed && <span className="text-foreground/40 font-semibold px-1">...</span>}
        <span className="text-foreground/50">{"}"}</span>
        {!isLast && <span className="text-foreground/50">,</span>}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ToolLayout
        title="JSON Formatter & Validator"
        description="Format, prettify, and minify your JSON data. Validate syntax and view JSON structures in a clean text layout or an interactive tree view."
        inputValue={inputJson}
        onInputChange={setInputJson}
        inputLabel="Raw JSON"
        inputPlaceholder='Paste your raw JSON string here... e.g. {"name": "DevKit", "active": true}'
        outputValue={outputJson}
        outputLabel="Formatted JSON"
        outputPlaceholder="Prettified JSON will appear here..."
        error={errorMsg}
        controls={
          <div className="flex items-center justify-between flex-wrap gap-2 w-full text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Indentation:</span>
              <Select value={indentSize} onValueChange={setIndentSize}>
                <SelectTrigger className="w-[110px] h-7 text-xs py-0">
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Spaces</SelectItem>
                  <SelectItem value="4">4 Spaces</SelectItem>
                  <SelectItem value="tab">Tab Character</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={minifyJson} className="h-7 text-xs py-0">
                <AlignLeft className="h-3.5 w-3.5 mr-1" />
                Minify JSON
              </Button>
            </div>

            {parsedData && (
              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                <Braces className="h-3 w-3 text-primary animate-pulse" />
                Valid JSON Structure
              </div>
            )}
          </div>
        }
        customOutputActions={
          parsedData && (
            <Tabs
              value={activeViewTab}
              onValueChange={(v) => setActiveViewTab(v as any)}
              className="h-7 border border-border/40 rounded p-0.5 bg-muted/20 flex items-center mr-1"
            >
              <TabsList className="bg-transparent h-full p-0 flex gap-0.5">
                <TabsTrigger value="text" className="h-full px-2 text-[10px] py-0.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <AlignLeft className="h-3 w-3 mr-1" />
                  Text View
                </TabsTrigger>
                <TabsTrigger value="tree" className="h-full px-2 text-[10px] py-0.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Tree View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )
        }
        outputChildren={
          activeViewTab === "tree" && parsedData ? (
            <div className="flex-1 w-full min-h-0 p-3 rounded-xl border border-border/50 bg-background overflow-y-auto text-left flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-b border-border/20 pb-1.5 mb-1 font-semibold shrink-0">
                <Info className="h-3 w-3 text-primary" />
                Click keys to expand/collapse. Double-click any node to copy its specific value/subtree.
              </div>
              <div className="pl-1 overflow-x-auto flex-1">
                <span className="font-mono text-xs text-foreground/45">root =</span>
                <TreeNode value={parsedData} isLast={true} />
              </div>
            </div>
          ) : activeViewTab === "text" && outputJson ? (
            <pre
              className="flex-1 w-full min-h-0 p-3 rounded-xl border border-border/50 bg-background overflow-y-auto text-left font-mono text-xs leading-relaxed whitespace-pre-wrap break-all select-text animate-in fade-in duration-200"
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(outputJson) }}
            />
          ) : undefined
        }
      />
    </div>
  );
};
