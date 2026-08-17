import React, { useEffect, useState } from "react";
import Editor, { DiffEditor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

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
  lineNumbers: "on",
  glyphMargin: false,
};

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  language: CodeLanguage;
  readOnly?: boolean;
  className?: string;
  height?: string | number;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onBlur,
  language,
  readOnly = false,
  className = "",
  height = "100%",
}) => {
  const dark = useIsDark();

  return (
    <div className={`overflow-hidden rounded-md border border-border ${className}`}>
      <Editor
        height={height}
        language={language}
        value={value}
        theme={dark ? "vs-dark" : "vs"}
        options={{ ...editorOptions, readOnly }}
        onChange={(next) => onChange?.(next ?? "")}
        onMount={(editor) => {
          if (onBlur) editor.onDidBlurEditorText(onBlur);
        }}
        beforeMount={(monaco: Monaco) => {
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
          });
        }}
      />
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
    <div className={`overflow-hidden rounded-md border border-border ${className}`}>
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
