import React, { useEffect, useRef, useState } from "react";
import Editor, { DiffEditor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onMount?: (instance: editor.IStandaloneCodeEditor) => void;
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
  onMount,
  language,
  readOnly = false,
  className = "",
  height = "100%",
  showFoldControls = true,
}) => {
  const dark = useIsDark();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  return (
    <div className={`relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background ${className}`}>
      {showFoldControls ? (
        <div className="absolute top-1.5 right-1.5 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" type="button" className="bg-background/80 backdrop-blur-xs">
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Editor options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuLabel>Folding</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => runFold(editorRef.current, "editor.unfoldAll")}>
                Expand all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runFold(editorRef.current, "editor.foldAll")}>
                Collapse all
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[1, 2, 3, 4].map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => runFold(editorRef.current, `editor.foldLevel${level}`)}
                >
                  Collapse to level {level}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Editor
            height={height}
            language={language}
            value={value}
            theme={dark ? "vs-dark" : "vs"}
            options={{ ...editorOptions, readOnly }}
            onChange={(next) => onChange?.(next ?? "")}
            onMount={(instance) => {
              editorRef.current = instance;
              onMount?.(instance);
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
    </div>
  );
};

type CodeDiffEditorProps = {
  original: string;
  modified: string;
  language: CodeLanguage;
  className?: string;
  height?: string | number;
  onMount?: (diffEditor: editor.IStandaloneDiffEditor) => void;
};

export const CodeDiffEditor: React.FC<CodeDiffEditorProps> = ({
  original,
  modified,
  language,
  className = "",
  height = "100%",
  onMount,
}) => {
  const dark = useIsDark();

  return (
    <div className={`relative min-h-0 overflow-hidden bg-background ${className}`}>
      <div className="absolute inset-0">
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
          onMount={(instance) => {
            onMount?.(instance);
          }}
        />
      </div>
    </div>
  );
};
