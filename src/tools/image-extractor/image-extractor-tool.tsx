import React, { useState, useEffect } from "react";
import { Image as ImageIcon, ClipboardPaste, Download, Trash2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ImageExtractorTool: React.FC = () => {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ width: number; height: number; size: number; type: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please paste or drop an image file.");
      return;
    }
    
    // Revoke old URL
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    
    const newUrl = URL.createObjectURL(file);
    setImageUrl(newUrl);
    setImageBlob(file);
    
    // Extract dimensions
    const img = new Image();
    img.onload = () => {
      setMetadata({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type
      });
    };
    img.src = newUrl;
  };

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [imageUrl]);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageBlob(null);
    setMetadata(null);
  };

  const handleDownload = () => {
    if (!imageUrl || !imageBlob) return;
    
    // Try to guess a good extension
    const ext = imageBlob.type.split("/")[1] || "png";
    
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `extracted-image.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden animate-in fade-in duration-300">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-foreground leading-tight">Clipboard Image Extractor</h1>
            <p className="text-[11px] text-muted-foreground/80 leading-tight">Paste, view, and download images instantly</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {imageUrl && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <div 
        className="flex-1 min-h-0 relative bg-background p-4 flex flex-col items-center justify-center overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragActive && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed m-4 rounded-2xl flex items-center justify-center transition-all">
            <div className="flex flex-col items-center gap-4 bg-background/90 p-8 rounded-xl shadow-lg">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <FileImage className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Drop Image Here</h3>
              <p className="text-sm text-muted-foreground">Release to process the image file</p>
            </div>
          </div>
        )}

        {!imageUrl ? (
          <div className="flex flex-col items-center justify-center text-center max-w-sm">
            <div className="h-20 w-20 mb-6 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center shadow-sm">
              <ClipboardPaste className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2 tracking-tight">Paste an Image</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded-md text-xs font-mono border border-border/50 text-foreground">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded-md text-xs font-mono border border-border/50 text-foreground">V</kbd> to paste an image directly from your clipboard, or drag and drop a file anywhere on this screen.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-5xl h-full flex flex-col bg-background border border-border/50 rounded-xl overflow-hidden">
            
            {/* Image Viewer Area */}
            <div className="flex-1 min-h-0 relative p-4 bg-background/50 flex items-center justify-center overflow-auto pattern-checkerboard">
              <style dangerouslySetInnerHTML={{ __html: `
                .pattern-checkerboard {
                  background-image: linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03)), linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03));
                  background-size: 20px 20px;
                  background-position: 0 0, 10px 10px;
                }
                .dark .pattern-checkerboard {
                  background-image: linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03)), linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03));
                }
              `}} />
              <img 
                src={imageUrl} 
                alt="Pasted clipboard content" 
                className="max-w-full max-h-full object-contain rounded drop-shadow-md"
              />
            </div>

            {/* Bottom Actions & Metadata bar */}
            <div className="h-16 shrink-0 border-t border-border/50 bg-background px-5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Format</span>
                  <span className="text-xs font-mono text-foreground font-medium">{metadata?.type || "Unknown"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Dimensions</span>
                  <span className="text-xs font-mono text-foreground font-medium">{metadata?.width} × {metadata?.height} px</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">File Size</span>
                  <span className="text-xs font-mono text-foreground font-medium">{metadata ? formatSize(metadata.size) : "0 B"}</span>
                </div>
              </div>
              
              <Button onClick={handleDownload} className="h-9 gap-2 shadow-sm font-semibold">
                <Download className="h-4 w-4" /> Download Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
