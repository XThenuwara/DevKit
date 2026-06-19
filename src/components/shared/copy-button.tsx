import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label,
  className = "",
  variant = "outline",
  size = "sm",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      variant={variant}
      size={label ? "sm" : size}
      onClick={handleCopy}
      className={`relative transition-all duration-200 active:scale-95 ${className}`}
      disabled={!value}
      type="button"
    >
      {copied ? (
        <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
          <Check className="h-4 w-4 animate-in zoom-in duration-300" />
          {label ? "Copied!" : ""}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Copy className="h-4 w-4" />
          {label}
        </span>
      )}
    </Button>
  );
};
