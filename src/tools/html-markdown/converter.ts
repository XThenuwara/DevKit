import TurndownService from "turndown";
import { marked } from "marked";

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

export type ConvertDirection = "html-to-md" | "md-to-html";

export const convertHtmlToMarkdown = (html: string): string => {
  const trimmed = html.trim();
  if (!trimmed) return "";
  return turndown.turndown(trimmed);
};

export const convertMarkdownToHtml = (markdown: string): string => {
  const trimmed = markdown.trim();
  if (!trimmed) return "";
  return marked.parse(trimmed, { async: false }) as string;
};

export const convert = (input: string, direction: ConvertDirection): string => {
  if (direction === "html-to-md") return convertHtmlToMarkdown(input);
  return convertMarkdownToHtml(input);
};
