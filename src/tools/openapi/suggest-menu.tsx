import React from "react";

export type SuggestItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

type SuggestMenuProps = {
  open: boolean;
  items: SuggestItem[];
  onSelect: (id: string) => void;
  emptyLabel?: string;
};

export const SuggestMenu: React.FC<SuggestMenuProps> = ({ open, items, onSelect, emptyLabel }) => {
  if (!open) return null;
  return (
    <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-52 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg ring-1 ring-foreground/10">
      {items.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">{emptyLabel ?? "No matches"}</p>
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
    </div>
  );
};
