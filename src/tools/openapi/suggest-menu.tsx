import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export type SuggestItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

type SuggestMenuProps = {
  open: boolean;
  anchor: HTMLElement | null;
  items: SuggestItem[];
  onSelect: (id: string) => void;
  emptyLabel?: string;
};

export const SuggestMenu: React.FC<SuggestMenuProps> = ({ open, anchor, items, onSelect, emptyLabel }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchor]);

  if (!open || !anchor) return null;

  return createPortal(
    <div
      className="fixed z-[80] max-h-64 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-xl ring-1 ring-foreground/10"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">{emptyLabel ?? "No matches in this spec"}</p>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-muted"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item.id);
            }}
          >
            {item.badge ? (
              <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-xs font-semibold">{item.title}</span>
              {item.subtitle ? (
                <span className="block truncate text-[10px] text-muted-foreground">{item.subtitle}</span>
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>,
    document.body,
  );
};
