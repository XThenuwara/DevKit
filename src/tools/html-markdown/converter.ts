import TurndownService from "turndown";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
});

turndown.addRule("strikethrough", {
  filter: (node) =>
    node.nodeName === "DEL" || node.nodeName === "S" || node.nodeName === "STRIKE",
  replacement: (content) => `~~${content}~~`,
});

const isHeadingRow = (tr: HTMLTableRowElement) => {
  const parent = tr.parentElement;
  if (!parent) return false;
  if (parent.nodeName === "THEAD") return true;
  const table = tr.closest("table");
  if (table?.querySelector("thead tr")) return false;
  return table?.querySelector("tr") === tr;
};

const isNestedTable = (table: HTMLElement) => {
  let parent = table.parentElement;
  while (parent) {
    if (parent.nodeName === "TABLE") return true;
    parent = parent.parentElement;
  }
  return false;
};

const cellMarkdown = (content: string, node: HTMLElement) => {
  const index = Array.from(node.parentElement?.children ?? []).indexOf(node);
  const prefix = index === 0 ? "| " : " ";
  return `${prefix}${content.replace(/\n/g, " ").replace(/\|/g, "\\|")} |`;
};

turndown.addRule("tableCell", {
  filter: ["th", "td"],
  replacement: (content, node) => cellMarkdown(content, node as HTMLElement),
});

turndown.addRule("tableRow", {
  filter: "tr",
  replacement: (content, node) => {
    const row = node as HTMLTableRowElement;
    const alignMap: Record<string, string> = { left: ":---", right: "---:", center: ":---:" };
    let borderCells = "";
    if (isHeadingRow(row)) {
      borderCells = Array.from(row.children)
        .map((child) => {
          const align = (child.getAttribute("align") || "").toLowerCase();
          return cellMarkdown(alignMap[align] ?? "---", child as HTMLElement);
        })
        .join("");
    }
    return `\n${content}${borderCells ? `\n${borderCells}` : ""}`;
  },
});

turndown.addRule("tableSection", {
  filter: ["thead", "tbody", "tfoot"],
  replacement: (content) => content,
});

turndown.addRule("table", {
  filter: (node) => node.nodeName === "TABLE" && !isNestedTable(node),
  replacement: (content) => `\n\n${content.replace(/\n\n/g, "\n").trim()}\n\n`,
});

export type ConvertDirection = "html-to-md" | "md-to-html";

export const convertHtmlToMarkdown = (html: string): string => {
  const trimmed = html.trim();
  if (!trimmed) return "";
  return turndown.turndown(trimmed).trim();
};

export const convertMarkdownToHtml = (markdown: string): string => {
  const trimmed = markdown.trim();
  if (!trimmed) return "";
  return (marked.parse(trimmed, { async: false }) as string).trim();
};

export const toPreviewHtml = (value: string, kind: "html" | "markdown"): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (kind === "html") return trimmed;
  return convertMarkdownToHtml(trimmed);
};

export const convert = (input: string, direction: ConvertDirection): string => {
  if (direction === "html-to-md") return convertHtmlToMarkdown(input);
  return convertMarkdownToHtml(input);
};
