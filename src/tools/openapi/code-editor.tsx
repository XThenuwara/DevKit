import React, { useEffect, useRef, useState } from "react";
import Editor, { DiffEditor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CodeLanguage = "yaml" | "json";

const useIsDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
};

const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 12,
  lineHeight: 18,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  scrollBeyondLastLine: false,
  wordWrap: "on",
  padding: { top: 8, bottom: 8 },
  automaticLayout: true,
  tabSize: 2,
  renderLineHighlight: "line",
  bracketPairColorization: { enabled: true },
  folding: true,
  foldingStrategy: "indentation",
  showFoldingControls: "always",
  lineNumbers: "on",
  glyphMargin: false,
};

const runFold = (instance: editor.IStandaloneCodeEditor | null, action: string) => {
  void instance?.getAction(action)?.run();
};

const FoldToolbar: React.FC<{ editor: editor.IStandaloneCodeEditor | null }> = ({ editor: instance }) => (
  <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">
    <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fold</span>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-[10px]"
      type="button"
      onClick={() => runFold(instance, "editor.unfoldAll")}
    >
      <ChevronsUpDown className="h-3 w-3 mr-1" />
      Expand all
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-[10px]"
      type="button"
      onClick={() => runFold(instance, "editor.foldAll")}
    >
      <ChevronsDownUp className="h-3 w-3 mr-1" />
      Collapse all
    </Button>
    <span className="mx-1 h-3 w-px bg-border" />
    {[1, 2, 3, 4].map((level) => (
      <Button
        key={level}
        variant="ghost"
        size="sm"
        className="h-6 w-7 px-0 text-[10px] font-mono"
        type="button"
        title={`Collapse to level ${level}`}
        onClick={() => runFold(instance, `editor.foldLevel${level}`)}
      >
        L{level}
      </Button>
    ))}
  </div>
);

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  language: CodeLanguage;
  readOnly?: boolean;
  className?: string;
  height?: string | number;
  showFoldControls?: boolean;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onBlur,
  language,
  readOnly = false,
  className = "",
  height = "100%",
  showFoldControls = true,
}) => {
  const dark = useIsDark();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [, setReady] = useState(0);

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card ${className}`}>
      {showFoldControls ? <FoldToolbar editor={editorRef.current} /> : null}
      <div className="min-h-0 flex-1">
        <Editor
          height={height}
          language={language}
          value={value}
          theme={dark ? "vs-dark" : "vs"}
          options={{ ...editorOptions, readOnly }}
          onChange={(next) => onChange?.(next ?? "")}
          onMount={(instance) => {
            editorRef.current = instance;
            setReady((n) => n + 1);
            if (onBlur) instance.onDidBlurEditorText(onBlur);
          }}
          beforeMount={(monaco: Monaco) => {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              allowComments: false,
            });
          }}
        />
      </div>
    </div>
  );
};

type CodeDiffEditorProps = {
  original: string;
  modified: string;
  language: CodeLanguage;
  className?: string;
  height?: string | number;
};

export const CodeDiffEditor: React.FC<CodeDiffEditorProps> = ({
  original,
  modified,
  language,
  className = "",
  height = "100%",
}) => {
  const dark = useIsDark();

  return (
    <div className={`h-full min-h-0 overflow-hidden rounded-md border border-border bg-card ${className}`}>
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme={dark ? "vs-dark" : "vs"}
        options={{
          ...editorOptions,
          readOnly: true,
          renderSideBySide: true,
          enableSplitViewResizing: true,
        }}
      />
    </div>
  );
};
