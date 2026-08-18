import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, File, Key, RefreshCw } from "lucide-react";
import CryptoJS from "crypto-js";

export const HashTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");

  // Text Hashing state
  const [inputText, setInputText] = useState("");
  const [useHmac, setUseHmac] = useState(false);
  const [hmacKey, setHmacKey] = useState("");

  const [md5Hash, setMd5Hash] = useState("");
  const [sha1Hash, setSha1Hash] = useState("");
  const [sha256Hash, setSha256Hash] = useState("");
  const [sha512Hash, setSha512Hash] = useState("");

  // File Hashing state
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileHashes, setFileHashes] = useState<{
    md5: string;
    sha1: string;
    sha256: string;
    sha512: string;
  } | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  // Text hashing logic
  useEffect(() => {
    if (activeTab === "text") {
      if (!inputText) {
        setMd5Hash("");
        setSha1Hash("");
        setSha256Hash("");
        setSha512Hash("");
        return;
      }

      if (useHmac) {
        setMd5Hash(CryptoJS.HmacMD5(inputText, hmacKey).toString());
        setSha1Hash(CryptoJS.HmacSHA1(inputText, hmacKey).toString());
        setSha256Hash(CryptoJS.HmacSHA256(inputText, hmacKey).toString());
        setSha512Hash(CryptoJS.HmacSHA512(inputText, hmacKey).toString());
      } else {
        setMd5Hash(CryptoJS.MD5(inputText).toString());
        setSha1Hash(CryptoJS.SHA1(inputText).toString());
        setSha256Hash(CryptoJS.SHA256(inputText).toString());
        setSha512Hash(CryptoJS.SHA512(inputText).toString());
      }
    }
  }, [inputText, useHmac, hmacKey, activeTab]);

  // File Hashing Logic
  const processFile = (file: File) => {
    setFileName(file.name);
    
    const kb = file.size / 1024;
    setFileSize(kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`);
    setIsHashing(true);
    setFileHashes(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        try {
          const arrayBuffer = e.target.result as ArrayBuffer;
          
          // Convert ArrayBuffer to WordArray for CryptoJS
          const wa = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer) as any);
          
          setFileHashes({
            md5: CryptoJS.MD5(wa).toString(),
            sha1: CryptoJS.SHA1(wa).toString(),
            sha256: CryptoJS.SHA256(wa).toString(),
            sha512: CryptoJS.SHA512(wa).toString(),
          });
        } catch (err) {
          console.error(err);
        } finally {
          setIsHashing(false);
        }
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    setInputText("");
  };

  const clearFile = () => {
    setFileName("");
    setFileSize("");
    setFileHashes(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full h-full flex flex-col">
        {/* Unified Header & Switcher Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/20 pb-3 mb-3 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-foreground">
              {activeTab === "text" ? "Hash Generator" : "File Hash Generator"}
            </h1>
            <p className="text-[11px] text-muted-foreground/80 leading-normal line-clamp-1" title={activeTab === "text" ? "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes instantly from your text. Supports custom HMAC secret keys." : "Calculate hashes (checksums) for local files directly in your browser. Large files are supported safely without upload."}>
              {activeTab === "text"
                ? "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes instantly from your text. Supports custom HMAC secret keys."
                : "Calculate hashes (checksums) for local files directly in your browser. Processed purely client-side."}
            </p>
          </div>
          <TabsList className="h-7 p-0.5 bg-muted/20 border border-border/40 shrink-0">
            <TabsTrigger value="text" className="h-full px-3 text-[10px] py-0.5 data-[state=active]:bg-background">Text Hash</TabsTrigger>
            <TabsTrigger value="file" className="h-full px-3 text-[10px] py-0.5 data-[state=active]:bg-background">File Hash</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          {/* Text Hash Content */}
          <TabsContent value="text" className="border-none p-0 h-full flex flex-col gap-4">
            {/* Configuration controls */}
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 text-xs flex flex-col md:flex-row md:items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <Switch id="hmac-toggle" checked={useHmac} onCheckedChange={setUseHmac} />
                <label htmlFor="hmac-toggle" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  HMAC Mode
                </label>
              </div>

              {useHmac && (
                <div className="flex-1 flex gap-2 items-center max-w-md animate-in slide-in-from-left-2 duration-300">
                  <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                  <Input
                    value={hmacKey}
                    onChange={(e) => setHmacKey(e.target.value)}
                    placeholder="Enter secret HMAC key..."
                    className="font-mono text-xs h-7 bg-background/50 py-0 text-foreground"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
              {/* Input column */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-foreground/85">Input Text</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePaste}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Paste
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      disabled={!inputText}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type or paste your text to generate hashes in real time..."
                  className="flex-1 w-full min-h-0 p-3 rounded-xl border border-border bg-background hover:bg-background/80 focus:bg-background focus:border-ring/50 focus:ring-1 focus:ring-ring/30 focus:outline-none transition-all resize-none font-mono text-xs leading-relaxed overflow-y-auto"
                />
              </div>

              {/* Hashes output column */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden text-left">
                <span className="text-xs font-bold text-foreground/85">Hashed Output</span>
                
                <div className="flex-1 min-h-0 flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-3 overflow-y-auto">
                  {/* MD5 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground font-mono">{useHmac ? "HMAC-MD5" : "MD5"} (128-bit)</span>
                      <CopyButton value={md5Hash} />
                    </div>
                    <input
                      readOnly
                      value={md5Hash}
                      placeholder="Hash value will appear here..."
                      className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                    />
                  </div>

                  {/* SHA-1 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground font-mono">{useHmac ? "HMAC-SHA1" : "SHA-1"} (160-bit)</span>
                      <CopyButton value={sha1Hash} />
                    </div>
                    <input
                      readOnly
                      value={sha1Hash}
                      placeholder="Hash value will appear here..."
                      className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                    />
                  </div>

                  {/* SHA-256 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground font-mono">{useHmac ? "HMAC-SHA256" : "SHA-256"} (256-bit)</span>
                      <CopyButton value={sha256Hash} />
                    </div>
                    <input
                      readOnly
                      value={sha256Hash}
                      placeholder="Hash value will appear here..."
                      className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                    />
                  </div>

                  {/* SHA-512 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground font-mono">{useHmac ? "HMAC-SHA512" : "SHA-512"} (512-bit)</span>
                      <CopyButton value={sha512Hash} />
                    </div>
                    <input
                      readOnly
                      value={sha512Hash}
                      placeholder="Hash value will appear here..."
                      className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* File Hash Content */}
          <TabsContent value="file" className="border-none p-0 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch h-full overflow-hidden">
              {/* Upload Area */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                <span className="text-xs font-bold text-foreground/85">Upload File</span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
                  }`}
                  onClick={() => document.getElementById("file-hash-input")?.click()}
                >
                  <input
                    id="file-hash-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className={`h-8 w-8 mb-2 transition-transform duration-300 ${isDragActive ? "scale-110 text-primary" : "text-muted-foreground/80"}`} />
                  <p className="text-xs font-semibold text-center text-foreground/90">
                    Drag & drop file here, or <span className="text-primary hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/75 mt-1 text-center">
                    Your files never leave your device (processed client-side)
                  </p>
                </div>

                {fileName && (
                  <div className="mt-2 p-2 rounded-lg border border-border/50 bg-background/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 text-sky-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate text-foreground">{fileName}</span>
                        <span className="text-[10px] text-muted-foreground">{fileSize}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFile} className="h-7 px-2 text-xs text-destructive hover:bg-destructive/5">
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Output hashes for File */}
              <div className="flex flex-col gap-1.5 h-full overflow-hidden text-left">
                <span className="text-xs font-bold text-foreground/85">Checksum Hashes</span>
                <div className="flex-1 min-h-0 flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-3 overflow-y-auto">
                  {isHashing ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground/80 h-full">
                      <RefreshCw className="h-8 w-8 mb-2 animate-spin text-primary" />
                      <p className="text-xs font-semibold">Computing checksums...</p>
                    </div>
                  ) : fileHashes ? (
                    <div className="flex flex-col gap-3 h-full justify-start">
                      {/* MD5 */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-muted-foreground font-mono">MD5 Checksum</span>
                          <CopyButton value={fileHashes.md5} />
                        </div>
                        <input
                          readOnly
                          value={fileHashes.md5}
                          className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                        />
                      </div>

                      {/* SHA-1 */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-muted-foreground font-mono">SHA-1 Checksum</span>
                          <CopyButton value={fileHashes.sha1} />
                        </div>
                        <input
                          readOnly
                          value={fileHashes.sha1}
                          className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                        />
                      </div>

                      {/* SHA-256 */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-muted-foreground font-mono">SHA-256 Checksum</span>
                          <CopyButton value={fileHashes.sha256} />
                        </div>
                        <input
                          readOnly
                          value={fileHashes.sha256}
                          className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                        />
                      </div>

                      {/* SHA-512 */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-muted-foreground font-mono">SHA-512 Checksum</span>
                          <CopyButton value={fileHashes.sha512} />
                        </div>
                        <input
                          readOnly
                          value={fileHashes.sha512}
                          className="w-full font-mono text-xs p-2 rounded-lg border border-border/50 bg-background focus:outline-none select-all h-8"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground/80 h-full">
                      <File className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs">No hashes generated yet</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">Upload a file on the left to calculate checksums</p>
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
