import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Trash2, Plus, Info } from "lucide-react";

interface QueryParam {
  key: string;
  value: string;
}

export const UrlTool: React.FC = () => {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  // URL Parser state
  const [parsedUrl, setParsedUrl] = useState<{
    protocol: string;
    host: string;
    pathname: string;
    hash: string;
    queryParams: QueryParam[];
  } | null>(null);

  // URL logic
  const handleUrlConvert = (str: string, currentMode: "encode" | "decode") => {
    setErrorText(null);
    if (!str.trim()) {
      setOutputText("");
      setParsedUrl(null);
      return;
    }

    try {
      if (currentMode === "encode") {
        setOutputText(encodeURIComponent(str));
      } else {
        setOutputText(decodeURIComponent(str));
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }

    // Try to parse as URL
    try {
      // Clean query params
      const parsed = new URL(str);
      const queryParams: QueryParam[] = [];
      parsed.searchParams.forEach((value, key) => {
        queryParams.push({ key, value });
      });

      setParsedUrl({
        protocol: parsed.protocol,
        host: parsed.host,
        pathname: parsed.pathname,
        hash: parsed.hash,
        queryParams,
      });
    } catch (err) {
      // Not a valid URL, ignore parser tab
      setParsedUrl(null);
    }
  };

  const setErrorMsg = (msg: string) => {
    setErrorText(msg);
    setOutputText("");
  };

  useEffect(() => {
    handleUrlConvert(inputText, mode);
  }, [inputText, mode]);

  const handleSwap = () => {
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    setInputText(outputText);
    setOutputText(inputText);
  };

  // Update URL string when params change in the table
  const updateUrlFromParams = (
    protocol: string,
    host: string,
    pathname: string,
    hash: string,
    params: QueryParam[]
  ) => {
    try {
      // Build base URL
      let baseUrl = "";
      if (protocol) baseUrl += protocol + "//";
      baseUrl += host;
      baseUrl += pathname;

      const urlObj = new URL(baseUrl);
      params.forEach((param) => {
        if (param.key.trim()) {
          urlObj.searchParams.append(param.key, param.value);
        }
      });
      urlObj.hash = hash;

      // Update state without infinite loops
      setInputText(urlObj.toString());
    } catch (e) {
      // ignore
    }
  };

  const handleParamChange = (index: number, field: "key" | "value", newValue: string) => {
    if (!parsedUrl) return;
    const updatedParams = [...parsedUrl.queryParams];
    updatedParams[index] = { ...updatedParams[index], [field]: newValue };
    
    setParsedUrl({ ...parsedUrl, queryParams: updatedParams });
    updateUrlFromParams(
      parsedUrl.protocol,
      parsedUrl.host,
      parsedUrl.pathname,
      parsedUrl.hash,
      updatedParams
    );
  };

  const handleDeleteParam = (index: number) => {
    if (!parsedUrl) return;
    const updatedParams = parsedUrl.queryParams.filter((_, i) => i !== index);
    
    setParsedUrl({ ...parsedUrl, queryParams: updatedParams });
    updateUrlFromParams(
      parsedUrl.protocol,
      parsedUrl.host,
      parsedUrl.pathname,
      parsedUrl.hash,
      updatedParams
    );
  };

  const handleAddParam = () => {
    if (!parsedUrl) return;
    const updatedParams = [...parsedUrl.queryParams, { key: "", value: "" }];
    
    setParsedUrl({ ...parsedUrl, queryParams: updatedParams });
    updateUrlFromParams(
      parsedUrl.protocol,
      parsedUrl.host,
      parsedUrl.pathname,
      parsedUrl.hash,
      updatedParams
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ToolLayout
        title="URL Encoder / Decoder"
        description="Encode text to URL-safe strings, or decode URL components. Full URL paths will trigger the interactive URL search parameters builder."
        inputValue={inputText}
        onInputChange={setInputText}
        inputLabel={mode === "encode" ? "Raw Text / URL" : "URL Encoded Text"}
        inputPlaceholder={
          mode === "encode"
            ? "Enter your URL or plain text here..."
            : "Enter your URL-encoded string here..."
        }
        outputValue={outputText}
        outputLabel={mode === "encode" ? "URL Encoded Text" : "Decoded Text"}
        outputPlaceholder={
          mode === "encode"
            ? "URL encoded output will appear here..."
            : "Decoded output will appear here..."
        }
        error={errorText}
        onSwap={handleSwap}
        swapLabel={mode === "encode" ? "Switch to Decode" : "Switch to Encode"}
        controls={
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-xs font-semibold text-muted-foreground">Operation Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={mode === "encode" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs py-0"
                onClick={() => {
                  setMode("encode");
                  setInputText("");
                  setOutputText("");
                }}
              >
                Encode
              </Button>
              <Button
                variant={mode === "decode" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs py-0"
                onClick={() => {
                  setMode("decode");
                  setInputText("");
                  setOutputText("");
                }}
              >
                Decode
              </Button>
            </div>
          </div>
        }
      >
        {parsedUrl && (
          <div className="mt-3 flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-border/50 bg-background/50 p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Query parameters
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3" />
                Edits update the input
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Protocol</span>
                <span className="truncate rounded-lg border border-border/50 bg-background px-2 py-1 font-mono font-semibold">
                  {parsedUrl.protocol || "none"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Host</span>
                <span className="truncate rounded-lg border border-border/50 bg-background px-2 py-1 font-mono font-semibold">
                  {parsedUrl.host || "none"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Path</span>
                <span className="truncate rounded-lg border border-border/50 bg-background px-2 py-1 font-mono font-semibold">
                  {parsedUrl.pathname || "none"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Hash</span>
                <span className="truncate rounded-lg border border-border/50 bg-background px-2 py-1 font-mono font-semibold">
                  {parsedUrl.hash || "none"}
                </span>
              </div>
            </div>

            {/* Query parameters Table */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-foreground/80">Query Parameters ({parsedUrl.queryParams.length})</span>
              
              <div className="flex flex-col gap-2">
                {parsedUrl.queryParams.length === 0 ? (
                  <span className="text-xs text-muted-foreground font-mono bg-muted/5 p-4 border border-dashed rounded-xl text-center">
                    No query parameters found in the URL.
                  </span>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {parsedUrl.queryParams.map((param, index) => (
                      <div key={index} className="flex gap-3 items-center animate-in fade-in duration-200">
                        <Input
                          value={param.key}
                          onChange={(e) => handleParamChange(index, "key", e.target.value)}
                          placeholder="key"
                          className="flex-1 font-mono text-xs h-9 bg-background/50"
                        />
                        <span className="text-muted-foreground font-bold font-mono text-xs">=</span>
                        <Input
                          value={param.value}
                          onChange={(e) => handleParamChange(index, "value", e.target.value)}
                          placeholder="value"
                          className="flex-1 font-mono text-xs h-9 bg-background/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteParam(index)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddParam}
                  className="self-start mt-1.5 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Parameter
                </Button>
              </div>
            </div>
          </div>
        )}
      </ToolLayout>
    </div>
  );
};
