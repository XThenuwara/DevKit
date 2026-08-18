import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/shared/copy-button";
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Workflow, 
  ClipboardPaste,
  Search,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

interface PipelineStep {
  id: string;
  type: string;
  config: Record<string, any>;
  isActive: boolean;
}

interface Template {
  name: string;
  description: string;
  steps: Omit<PipelineStep, "id" | "isActive">[];
  sampleInput?: string;
}

const STEP_CATEGORIES = [
  { id: "clean_format", name: "Text & Casing", colorClass: "border-l-2 border-l-blue-500/80 dark:border-l-blue-500/70" },
  { id: "find_filter", name: "Find & Filter", colorClass: "border-l-2 border-l-amber-500/80 dark:border-l-amber-500/70" },
  { id: "struct_table", name: "Columns & Tables", colorClass: "border-l-2 border-l-emerald-500/80 dark:border-l-emerald-500/70" }
];

const STEP_TYPES = [
  // Text & Casing (blue)
  { type: "trim_clean", category: "clean_format", name: "Trim & Clean", desc: "Strip whitespace, remove empty or duplicate lines." },
  { type: "case_conv", category: "clean_format", name: "Case Conversion", desc: "Convert letters to UPPERCASE, camelCase, snake_case, etc." },
  { type: "prepend_append", category: "clean_format", name: "Prepend & Append", desc: "Add prefix/suffix text to lines or the entire text." },

  // Find & Filter (amber)
  { type: "find_replace", category: "find_filter", name: "Find & Replace", desc: "Find strings or regex patterns and replace them." },
  { type: "filter_rows", category: "find_filter", name: "Filter Rows", desc: "Keep or exclude lines containing a match or regex pattern." },

  // Columns & Tables (emerald)
  { type: "column_extract", category: "struct_table", name: "Extract Column", desc: "Parse CSV/TSV columns by index and output them." },
  { type: "split_join", category: "struct_table", name: "Split & Join", desc: "Split text by delimiter and join it back with another." },
  { type: "markdown_table", category: "struct_table", name: "Markdown Table", desc: "Convert CSV/TSV data to Markdown table formatting or vice-versa." },
];

const TEMPLATES: Record<string, Template> = {
  csv_to_md: {
    name: "CSV to Markdown Table",
    description: "Format comma-separated text into a readable markdown table",
    sampleInput: "Name,Role,Status\nJohn Doe,Frontend Developer,Active\nJane Smith,Product Manager,Pending\nBob Johnson,Backend Engineer,Active",
    steps: [
      { type: "markdown_table", config: { mode: "csv_to_md", delim: "," } }
    ]
  },
  extract_md_col: {
    name: "Extract Column from Markdown Table",
    description: "Parse a markdown table and extract the first column values",
    sampleInput: "| Product | Price | Stock |\n|---|---|---|\n| Apple iPhone | $999 | In Stock |\n| Samsung Galaxy | $899 | Out of Stock |\n| Google Pixel | $799 | Low Stock |",
    steps: [
      { type: "markdown_table", config: { mode: "md_to_csv", delim: "," } },
      { type: "column_extract", config: { delim: ",", indices: "0" } },
      { type: "trim_clean", config: { trimLines: true, removeEmpty: true, removeDuplicates: false } }
    ]
  },
  sql_in_clause: {
    name: "SQL 'IN' Clause Formatter",
    description: "Turn lines of inputs into quoted, comma-separated values for database queries",
    sampleInput: "user_id_10928\nuser_id_38291\nuser_id_88291\nuser_id_10928\n\nuser_id_44921",
    steps: [
      { type: "trim_clean", config: { trimLines: true, removeEmpty: true, removeDuplicates: true } },
      { type: "prepend_append", config: { prepend: "'", append: "'", perLine: true } },
      { type: "split_join", config: { splitDelim: "\\n", joinDelim: ", " } }
    ]
  },
  list_to_json: {
    name: "List to JSON Array",
    description: "Convert line-separated text values into a formatted JSON array",
    sampleInput: "Frontend Developer\nBackend Engineer\nProduct Manager\nUX Designer",
    steps: [
      { type: "trim_clean", config: { trimLines: true, removeEmpty: true, removeDuplicates: false } },
      { type: "prepend_append", config: { prepend: "\"", append: "\"", perLine: true } },
      { type: "split_join", config: { splitDelim: "\\n", joinDelim: ", " } },
      { type: "prepend_append", config: { prepend: "[", append: "]", perLine: false } }
    ]
  },
  query_to_json: {
    name: "URL Query to JSON",
    description: "Parse key-value URL parameter strings into a formatted JSON object",
    sampleInput: "?search=javascript&page=2&sort=desc&filter=active",
    steps: [
      { type: "find_replace", config: { find: "^\\?", replace: "", regex: true, caseInsensitive: false, global: false } },
      { type: "split_join", config: { splitDelim: "&", joinDelim: "\\n" } },
      { type: "find_replace", config: { find: "^([^=]+)=(.*)$", replace: "  \"$1\": \"$2\",", regex: true, caseInsensitive: false, global: true } },
      { type: "prepend_append", config: { prepend: "{\\n", append: "\\n}", perLine: false } },
      { type: "find_replace", config: { find: ",\\n}", replace: "\\n}", regex: true, caseInsensitive: false, global: true } }
    ]
  },
  strip_md: {
    name: "Strip Markdown Formatting",
    description: "Remove headers, bullets, bold marks, and code ticks to get raw text",
    sampleInput: "# Getting Started\n\nHere are some **key rules**:\n- Keep the code `simple` and readable.\n- Avoid complex abstractions.\n\nEnjoy coding!",
    steps: [
      { type: "find_replace", config: { find: "^#+\\s+", replace: "", regex: true, caseInsensitive: false, global: true } },
      { type: "find_replace", config: { find: "^[*+-]\\s+", replace: "", regex: true, caseInsensitive: false, global: true } },
      { type: "find_replace", config: { find: "\\*\\*([^*]+)\\*\\*", replace: "$1", regex: true, caseInsensitive: false, global: true } },
      { type: "find_replace", config: { find: "`([^`]+)`", replace: "$1", regex: true, caseInsensitive: false, global: true } },
      { type: "trim_clean", config: { trimLines: true, removeEmpty: false, removeDuplicates: false } }
    ]
  }
};

// Casing Helpers
const toCamel = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^([A-Z])/, (_, chr) => chr.toLowerCase());

const toTitle = (str: string) =>
  str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const toSnake = (str: string) =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map((x) => x.toLowerCase())
    .join("_") || str;

const toKebab = (str: string) =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map((x) => x.toLowerCase())
    .join("-") || str;

const unescapeDelim = (val: string): string => {
  return val.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
};

export function TextPipelineTool() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: "init-1",
      type: "trim_clean",
      config: { trimLines: true, removeEmpty: true, removeDuplicates: false },
      isActive: true
    }
  ]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAvailableSteps, setShowAvailableSteps] = useState(true);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [stepOutputs, setStepOutputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = (key: string) => {
    const template = TEMPLATES[key];
    if (!template) return;
    const formattedSteps = template.steps.map((s) => ({
      ...s,
      id: Math.random().toString(36).substring(2, 9),
      isActive: true
    }));
    setSteps(formattedSteps);
    if (template.sampleInput !== undefined) {
      setInputText(template.sampleInput);
    }
    setIsTemplateModalOpen(false); // Close modal on load
  };

  const getStepInput = (stepId: string): string => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex <= 0) return inputText;
    // Find the last active step before this one
    for (let i = stepIndex - 1; i >= 0; i--) {
      if (steps[i].isActive) {
        return stepOutputs[steps[i].id] || "";
      }
    }
    return inputText;
  };

  const getStepHeaders = (step: PipelineStep) => {
    const delimVal = unescapeDelim(step.config.delim || ",");
    const stepInput = getStepInput(step.id);
    const firstLine = stepInput.split("\n").find((l) => l.trim() !== "");
    if (!firstLine) return [];

    const cells = firstLine.split(delimVal);
    return cells
      .map((cell, idx) => {
        const name = cell.trim();
        if (delimVal === "|" && (idx === 0 || idx === cells.length - 1) && name === "") {
          return null; // Skip outer empty cells in markdown tables
        }
        return {
          name: name || `Column ${idx}`,
          index: idx,
        };
      })
      .filter((item): item is { name: string; index: number } => item !== null);
  };

  const getSuggestedTemplates = (text: string): [string, Template][] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const suggestions: [string, Template][] = [];
    const addSuggestion = (key: string) => {
      if (TEMPLATES[key] && !suggestions.some(([k]) => k === key)) {
        suggestions.push([key, TEMPLATES[key]]);
      }
    };

    // 1. URL Query / URL
    if (
      trimmed.startsWith("?") ||
      (trimmed.includes("&") && trimmed.includes("=")) ||
      /^https?:\/\/[^\s]+?\?.+/.test(trimmed)
    ) {
      addSuggestion("query_to_json");
    }

    // 2. Markdown Table
    const isMdTable =
      lines.length >= 2 &&
      lines.some((line) => line.startsWith("|") && line.endsWith("|")) &&
      lines.some((line) => /^\|(?:\s*:?-+:?\s*\|)+$/.test(line));

    if (isMdTable) {
      addSuggestion("extract_md_col");
      addSuggestion("strip_md");
    }

    // 3. CSV / TSV
    const checkDelimiter = (delim: string) => {
      if (lines.length < 2) return false;
      const firstCols = lines[0].split(delim).length;
      if (firstCols < 2) return false;
      const matches = lines.slice(1, 4).every((l) => l.split(delim).length === firstCols);
      return matches;
    };

    const isCSV = checkDelimiter(",");
    const isTSV = checkDelimiter("\t");

    if ((isCSV || isTSV) && !isMdTable) {
      addSuggestion("csv_to_md");
      addSuggestion("list_to_json");
    }

    // 4. General Markdown
    const hasMarkdown = lines.some(
      (l) =>
        l.startsWith("#") ||
        l.startsWith("- ") ||
        l.startsWith("* ") ||
        /\*\*.*?\*\*/.test(l) ||
        /`.*?`/.test(l)
    );
    if (hasMarkdown && !isMdTable) {
      addSuggestion("strip_md");
    }

    // 5. Line-separated list (general list)
    if (lines.length >= 2 && !isCSV && !isTSV && !isMdTable && !hasMarkdown) {
      addSuggestion("sql_in_clause");
      addSuggestion("list_to_json");
    }

    return suggestions;
  };

  const addStep = (stepType: string) => {
    let defaultConfig: Record<string, any> = {};
    if (stepType === "trim_clean") {
      defaultConfig = { trimLines: true, removeEmpty: true, removeDuplicates: false };
    } else if (stepType === "split_join") {
      defaultConfig = { splitDelim: "\\n", joinDelim: ", " };
    } else if (stepType === "find_replace") {
      defaultConfig = { find: "", replace: "", regex: false, caseInsensitive: false, global: true };
    } else if (stepType === "filter_rows") {
      defaultConfig = { condition: "contains", value: "" };
    } else if (stepType === "column_extract") {
      defaultConfig = { delim: ",", indices: "0" };
    } else if (stepType === "prepend_append") {
      defaultConfig = { prepend: "", append: "", perLine: true };
    } else if (stepType === "case_conv") {
      defaultConfig = { mode: "upper", perLine: true };
    } else if (stepType === "markdown_table") {
      defaultConfig = { mode: "csv_to_md", delim: "," };
    }

    setSteps([
      ...steps,
      {
        id: Math.random().toString(36).substring(2, 9),
        type: stepType,
        config: defaultConfig,
        isActive: true
      }
    ]);
  };

  const deleteStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const toggleStepActive = (id: string) => {
    setSteps(
      steps.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setSteps(newSteps);
  };

  const updateStepConfig = (id: string, key: string, value: any) => {
    setSteps(
      steps.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  };

  // Pipeline Engine Processor
  const executeStep = (text: string, step: PipelineStep): string => {
    const { type, config } = step;

    switch (type) {
      case "trim_clean": {
        const lines = text.split("\n");
        let result = lines.map((l) => (config.trimLines ? l.trim() : l));
        if (config.removeEmpty) {
          result = result.filter((l) => l !== "");
        }
        if (config.removeDuplicates) {
          result = Array.from(new Set(result));
        }
        return result.join("\n");
      }

      case "split_join": {
        const splitVal = unescapeDelim(config.splitDelim || "");
        const joinVal = unescapeDelim(config.joinDelim || "");
        if (!splitVal) return text;
        return text.split(splitVal).join(joinVal);
      }

      case "find_replace": {
        const { find, replace, regex, caseInsensitive, global } = config;
        if (find === "") return text;

        const replaceStr = unescapeDelim(replace || "");
        if (regex) {
          try {
            const flags = (global ? "g" : "") + (caseInsensitive ? "i" : "");
            const regExpr = new RegExp(find, flags);
            return text.replace(regExpr, replaceStr);
          } catch (e: any) {
            throw new Error(`Regex Error in replace step: ${e.message}`);
          }
        } else {
          if (global) {
            return text.replaceAll(find, replaceStr);
          } else {
            return text.replace(find, replaceStr);
          }
        }
      }

      case "filter_rows": {
        const { condition, value } = config;
        const lines = text.split("\n");

        const filtered = lines.filter((line) => {
          if (condition === "contains") {
            return line.includes(value);
          }
          if (condition === "not_contains") {
            return !line.includes(value);
          }
          if (condition === "regex") {
            try {
              return new RegExp(value, "i").test(line);
            } catch (e: any) {
              throw new Error(`Regex Error in filter: ${e.message}`);
            }
          }
          if (condition === "empty") {
            return line.trim() === "";
          }
          if (condition === "not_empty") {
            return line.trim() !== "";
          }
          return true;
        });

        return filtered.join("\n");
      }

      case "column_extract": {
        const delimVal = unescapeDelim(config.delim || ",");
        const indexList = (config.indices || "0")
          .split(",")
          .map((idxStr: string) => parseInt(idxStr.trim(), 10))
          .filter((n: number) => !isNaN(n));

        const lines = text.split("\n");
        const extracted = lines.map((line) => {
          if (line.trim() === "") return "";
          const cols = line.split(delimVal);
          return indexList
            .map((idx: number) => (cols[idx] !== undefined ? cols[idx].trim() : ""))
            .join(delimVal);
        });

        return extracted.join("\n");
      }

      case "prepend_append": {
        const prepStr = unescapeDelim(config.prepend || "");
        const appStr = unescapeDelim(config.append || "");

        if (config.perLine) {
          const lines = text.split("\n");
          return lines.map((l) => prepStr + l + appStr).join("\n");
        } else {
          return prepStr + text + appStr;
        }
      }

      case "case_conv": {
        const { mode, perLine } = config;

        const convert = (str: string) => {
          if (mode === "upper") return str.toUpperCase();
          if (mode === "lower") return str.toLowerCase();
          if (mode === "camel") return toCamel(str);
          if (mode === "title") return toTitle(str);
          if (mode === "snake") return toSnake(str);
          if (mode === "kebab") return toKebab(str);
          return str;
        };

        if (perLine) {
          const lines = text.split("\n");
          return lines.map(convert).join("\n");
        } else {
          return convert(text);
        }
      }

      case "markdown_table": {
        const { mode, delim } = config;
        const delimiter = unescapeDelim(delim || ",");

        if (mode === "csv_to_md") {
          const lines = text.split("\n").filter((l) => l.trim() !== "");
          if (lines.length === 0) return "";

          // Parse CSV
          const rows = lines.map((l) => l.split(delimiter));
          const colCount = Math.max(...rows.map((r) => r.length));

          // format headings
          const headerRow = `| ${rows[0]
            .map((cell) => cell.trim())
            .concat(Array(colCount - rows[0].length).fill(""))
            .join(" | ")} |`;
          const dividerRow = `| ${Array(colCount).fill("---").join(" | ")} |`;

          const dataRows = rows.slice(1).map((r) => {
            return `| ${r
              .map((cell) => cell.trim())
              .concat(Array(colCount - r.length).fill(""))
              .join(" | ")} |`;
          });

          return [headerRow, dividerRow, ...dataRows].join("\n");
        } else {
          // Markdown Table to CSV/TSV
          const lines = text.split("\n").filter((l) => l.trim() !== "");
          const cleanRows = lines
            .map((line) => {
              const trimmed = line.trim();
              if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
              // Split by | and strip edges
              const cells = trimmed
                .slice(1, -1)
                .split("|")
                .map((c) => c.trim());
              return cells;
            })
            .filter((row): row is string[] => row !== null);

          if (cleanRows.length === 0) return "";

          // Filter out header separator row e.g., |---|---|
          const rowsWithoutDivider = cleanRows.filter((row) => {
            return !row.every((cell) => /^:?-+:?$/.test(cell));
          });

          return rowsWithoutDivider.map((row) => row.join(delimiter)).join("\n");
        }
      }

      default:
        return text;
    }
  };

  useEffect(() => {
    try {
      setError(null);
      let tempText = inputText;
      const newOutputs: Record<string, string> = {};
      for (const step of steps) {
        if (step.isActive) {
          tempText = executeStep(tempText, step);
        }
        newOutputs[step.id] = tempText;
      }
      setStepOutputs(newOutputs);
      setOutputText(tempText);
    } catch (err: any) {
      setError(err.message);
    }
  }, [inputText, steps]);

  const handlePasteInput = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setInputText(clipText);
    } catch (err) {
      console.error("Failed to read clipboard text: ", err);
    }
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const selectedStepIndex = selectedStep ? steps.indexOf(selectedStep) + 1 : -1;
  const selectedStepName = selectedStep ? STEP_TYPES.find((st) => st.type === selectedStep.type)?.name : "";
  
  const displayedOutput = (selectedStepId && stepOutputs[selectedStepId] !== undefined)
    ? stepOutputs[selectedStepId]
    : outputText;

  const suggestedTemplates = getSuggestedTemplates(inputText);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden animate-in fade-in duration-300">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <Workflow className="h-4 w-4 text-primary shrink-0" />
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-foreground leading-tight">Text Pipeline</h1>
            <p className="text-[11px] text-muted-foreground/80 leading-tight">Chain transforms step by step</p>
          </div>
        </div>

        {/* Template Dialog */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/60">
              <Sparkles className="h-3 w-3 text-primary" />
              Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/40">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Pipeline Templates
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pick a template to load a pre-built pipeline.
              </DialogDescription>
            </DialogHeader>
            <div className="px-4 pt-3 pb-2 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="h-8 pl-8 text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-3 flex flex-col gap-1.5">
              {(() => {
                const filtered = Object.entries(TEMPLATES).filter(
                  ([_, t]) =>
                    t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                    t.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
                );
                if (filtered.length === 0)
                  return <p className="text-xs text-muted-foreground text-center py-6">No templates found</p>;
                return filtered.map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { loadTemplate(key); setTemplateSearchQuery(""); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-border/50 bg-background hover:bg-muted/60 hover:border-primary/30 transition-all group"
                  >
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                  </button>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT COLUMN — Pipeline Builder */}
        <div className="w-[37.5%] shrink-0 flex flex-col border-r border-border/50 overflow-hidden">

          {/* Pipeline builder */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

            {/* Builder toolbar */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-muted/20">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pipeline · {steps.length} step{steps.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowAvailableSteps(!showAvailableSteps)}
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                >
                  {showAvailableSteps ? <ChevronUp className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                  {showAvailableSteps ? "Hide" : "Add Step"}
                </Button>
                {steps.length > 0 && (
                  <Button variant="ghost" size="sm"
                    onClick={() => { setSteps([]); setSelectedStepId(null); }}
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Step cards list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col gap-2">
              {steps.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
                  <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">No steps yet</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Add a step below or load a template</p>
                  </div>
                </div>
              ) : (
                steps.map((step, index) => {
                  const info = STEP_TYPES.find((st) => st.type === step.type);
                  const isSelected = selectedStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedStepId(isSelected ? null : step.id)}
                      className={[
                        "rounded-xl border border-border/60 bg-card cursor-pointer select-none transition-all flex flex-col gap-2",
                        isSelected ? "border-primary/40 ring-1 ring-primary/20 shadow-sm" : "hover:border-border hover:shadow-xs",
                        !step.isActive && "opacity-60",
                      ].join(" ")}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
                        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            id={`${step.id}-active`}
                            checked={step.isActive}
                            onCheckedChange={() => toggleStepActive(step.id)}
                          />
                          <label htmlFor={`${step.id}-active`} className="flex items-center gap-2 cursor-pointer">
                            <span className="flex items-center justify-center h-5 w-5 rounded bg-muted/50 text-muted-foreground text-[10px] font-bold border border-border/40">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-foreground tracking-tight">{info?.name}</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground"
                            onClick={() => moveStep(index, "up")} disabled={index === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground"
                            onClick={() => moveStep(index, "down")} disabled={index === steps.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                            onClick={() => deleteStep(step.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Card config container */}
                      <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-[11px] flex flex-col gap-3 shadow-inner">

                        {step.type === "trim_clean" && (
                          <div className="flex flex-col gap-2">
                            {[
                              { key: "trimLines",        label: "Trim whitespace" },
                              { key: "removeEmpty",      label: "Remove empty lines" },
                              { key: "removeDuplicates", label: "Remove duplicates" },
                            ].map(({ key, label }) => (
                              <label key={key} htmlFor={`${step.id}-${key}`} className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors w-fit">
                                <Checkbox id={`${step.id}-${key}`} checked={step.config[key]}
                                  onCheckedChange={(c) => updateStepConfig(step.id, key, !!c)} />
                                <span className="select-none font-medium text-xs">{label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {step.type === "split_join" && (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: "splitDelim", label: "Split by", placeholder: "\\n" },
                              { key: "joinDelim",  label: "Join with", placeholder: ", " },
                            ].map(({ key, label, placeholder }) => (
                              <div key={key} className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                                <Input value={step.config[key]} placeholder={placeholder}
                                  onChange={(e) => updateStepConfig(step.id, key, e.target.value)}
                                  className="h-8 text-xs font-mono bg-background shadow-sm border-border/60" />
                              </div>
                            ))}
                          </div>
                        )}

                        {step.type === "find_replace" && (
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: "find",    label: "Find",         placeholder: "Search pattern..." },
                                { key: "replace", label: "Replace with", placeholder: "Replacement..." },
                              ].map(({ key, label, placeholder }) => (
                                <div key={key} className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                                  <Input value={step.config[key]} placeholder={placeholder}
                                    onChange={(e) => updateStepConfig(step.id, key, e.target.value)}
                                    className="h-8 text-xs font-mono bg-background shadow-sm border-border/60" />
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 border-t border-border/40">
                              {[
                                { key: "regex",           label: "Regex" },
                                { key: "global",          label: "Global" },
                                { key: "caseInsensitive", label: "Ignore case" },
                              ].map(({ key, label }) => (
                                <label key={key} htmlFor={`${step.id}-${key}`} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                  <Checkbox id={`${step.id}-${key}`} checked={step.config[key]}
                                    onCheckedChange={(c) => updateStepConfig(step.id, key, !!c)} />
                                  <span className="select-none font-medium text-xs">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.type === "filter_rows" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Condition</span>
                              <select value={step.config.condition}
                                onChange={(e) => updateStepConfig(step.id, "condition", e.target.value)}
                                className="h-8 bg-background border border-border/60 shadow-sm rounded-md px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring/40 cursor-pointer">
                                <option value="contains">Contains</option>
                                <option value="not_contains">Doesn't contain</option>
                                <option value="regex">Matches regex</option>
                                <option value="empty">Is empty</option>
                                <option value="not_empty">Is not empty</option>
                              </select>
                            </div>
                            {step.config.condition !== "empty" && step.config.condition !== "not_empty" && (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Value</span>
                                <Input value={step.config.value} placeholder="Keyword or pattern..."
                                  onChange={(e) => updateStepConfig(step.id, "value", e.target.value)}
                                  className="h-8 text-xs bg-background shadow-sm border-border/60" />
                              </div>
                            )}
                          </div>
                        )}

                        {step.type === "column_extract" && (() => {
                          const headers = getStepHeaders(step);
                          return (
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { key: "delim",   label: "Delimiter",      placeholder: "," },
                                  { key: "indices", label: "Column indices",  placeholder: "0 or 0,2" },
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key} className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                                    <Input value={step.config[key]} placeholder={placeholder}
                                      onChange={(e) => updateStepConfig(step.id, key, e.target.value)}
                                      className="h-8 text-xs font-mono bg-background shadow-sm border-border/60" />
                                  </div>
                                ))}
                              </div>
                              {headers.length > 0 && (
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Select Columns by Name</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {headers.map((h) => {
                                      const isSelected = step.config.indices
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .includes(h.index.toString());
                                      return (
                                        <button
                                          key={h.index}
                                          type="button"
                                          onClick={() => {
                                            const currentIndices = step.config.indices
                                              .split(",")
                                              .map((s: string) => s.trim())
                                              .filter((s: string) => s !== "");
                                            let newIndices: string[];
                                            if (isSelected) {
                                              newIndices = currentIndices.filter((idx: string) => idx !== h.index.toString());
                                            } else {
                                              newIndices = [...currentIndices, h.index.toString()];
                                            }
                                            newIndices = newIndices
                                              .map((x) => parseInt(x, 10))
                                              .filter((n) => !isNaN(n))
                                              .sort((a, b) => a - b)
                                              .map((n) => n.toString());
                                            updateStepConfig(step.id, "indices", newIndices.join(","));
                                          }}
                                          className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                                            isSelected
                                              ? "bg-stone-200 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-foreground font-medium"
                                              : "bg-muted border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                          }`}
                                        >
                                          {h.name} <span className="text-[9px] opacity-60 font-mono">({h.index})</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {step.type === "prepend_append" && (
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: "prepend", label: "Prepend", placeholder: "Prefix..." },
                                { key: "append",  label: "Append",  placeholder: "Suffix..." },
                              ].map(({ key, label, placeholder }) => (
                                <div key={key} className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                                  <Input value={step.config[key]} placeholder={placeholder}
                                    onChange={(e) => updateStepConfig(step.id, key, e.target.value)}
                                    className="h-8 text-xs font-mono bg-background shadow-sm border-border/60" />
                                </div>
                              ))}
                            </div>
                            <div className="pt-1 border-t border-border/40">
                              <label htmlFor={`${step.id}-perLine-pa`} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors w-fit">
                                <Checkbox id={`${step.id}-perLine-pa`} checked={step.config.perLine}
                                  onCheckedChange={(c) => updateStepConfig(step.id, "perLine", !!c)} />
                                <span className="select-none font-medium text-xs">Apply to each line individually</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {step.type === "case_conv" && (
                          <div className="grid grid-cols-2 gap-3 items-end">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Style</span>
                              <select value={step.config.mode}
                                onChange={(e) => updateStepConfig(step.id, "mode", e.target.value)}
                                className="h-8 bg-background border border-border/60 shadow-sm rounded-md px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring/40 cursor-pointer">
                                <option value="upper">UPPERCASE</option>
                                <option value="lower">lowercase</option>
                                <option value="camel">camelCase</option>
                                <option value="title">Title Case</option>
                                <option value="snake">snake_case</option>
                                <option value="kebab">kebab-case</option>
                              </select>
                            </div>
                            <div className="pb-1.5">
                              <label htmlFor={`${step.id}-perLine-cc`} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors w-fit">
                                <Checkbox id={`${step.id}-perLine-cc`} checked={step.config.perLine}
                                  onCheckedChange={(c) => updateStepConfig(step.id, "perLine", !!c)} />
                                <span className="select-none font-medium text-xs">Per line</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {step.type === "markdown_table" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mode</span>
                              <select value={step.config.mode}
                                onChange={(e) => updateStepConfig(step.id, "mode", e.target.value)}
                                className="h-8 bg-background border border-border/60 shadow-sm rounded-md px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring/40 cursor-pointer">
                                <option value="csv_to_md">CSV → Markdown</option>
                                <option value="md_to_csv">Markdown → CSV</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Delimiter</span>
                              <Input value={step.config.delim} placeholder=","
                                onChange={(e) => updateStepConfig(step.id, "delim", e.target.value)}
                                className="h-8 text-xs font-mono bg-background shadow-sm border-border/60" />
                            </div>
                          </div>
                        )}

                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Available Steps Drawer */}
            {showAvailableSteps && (
              <div className="shrink-0 border-t border-border/50 bg-muted/20 px-3 pt-2 pb-3">
                {/* Category filter pills */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-none">
                  {["all", ...STEP_CATEGORIES.map((c) => c.id)].map((id) => {
                    const label = id === "all" ? "All" : STEP_CATEGORIES.find((c) => c.id === id)?.name ?? id;
                    const active = activeCategory === id;
                    return (
                      <button key={id} onClick={() => setActiveCategory(id)}
                        className={[
                          "shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-semibold transition-all whitespace-nowrap",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                        ].join(" ")}>
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Step buttons grid */}
                <div className="grid grid-cols-2 gap-2">
                  {STEP_TYPES.filter((st) => activeCategory === "all" || st.category === activeCategory).map((st) => {
                    return (
                      <button key={st.type} onClick={() => addStep(st.type)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-background hover:bg-muted/80 hover:border-primary/40 transition-all text-left group shadow-xs">
                        <span className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{st.name}</span>
                        <Plus className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Input & Output */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          
          {/* Input Section (Top Half) */}
          <div className="flex-1 min-h-0 flex flex-col border-b border-border/50">
            {/* Input Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0 bg-card/30">
              <span className="text-xs font-semibold text-foreground/80">Input</span>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={handlePasteInput}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5">
                  <ClipboardPaste className="h-3 w-3" /> Paste
                </Button>
                <Button variant="ghost" size="sm" disabled={!inputText}
                  onClick={() => { setInputText(""); setSelectedStepId(null); }}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1.5">
                  <Trash2 className="h-3 w-3" /> Clear
                </Button>
              </div>
            </div>
            {/* Suggested Templates Bar */}
            {suggestedTemplates.length > 0 && (
              <div className="flex items-center gap-2 px-5 py-2 border-b border-border/30 bg-muted/10 shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  Suggested Templates:
                </span>
                <div className="flex flex-wrap gap-1.5 overflow-hidden">
                  {suggestedTemplates.map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => loadTemplate(key)}
                      className="px-2.5 py-0.5 rounded-full border border-border/60 hover:border-primary/45 hover:text-primary bg-background text-[10px] text-muted-foreground hover:bg-muted/30 transition-all hover:shadow-xs cursor-pointer"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Input Textarea */}
            <div className="flex-1 min-h-0 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here..."
                className="absolute inset-0 w-full h-full px-5 py-4 bg-transparent resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 text-foreground"
              />
            </div>
          </div>

          {/* Output Section (Bottom Half) */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Output header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0 bg-card/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground/80">Output</span>
              {selectedStepId && selectedStep && (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-semibold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Step {selectedStepIndex}: {selectedStepName}
                  </span>
                  <button onClick={() => setSelectedStepId(null)}
                    className="text-[9px] text-muted-foreground hover:text-primary underline transition-colors cursor-pointer">
                    View final
                  </button>
                </div>
              )}
            </div>
            <CopyButton value={displayedOutput} label="Copy" />
          </div>

          {/* Output textarea */}
          <div className="flex-1 min-h-0 relative">
            <textarea
              readOnly
              value={displayedOutput}
              placeholder="Output will appear here in real time..."
              className={[
                "absolute inset-0 w-full h-full px-5 py-4 bg-transparent resize-none font-mono text-sm leading-relaxed focus:outline-none",
                error ? "text-destructive" : "text-foreground",
              ].join(" ")}
            />
            {error && (
              <div className="absolute bottom-4 left-4 right-4 px-3 py-2.5 rounded-lg border border-destructive/30 bg-destructive/8 text-xs text-destructive animate-in fade-in duration-200 shadow-sm backdrop-blur-sm">
                <span className="font-semibold block">Pipeline Error</span>
                <span className="opacity-80">{error}</span>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

