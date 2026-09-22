import React, { useRef, useState } from "react";
import { DiffEditor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { GitCompare, LayoutPanelLeft, ListTree } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeDiffText } from "../openapi/diff-utils";
import { useTheme } from "@/components/theme-provider";

const SUPPORTED_LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "markdown", label: "Markdown" },
];

export const DiffTool: React.FC = () => {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [language, setLanguage] = useState("plaintext");
  
  const [ignoreTrimWhitespace, setIgnoreTrimWhitespace] = useState(false);
  const [renderSideBySide, setRenderSideBySide] = useState(true);
  
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

  const handleMount = (editor: editor.IStandaloneDiffEditor, monaco: Monaco) => {
    diffEditorRef.current = editor;

    // Listen to changes on the original editor
    const originalEditor = editor.getOriginalEditor();
    originalEditor.onDidChangeModelContent(() => {
      setOriginal(originalEditor.getValue());
    });

    // Listen to changes on the modified editor
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent(() => {
      setModified(modifiedEditor.getValue());
    });
    
    // Formatting JSON/YAML diagnostics
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
    });
  };

  const handleFormat = () => {
    if (language === "json" || language === "yaml") {
      setOriginal(normalizeDiffText(original, language as "json" | "yaml"));
      setModified(normalizeDiffText(modified, language as "json" | "yaml"));
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Header and Toolbar */}
      <div className="shrink-0 flex flex-col gap-3 p-4 border-b border-border/50 bg-card/30">
        <div>
          <h1 className="text-sm font-bold">Diff Checker</h1>
          <p className="text-xs text-muted-foreground">Compare two snippets of text or code to see their differences.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 border-r border-border/50 pr-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox 
                checked={renderSideBySide} 
                onCheckedChange={(v) => setRenderSideBySide(v === true)} 
              />
              <span className="text-xs font-medium">Side by Side</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox 
                checked={ignoreTrimWhitespace} 
                onCheckedChange={(v) => setIgnoreTrimWhitespace(v === true)} 
              />
              <span className="text-xs font-medium">Ignore Whitespace</span>
            </label>
          </div>
          
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(language === "json" || language === "yaml") && (
            <Button variant="outline" size="sm" onClick={handleFormat} title="Sort keys and format both sides" className="h-8">
              <ListTree className="w-3.5 h-3.5 mr-1.5" />
              Sort Keys
            </Button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 min-h-0 relative bg-background">
        {/* Helper overlays if empty */}
        {original === "" && modified === "" && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-50">
            <div className="flex gap-16 w-full max-w-4xl px-12">
              <div className="flex-1 text-center flex flex-col items-center justify-center gap-2">
                <LayoutPanelLeft className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Original text</p>
                <p className="text-xs text-muted-foreground/70">Paste your baseline here</p>
              </div>
              <div className="flex-1 text-center flex flex-col items-center justify-center gap-2">
                <GitCompare className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Modified text</p>
                <p className="text-xs text-muted-foreground/70">Paste your new text here</p>
              </div>
            </div>
          </div>
        )}
        
        <DiffEditor
          height="100%"
          language={language}
          original={original}
          modified={modified}
          theme={isDark ? "vs-dark" : "vs"}
          onMount={handleMount}
          options={{
            originalEditable: true,
            renderSideBySide,
            ignoreTrimWhitespace,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            diffWordWrap: "on",
          }}
        />
      </div>
    </div>
  );
};
