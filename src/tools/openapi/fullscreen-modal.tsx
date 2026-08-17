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
      <DialogContent
        showCloseButton={false}
        className="fixed inset-3 top-3 left-3 flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none sm:max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl ring-1 ring-foreground/10"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-border bg-card px-4 py-3 space-y-0">
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/40 p-4">{children}</div>
      </DialogContent>
    </Dialog>
  </>
);
