import React, { useEffect, useMemo, useState } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { convert, type ConvertDirection } from "./converter";

const SAMPLE_HTML = `<h1>Hello World</h1>
<p>This is a <strong>bold</strong> paragraph with a <a href="https://example.com">link</a>.</p>
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
<pre><code>const greeting = "Hello";</code></pre>`;

const SAMPLE_MARKDOWN = `# Hello World

This is a **bold** paragraph with a [link](https://example.com).

- First item
- Second item

\`\`\`js
const greeting = "Hello";
\`\`\``;

export const HtmlMarkdownTool: React.FC = () => {
  const [direction, setDirection] = useState<ConvertDirection>("html-to-md");
  const [input, setInput] = useState(SAMPLE_HTML);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"source" | "preview">("source");

  const labels = useMemo(() => {
    if (direction === "html-to-md") {
      return {
        input: "HTML Input",
        output: "Markdown Output",
        inputPlaceholder: "Paste or type HTML here...",
        outputPlaceholder: "Converted Markdown will appear here...",
        swap: "Switch to Markdown → HTML",
      };
    }
    return {
      input: "Markdown Input",
      output: "HTML Output",
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

  useEffect(() => {
    setPreviewTab("source");
  }, [direction, output]);

  const handleSwap = () => {
    const nextDirection: ConvertDirection =
      direction === "html-to-md" ? "md-to-html" : "html-to-md";
    setDirection(nextDirection);
    setInput(output || input);
    setOutput("");
    setError(null);
  };

  const loadSample = () => {
    setInput(direction === "html-to-md" ? SAMPLE_HTML : SAMPLE_MARKDOWN);
  };

  const showPreview = direction === "md-to-html" && output && !error;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ToolLayout
        title="HTML ↔ Markdown Converter"
        description="Convert between HTML and Markdown in real time. Swap directions to edit the output as the new input."
        inputValue={input}
        onInputChange={setInput}
        inputLabel={labels.input}
        inputPlaceholder={labels.inputPlaceholder}
        outputValue={output}
        outputLabel={labels.output}
        outputPlaceholder={labels.outputPlaceholder}
        error={error}
        onSwap={handleSwap}
        swapLabel={labels.swap}
        customInputActions={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={loadSample}
            type="button"
          >
            Load sample
          </Button>
        }
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
          </div>
        }
        outputChildren={
          showPreview ? (
            <Tabs
              value={previewTab}
              onValueChange={(v) => setPreviewTab(v as "source" | "preview")}
              className="flex h-full min-h-0 flex-col overflow-hidden"
            >
              <TabsList className="mb-2 h-7 w-fit shrink-0 p-0.5">
                <TabsTrigger value="source" className="h-full px-3 text-[10px] py-0.5">
                  HTML Source
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
                  className="h-full min-h-0 w-full resize-none overflow-y-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden border-0 p-0">
                <div
                  className="html-preview h-full min-h-0 max-w-none overflow-y-auto rounded-xl border border-border bg-card/50 p-4 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: output }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <textarea
              readOnly
              value={output}
              placeholder={labels.outputPlaceholder}
              className={`h-full min-h-0 w-full resize-none overflow-y-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:outline-none ${
                error ? "border-destructive text-destructive/90" : "border-border text-foreground"
              }`}
            />
          )
        }
      />
    </div>
  );
};
