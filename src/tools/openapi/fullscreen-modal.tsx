import React from "react";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FullscreenModalProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel?: string;
  showTrigger?: boolean;
  onTrigger?: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
};

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  title,
  open,
  onOpenChange,
  triggerLabel = "Expand",
  showTrigger = true,
  onTrigger,
  children,
  headerAction,
}) => (
  <>
    {showTrigger ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px]"
        type="button"
        onClick={() => {
          onTrigger?.();
          onOpenChange(true);
        }}
      >
        <Maximize2 className="h-3 w-3 mr-1" />
        {triggerLabel}
      </Button>
    ) : null}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3 space-y-0">
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden p-4">{children}</div>
      </DialogContent>
    </Dialog>
  </>
);
