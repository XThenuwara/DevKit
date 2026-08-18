import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ClipboardPaste, Trash2 } from "lucide-react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { convert, toPreviewHtml, type ConvertDirection } from "./converter";

const SAMPLE_HTML = `<h1>Hello World</h1>
<p>This is a <strong>bold</strong> paragraph with a <a href="https://example.com">link</a>.</p>
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Role</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Ada Lovelace</td>
      <td>Engineer</td>
      <td>Active</td>
    </tr>
    <tr>
      <td>Alan Turing</td>
      <td>Researcher</td>
      <td>Pending</td>
    </tr>
  </tbody>
</table>
<pre><code>const greeting = "Hello";</code></pre>`;

const SAMPLE_MARKDOWN = `# Hello World

This is a **bold** paragraph with a [link](https://example.com).

- First item
- Second item

| Name | Role | Status |
| --- | --- | --- |
| Ada Lovelace | Engineer | Active |
| Alan Turing | Researcher | Pending |

\`\`\`js
const greeting = "Hello";
\`\`\``;

const PREVIEW_CLASS =
  "html-preview h-full min-h-0 max-w-none overflow-y-auto rounded-xl border border-border bg-card/50 p-4 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border/70 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border/70 [&_th]:bg-background/50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_ul]:list-disc";

type PaneTab = "source" | "preview";

const PreviewFrame: React.FC<{ html: string; emptyLabel: string }> = ({ html, emptyLabel }) => {
  if (!html) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return <div className={PREVIEW_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
};

export const HtmlMarkdownTool: React.FC = () => {
  const [direction, setDirection] = useState<ConvertDirection>("html-to-md");
  const [input, setInput] = useState(SAMPLE_HTML);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputTab, setInputTab] = useState<PaneTab>("source");
  const [outputTab, setOutputTab] = useState<PaneTab>("source");

  const inputKind = direction === "html-to-md" ? "html" : "markdown";
  const outputKind = direction === "html-to-md" ? "markdown" : "html";

  const labels = useMemo(() => {
    if (direction === "html-to-md") {
      return {
        input: "HTML",
        output: "Markdown",
        inputPlaceholder: "Paste or type HTML here...",
        outputPlaceholder: "Converted Markdown will appear here...",
        swap: "Switch to Markdown → HTML",
      };
    }
    return {
      input: "Markdown",
      output: "HTML",
      inputPlaceholder: "Paste or type Markdown here...",
      outputPlaceholder: "Converted HTML will appear here...",
      swap: "Switch to HTML → Markdown",
    };
  }, [direction]);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      setError(null);
      setOutput(convert(input, direction));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
      setOutput("");
    }
  }, [input, direction]);

  const inputPreview = useMemo(() => toPreviewHtml(input, inputKind), [input, inputKind]);
  const outputPreview = useMemo(
    () => (error ? "" : toPreviewHtml(output, outputKind)),
    [error, output, outputKind],
  );

  const handleSwap = () => {
    const nextDirection: ConvertDirection =
      direction === "html-to-md" ? "md-to-html" : "html-to-md";
    setDirection(nextDirection);
    setInput(output || input);
    setOutput("");
    setError(null);
    setInputTab("source");
    setOutputTab("source");
  };

  const loadSample = () => {
    setInput(direction === "html-to-md" ? SAMPLE_HTML : SAMPLE_MARKDOWN);
    setInputTab("source");
  };

  const handlePaste = async () => {
    try {
      setInput(await navigator.clipboard.readText());
      setInputTab("source");
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ToolLayout
        title="HTML ↔ Markdown Converter"
        description="Convert between HTML and Markdown in real time. Preview the rendered web view for both sides."
        inputType="none"
        outputType="none"
        controls={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Direction:</span>
            <div className="flex gap-1.5">
              <Button
                variant={direction === "html-to-md" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs py-0"
                onClick={() => setDirection("html-to-md")}
                type="button"
              >
                HTML → MD
              </Button>
              <Button
                variant={direction === "md-to-html" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs py-0"
                onClick={() => setDirection("md-to-html")}
                type="button"
              >
                MD → HTML
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={loadSample}
              type="button"
            >
              Load sample
            </Button>
          </div>
        }
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground/85">{labels.input}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePaste}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInput("")}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  type="button"
                  disabled={!input}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            <Tabs
              value={inputTab}
              onValueChange={(value) => setInputTab(value as PaneTab)}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
            >
              <TabsList className="h-7 w-fit shrink-0 p-0.5">
                <TabsTrigger value="source" className="h-full px-3 text-[10px] py-0.5">
                  Source
                </TabsTrigger>
                <TabsTrigger value="preview" className="h-full px-3 text-[10px] py-0.5">
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="source" className="mt-0 min-h-0 flex-1 overflow-hidden border-0 p-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={labels.inputPlaceholder}
                  className="h-full min-h-0 w-full resize-none overflow-y-auto rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden border-0 p-0">
                <PreviewFrame html={inputPreview} emptyLabel={`Paste ${labels.input.toLowerCase()} to preview.`} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground/85">{labels.output}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwap}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title={labels.swap}
                  type="button"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                  {labels.swap}
                </Button>
                <CopyButton value={output} label="Copy" />
              </div>
            </div>
            <Tabs
              value={outputTab}
              onValueChange={(value) => setOutputTab(value as PaneTab)}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
            >
              <TabsList className="h-7 w-fit shrink-0 p-0.5">
                <TabsTrigger value="source" className="h-full px-3 text-[10px] py-0.5">
                  Source
                </TabsTrigger>
                <TabsTrigger value="preview" className="h-full px-3 text-[10px] py-0.5">
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="source" className="mt-0 min-h-0 flex-1 overflow-hidden border-0 p-0">
                <textarea
                  readOnly
                  value={output}
                  placeholder={labels.outputPlaceholder}
                  className={`h-full min-h-0 w-full resize-none overflow-y-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:outline-none ${
                    error ? "border-destructive text-destructive/90" : "border-border text-foreground"
                  }`}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden border-0 p-0">
                <PreviewFrame
                  html={outputPreview}
                  emptyLabel={error ?? `Converted ${labels.output.toLowerCase()} preview will appear here.`}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ToolLayout>
    </div>
  );
};
