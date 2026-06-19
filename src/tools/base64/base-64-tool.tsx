import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { Upload, File, Image as ImageIcon, Download } from "lucide-react";

export const Base64Tool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  
  // Text Mode state
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  // File Mode state
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileType, setFileType] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  // UTF-8 safe base64 encoding/decoding
  const encodeBase64 = (str: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      throw new Error("Invalid characters for Base64 encoding.");
    }
  };

  const decodeBase64 = (str: string): string => {
    try {
      // Clean up whitespace/newlines
      const cleaned = str.replace(/\s+/g, "");
      return decodeURIComponent(escape(atob(cleaned)));
    } catch (e) {
      throw new Error("Input is not a valid Base64 string.");
    }
  };

  useEffect(() => {
    if (activeTab === "text") {
      if (!inputText) {
        setOutputText("");
        setErrorText(null);
        return;
      }
      try {
        setErrorText(null);
        if (mode === "encode") {
          setOutputText(encodeBase64(inputText));
        } else {
          setOutputText(decodeBase64(inputText));
        }
      } catch (err: any) {
        setErrorText(err.message);
        setOutputText("");
      }
    }
  }, [inputText, mode, activeTab]);

  const handleSwap = () => {
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    setInputText(outputText);
    setOutputText(inputText);
  };

  // File to Base64 logic
  const processFile = (file: File) => {
    setFileName(file.name);
    setFileType(file.type);
    
    // Format file size
    const kb = file.size / 1024;
    setFileSize(kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFileBase64(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerDownload = () => {
    if (!fileBase64) return;
    const link = document.createElement("a");
    link.href = fileBase64;
    link.download = fileName || "downloaded-file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFile = () => {
    setFileBase64("");
    setFileName("");
    setFileSize("");
    setFileType("");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full h-full flex flex-col">
        {/* Unified Header & Switcher Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/20 pb-3 mb-3 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-foreground">
              {activeTab === "text" ? "Base64 Encoder / Decoder" : "File/Image to Base64"}
            </h1>
            <p className="text-[11px] text-muted-foreground/80 leading-normal line-clamp-1" title={activeTab === "text" ? "Encode text to Base64 format or decode Base64 back to human-readable text." : "Convert any file or image into a Base64 Data URL."}>
              {activeTab === "text"
                ? "Encode text to Base64 format or decode Base64 back to human-readable text. Emojis and special characters are fully supported."
                : "Convert any file or image into a Base64 Data URL, ready to embed in HTML, CSS, or JSON."}
            </p>
          </div>
          <TabsList className="h-7 p-0.5 bg-muted/20 border border-border/40 shrink-0">
            <TabsTrigger value="text" className="h-full px-3 text-[10px] py-0.5 data-[state=active]:bg-background">Text Mode</TabsTrigger>
            <TabsTrigger value="file" className="h-full px-3 text-[10px] py-0.5 data-[state=active]:bg-background">File Mode</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="text" className="border-none p-0 h-full">
            <ToolLayout
              inputValue={inputText}
              onInputChange={setInputText}
              inputLabel={mode === "encode" ? "Raw Text" : "Base64 Encoded Text"}
              inputPlaceholder={
                mode === "encode"
                  ? "Enter your plain text here..."
                  : "Enter your Base64 encoded string here..."
              }
              outputValue={outputText}
              outputLabel={mode === "encode" ? "Base64 Encoded Text" : "Decoded Text"}
              outputPlaceholder={
                mode === "encode"
                  ? "Base64 string will appear here..."
                  : "Decoded text will appear here..."
              }
              error={errorText}
              onSwap={handleSwap}
              swapLabel={mode === "encode" ? "Switch to Decode" : "Switch to Encode"}
              controls={
                <div className="flex items-center gap-4 flex-wrap">
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
            />
          </TabsContent>

          <TabsContent value="file" className="border-none p-0 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch h-full overflow-hidden">
              {/* Left Upload Panel */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                <span className="text-xs font-bold text-foreground/85">Upload File</span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer p-4 ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className={`h-8 w-8 mb-2 transition-transform duration-300 ${isDragActive ? "scale-110 text-primary" : "text-muted-foreground/80"}`} />
                  <p className="text-xs font-semibold text-center text-foreground/90">
                    Drag & drop file here, or <span className="text-primary hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/75 mt-1 text-center">
                    Supports any image, PDF, font, or document file
                  </p>
                </div>
                {fileName && (
                  <div className="mt-2 p-2 rounded-lg border border-border/40 bg-card flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {fileType.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-sky-500 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate text-foreground">{fileName}</span>
                        <span className="text-[10px] text-muted-foreground">{fileSize} • {fileType || "unknown type"}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFile} className="h-7 px-2 text-xs text-destructive hover:bg-destructive/5">
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Output Panel */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-foreground/85">Base64 Output</span>
                  {fileBase64 && <CopyButton value={fileBase64} label="Copy" />}
                </div>
                <div className="relative flex-1 flex flex-col min-h-[250px]">
                  {fileBase64 ? (
                    <div className="flex-1 flex flex-col gap-3 min-h-0">
                      <textarea
                        readOnly
                        value={fileBase64}
                        className="flex-1 w-full p-3 rounded-xl border border-border/40 bg-muted/30 font-mono text-xs leading-relaxed resize-none focus:outline-none overflow-y-auto"
                      />
                      
                      {fileType.startsWith("image/") && (
                        <div className="p-3 border border-border/30 rounded-xl bg-background/50 flex flex-col items-center gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-muted-foreground self-start">Image Preview:</span>
                          <div className="max-h-[150px] max-w-full overflow-hidden rounded-lg border border-border/10 shadow-sm flex items-center justify-center p-1 bg-card">
                            <img
                              src={fileBase64}
                              alt="Base64 Preview"
                              className="max-h-[140px] max-w-full object-contain"
                            />
                          </div>
                        </div>
                      )}

                      <Button onClick={triggerDownload} className="w-full h-8 text-xs shrink-0">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download Original File
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/10 rounded-xl text-center text-muted-foreground font-mono text-xs p-6">
                      Upload a file on the left to see the Base64 representation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
