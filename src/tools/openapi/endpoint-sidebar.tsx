import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateOperation, getTagOrder, removeOperation, reorderOperation, getOperationOrder, sharedPathPrefix, displayPath } from "./openapi-model";
import type { HttpMethod, OpenAPIDoc, OperationRef } from "./openapi-types";

const METHOD_COLOR: Record<string, string> = {
  get: "text-[#f59e0b]",
  post: "text-[#22c55e]",
  put: "text-[#3b82f6]",
  patch: "text-[#a855f7]",
  delete: "text-[#ef4444]",
  options: "text-muted-foreground",
  head: "text-muted-foreground",
  trace: "text-muted-foreground",
};

const MethodLabel: React.FC<{ method: string }> = ({ method }) => (
  <span
    className={`inline-flex w-[3.6rem] shrink-0 justify-end text-[11px] font-extrabold uppercase tracking-wide tabular-nums ${METHOD_COLOR[method] || METHOD_COLOR.options}`}
  >
    {method}
  </span>
);

type EndpointSidebarProps = {
  spec: OpenAPIDoc;
  operations: OperationRef[];
  filtered: OperationRef[];
  selected: { path: string; method: HttpMethod } | null;
  onSelect: (item: { path: string; method: HttpMethod } | null) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
};

export const EndpointSidebar: React.FC<EndpointSidebarProps> = ({
  spec,
  operations,
  filtered,
  selected,
  onSelect,
  onSpecChange,
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

  const grouped = useMemo(() => {
    const order = getOperationOrder(spec);
    const rank = new Map(order.map((id, index) => [id, index]));
    const map = new Map<string, OperationRef[]>();
    for (const op of filtered) {
      const tag = op.tags[0] || "untagged";
      const list = map.get(tag) ?? [];
      list.push(op);
      map.set(tag, list);
    }
    for (const [tag, ops] of map) {
      map.set(
        tag,
        [...ops].sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999)),
      );
    }
    const tags = getTagOrder(spec, [...map.keys()]);
    return tags.map((tag) => [tag, map.get(tag) ?? []] as const);
  }, [filtered, spec]);

  const pathPrefix = useMemo(
    () => sharedPathPrefix(operations.map((op) => op.path)),
    [operations],
  );

  const toggleTag = (tag: string) => {
    setCollapsed((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  const handleDrop = (targetId: string, position: "before" | "after") => {
    if (!dragId || dragId === targetId) return;
    onSpecChange(reorderOperation(spec, dragId, targetId, position));
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <>
      {pathPrefix ? (
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          Base <span className="font-mono font-semibold text-foreground/80">{pathPrefix}</span>
        </div>
      ) : null}
      {grouped.map(([tag, ops]) => {
        const isCollapsed = collapsed[tag];
        return (
          <div key={tag} className="py-1">
            <button
              type="button"
              onClick={() => toggleTag(tag)}
              className="flex w-full items-center gap-1 px-3 py-1 text-left hover:bg-muted/40"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tag}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{ops.length}</span>
            </button>
            {!isCollapsed
              ? ops.map((op) => {
                  const active = selected?.path === op.path && selected?.method === op.method;
                  const isDropBefore = dropTarget?.id === op.id && dropTarget.position === "before";
                  const isDropAfter = dropTarget?.id === op.id && dropTarget.position === "after";
                  return (
                    <div key={op.id}>
                      {isDropBefore ? <div className="mx-2 h-0.5 rounded-full bg-primary" /> : null}
                      <div
                        draggable
                        onDragStart={(e) => {
                          setDragId(op.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", op.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                          setDropTarget({ id: op.id, position });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                          handleDrop(op.id, position);
                        }}
                        className={`group flex items-center gap-1 px-1.5 py-1 ${
                          active ? "bg-muted" : "hover:bg-muted/40"
                        } ${dragId === op.id ? "opacity-50" : ""}`}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing" />
                        <button
                          type="button"
                          onClick={() => onSelect({ path: op.path, method: op.method })}
                          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
                        >
                          <MethodLabel method={op.method} />
                          <span
                            className={`truncate font-mono text-[11px] ${active ? "font-semibold" : "text-foreground/80"}`}
                            title={op.path}
                          >
                            {displayPath(op.path, pathPrefix)}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          type="button"
                          title="Duplicate"
                          onClick={() => {
                            const duplicated = duplicateOperation(spec, op.path, op.method);
                            onSpecChange(duplicated.spec);
                            onSelect({ path: duplicated.path, method: duplicated.method });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          type="button"
                          title="Delete"
                          onClick={() => {
                            const next = removeOperation(spec, op.path, op.method);
                            onSpecChange(next);
                            if (active) onSelect(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {isDropAfter ? <div className="mx-2 h-0.5 rounded-full bg-primary" /> : null}
                    </div>
                  );
                })
              : null}
          </div>
        );
      })}
      {operations.length === 0 ? (
        <div className="px-4 py-4 text-center text-xs text-muted-foreground">No endpoints match your filter.</div>
      ) : null}
    </>
  );
};
