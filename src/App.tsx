import React, { useState, useEffect } from "react";
import {
  Code,
  Braces,
  FileCode,
  Hash,
  Key,
  Calendar,
  CalendarRange,
  Sliders,
  Sun,
  Moon,
  Terminal,
  ArrowRight,
  Search,
  Command,
  Zap,
  ChevronDown,
  Workflow,
  Globe,
  ImagePlus,
  ScanText,
} from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Tools
import { Base64Tool } from "@/tools/base64/base-64-tool";
import { JsonTool } from "@/tools/json/json-tool";
import { JwtTool } from "@/tools/jwt/jwt-tool";
import { UrlTool } from "@/tools/url/url-tool";
import { HashTool } from "@/tools/hash/hash-tool";
import { UuidTool } from "@/tools/uuid/uuid-tool";
import { EpochTool } from "@/tools/epoch/epoch-tool";
import { JulianTool } from "@/tools/julian/julian-tool";
import { PasswordTool } from "@/tools/password/password-tool";
import { TextPipelineTool } from "@/tools/text-pipeline/text-pipeline-tool";
import { TimezoneTool } from "@/tools/timezone/timezone-tool";
import { ImageExtractorTool } from "@/tools/image-extractor/image-extractor-tool";
import { NonAsciiTool } from "@/tools/non-ascii/non-ascii-tool";

// Radix/Shadcn dialog for Command Palette
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: "encoders" | "formatters" | "generators" | "converters";
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  keywords: string[];
}

const TOOLS: ToolItem[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Prettify, minify, and validate JSON structures",
    category: "formatters",
    icon: Braces,
    component: JsonTool,
    keywords: ["json", "pretty", "minify", "format", "validate", "lint"],
  },
  {
    id: "base64",
    name: "Base64 Encoder/Decoder",
    description: "Encode and decode text or files to Base64 format",
    category: "encoders",
    icon: Code,
    component: Base64Tool,
    keywords: ["base64", "b64", "encode", "decode", "image", "file", "text"],
  },
  {
    id: "jwt-decoder",
    name: "JWT Encoder/Decoder",
    description: "Decode, edit claims, and re-encode JSON Web Tokens",
    category: "formatters",
    icon: FileCode,
    component: JwtTool,
    keywords: ["jwt", "token", "decoder", "encoder", "header", "payload", "claims", "sign", "hmac"],
  },
  {
    id: "url-encoder",
    name: "URL Encoder/Decoder",
    description: "Convert special characters for URL safety and parse parameters",
    category: "encoders",
    icon: Terminal,
    component: UrlTool,
    keywords: ["url", "uri", "encode", "decode", "query", "param", "parse"],
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes",
    category: "generators",
    icon: Hash,
    component: HashTool,
    keywords: ["hash", "md5", "sha256", "sha512", "sha1", "crypto", "checksum", "hmac"],
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Bulk generate UUID v1 and v4 strings",
    category: "generators",
    icon: Sliders,
    component: UuidTool,
    keywords: ["uuid", "guid", "generator", "unique", "id", "random"],
  },
  {
    id: "epoch-converter",
    name: "Epoch Converter",
    description: "Convert timestamps between unix and human date/time",
    category: "converters",
    icon: Calendar,
    component: EpochTool,
    keywords: ["epoch", "unix", "timestamp", "time", "date", "utc", "local"],
  },
  {
    id: "julian-converter",
    name: "Julian Date Converter",
    description: "Convert ordinal dates (yyyyDDD) to Gregorian (yyyy-mm-dd) and back",
    category: "converters",
    icon: CalendarRange,
    component: JulianTool,
    keywords: ["julian", "ordinal", "yyyyddd", "day of year", "date", "gregorian", "convert"],
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Create strong random passwords with custom rules",
    category: "generators",
    icon: Key,
    component: PasswordTool,
    keywords: ["password", "pwd", "generator", "secure", "random", "entropy"],
  },
  {
    id: "text-pipeline",
    name: "Text Pipeline Converter",
    description: "Chain multiple text transformations and load templates sequentially",
    category: "converters",
    icon: Workflow,
    component: TextPipelineTool,
    keywords: ["pipeline", "chain", "text", "csv", "markdown", "table", "split", "replace", "regex", "convert"],
  },
  {
    id: "timezone-converter",
    name: "Timezone Converter",
    description: "Align, convert, and compare local meeting times globally",
    category: "converters",
    icon: Globe,
    component: TimezoneTool,
    keywords: ["timezone", "clock", "world", "converter", "time", "date", "gmt", "utc", "meeting", "planner"],
  },
  {
    id: "image-extractor",
    name: "Clipboard Image Extractor",
    description: "Paste, view, and extract images directly from your clipboard",
    category: "converters",
    icon: ImagePlus,
    component: ImageExtractorTool,
    keywords: ["image", "clipboard", "extract", "paste", "download", "png", "jpeg"],
  },
  {
    id: "non-ascii-identifier",
    name: "Non-ASCII Identifier",
    description: "Identify, highlight, and remove hidden or non-ASCII characters from text",
    category: "formatters",
    icon: ScanText,
    component: NonAsciiTool,
    keywords: ["ascii", "hidden", "character", "unicode", "zero-width", "clean", "text"],
  },
];

const CATEGORIES = [
  { id: "formatters", name: "Formatters & Parsers" },
  { id: "encoders", name: "Encoders & Decoders" },
  { id: "generators", name: "Generators" },
  { id: "converters", name: "Converters" },
];

const getCategoryColorClasses = (category: string, isActive: boolean) => {
  const themes: Record<string, {
    expanded: string;
    collapsed: string;
    iconBox: string;
    badge: string;
    accentBorder: string;
    accentBg: string;
    glow: string;
  }> = {
    formatters: {
      expanded: isActive
        ? "bg-stone-500/10 text-stone-900 dark:text-stone-100 border-stone-500/20 dark:border-stone-400/20"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-500/5 border-transparent",
      collapsed: isActive
        ? "bg-stone-500/15 text-stone-900 dark:text-stone-100 border-stone-500/25 dark:border-stone-400/25"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-500/10 border-transparent",
      iconBox: isActive
        ? "bg-stone-500/20 border-stone-500/20 text-stone-900 dark:text-stone-100"
        : "bg-muted/50 border-border/40 group-hover:bg-stone-500/10 group-hover:border-stone-500/20 group-hover:text-stone-900 dark:group-hover:text-stone-100",
      badge: "bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20",
      accentBorder: "border-stone-200/60 dark:border-stone-800/40",
      accentBg: "bg-stone-50/30 dark:bg-stone-900/15",
      glow: "group-hover:border-stone-300/60 dark:group-hover:border-stone-700/40 group-hover:shadow-stone-500/2",
    },
    encoders: {
      expanded: isActive
        ? "bg-stone-600/10 text-stone-900 dark:text-stone-100 border-stone-600/20 dark:border-stone-500/20"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-600/5 border-transparent",
      collapsed: isActive
        ? "bg-stone-600/15 text-stone-900 dark:text-stone-100 border-stone-600/25 dark:border-stone-500/25"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-600/10 border-transparent",
      iconBox: isActive
        ? "bg-stone-600/20 border-stone-600/20 text-stone-900 dark:text-stone-100"
        : "bg-muted/50 border-border/40 group-hover:bg-stone-600/10 group-hover:border-stone-600/20 group-hover:text-stone-900 dark:group-hover:text-stone-100",
      badge: "bg-stone-600/10 text-stone-700 dark:text-stone-300 border-stone-600/20",
      accentBorder: "border-stone-200/60 dark:border-stone-800/40",
      accentBg: "bg-stone-50/30 dark:bg-stone-900/15",
      glow: "group-hover:border-stone-300/60 dark:group-hover:border-stone-700/40 group-hover:shadow-stone-500/2",
    },
    generators: {
      expanded: isActive
        ? "bg-stone-400/10 text-stone-900 dark:text-stone-100 border-stone-400/20 dark:border-stone-300/20"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-400/5 border-transparent",
      collapsed: isActive
        ? "bg-stone-400/15 text-stone-900 dark:text-stone-100 border-stone-400/25 dark:border-stone-300/25"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-400/10 border-transparent",
      iconBox: isActive
        ? "bg-stone-400/20 border-stone-400/20 text-stone-900 dark:text-stone-100"
        : "bg-muted/50 border-border/40 group-hover:bg-stone-400/10 group-hover:border-stone-400/20 group-hover:text-stone-900 dark:group-hover:text-stone-100",
      badge: "bg-stone-400/10 text-stone-700 dark:text-stone-300 border-stone-400/20",
      accentBorder: "border-stone-200/60 dark:border-stone-800/40",
      accentBg: "bg-stone-50/30 dark:bg-stone-900/15",
      glow: "group-hover:border-stone-300/60 dark:group-hover:border-stone-700/40 group-hover:shadow-stone-500/2",
    },
    converters: {
      expanded: isActive
        ? "bg-stone-700/10 text-stone-900 dark:text-stone-100 border-stone-700/20 dark:border-stone-600/20"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-700/5 border-transparent",
      collapsed: isActive
        ? "bg-stone-700/15 text-stone-900 dark:text-stone-100 border-stone-700/25 dark:border-stone-600/25"
        : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-700/10 border-transparent",
      iconBox: isActive
        ? "bg-stone-700/20 border-stone-700/20 text-stone-900 dark:text-stone-100"
        : "bg-muted/50 border-border/40 group-hover:bg-stone-700/10 group-hover:border-stone-700/20 group-hover:text-stone-900 dark:group-hover:text-stone-100",
      badge: "bg-stone-700/10 text-stone-700 dark:text-stone-300 border-stone-700/20",
      accentBorder: "border-stone-200/60 dark:border-stone-800/40",
      accentBg: "bg-stone-50/30 dark:bg-stone-900/15",
      glow: "group-hover:border-stone-300/60 dark:group-hover:border-stone-700/40 group-hover:shadow-stone-500/2",
    },
  };
  return themes[category] || themes.formatters;
};

export default function App() {
  const [activeToolId, setActiveToolId] = useState<string>("");
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [cmdKQuery, setCmdKQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/tool/", "");
      const matched = TOOLS.find((t) => t.id === hash);
      if (matched) {
        setActiveToolId(matched.id);
      } else {
        setActiveToolId(""); // dashboard
      }
    };

    handleHashChange(); // on load
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Sync Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setMegaMenuOpen(false);
  };

  // Keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCmdKOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered tools for command palette
  const cmdKFiltered = cmdKQuery
    ? TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(cmdKQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(cmdKQuery.toLowerCase()) ||
          t.keywords.some((k) => k.toLowerCase().includes(cmdKQuery.toLowerCase()))
      )
    : TOOLS;

  // Command palette navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [cmdKQuery]);

  const handleCmdKKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % cmdKFiltered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + cmdKFiltered.length) % cmdKFiltered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cmdKFiltered[selectedIndex]) {
        navigateToTool(cmdKFiltered[selectedIndex].id);
      }
    }
  };

  const navigateToTool = (id: string) => {
    window.location.hash = `#/tool/${id}`;
    setActiveToolId(id);
    setIsCmdKOpen(false);
    setCmdKQuery("");
    setMegaMenuOpen(false);
  };

  const navigateToHome = () => {
    window.location.hash = "";
    setActiveToolId("");
    setMegaMenuOpen(false);
  };

  const activeTool = TOOLS.find((t) => t.id === activeToolId);
  const ToolComponent = activeTool ? activeTool.component : null;

  const hasSearchResults = TOOLS.some(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
        
        {/* MAIN DISPLAY WORKSPACE */}
        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
          
          {/* HEADER TOP BAR */}
          <header className="relative z-50 h-14 flex items-center justify-between px-6 border-b border-border/40 shrink-0 bg-card/85 backdrop-blur-md">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div
                onClick={navigateToHome}
                className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="p-1.5 rounded-lg bg-stone-500/10 border border-stone-500/20 text-foreground group-hover:bg-stone-500/20 transition-all">
                  <Zap className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                </div>
                <span className="font-extrabold tracking-tight text-sm text-foreground">
                  DevKit Toolbox
                </span>
              </div>

              <div className="h-4 w-[1px] bg-stone-200/60 dark:bg-stone-800/60" />

              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${
                  megaMenuOpen
                    ? "bg-stone-500/15 text-stone-900 dark:text-stone-100 border-stone-500/30"
                    : "text-muted-foreground hover:text-stone-900 dark:hover:text-stone-100 hover:bg-muted border-border/40 hover:border-border/80"
                }`}
              >
                <span>All Tools</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Breadcrumbs */}
              {activeTool && (
                <>
                  <div className="h-4 w-[1px] bg-stone-200/60 dark:bg-stone-800/60 hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
                    <span className="text-muted-foreground cursor-pointer hover:text-foreground" onClick={navigateToHome}>
                      Dashboard
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground capitalize">{activeTool.category}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-primary font-bold">{activeTool.name}</span>
                  </div>
                </>
              )}
            </div>

            {/* Top Bar Actions */}
            <div className="flex items-center gap-2">
              {/* Command Palette Button */}
              <button
                onClick={() => setIsCmdKOpen(true)}
                className="hidden md:flex items-center gap-2.5 px-3 py-1.5 border border-border/40 hover:border-border/80 rounded-lg bg-card/35 text-muted-foreground hover:text-foreground transition-all cursor-pointer h-9 text-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search tools...</span>
                <span className="flex items-center gap-0.5 border border-border/40 bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono select-none">
                  <Command className="h-2.5 w-2.5" />K
                </span>
              </button>

              <button
                onClick={() => setIsCmdKOpen(true)}
                className="md:hidden p-2 hover:bg-muted/40 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-muted/40 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Github link */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 hover:bg-stone-100/40 dark:hover:bg-stone-900/35 rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
            </div>
          </header>

          {/* MEGA MENU OVERLAY */}
          {megaMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-45 bg-background/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={() => setMegaMenuOpen(false)}
              />
              {/* Mega Menu Panel */}
              <div className="absolute top-14 left-0 right-0 z-50 border-b border-border/30 bg-card/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-top-2 duration-300">
                <div className="w-full px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {CATEGORIES.map((cat) => {
                    const catTools = TOOLS.filter((t) => t.category === cat.id);
                    return (
                      <div key={cat.id} className="flex flex-col gap-3.5">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 border-b border-border/20 pb-2">
                          {cat.name}
                        </h3>
                        <div className="flex flex-col gap-1.5">
                          {catTools.map((t) => {
                            const Icon = t.icon;
                            const isActive = activeToolId === t.id;
                            const colors = getCategoryColorClasses(t.category, isActive);

                            return (
                              <button
                                key={t.id}
                                onClick={() => navigateToTool(t.id)}
                                className={`group flex items-start gap-3 p-2.5 rounded-xl text-left border transition-all active:scale-[0.98] ${colors.expanded}`}
                              >
                                <div className={`p-1.5 rounded-lg border shrink-0 transition-all ${colors.iconBox}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold truncate group-hover:text-foreground transition-all">
                                    {t.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1 mt-0.5">
                                    {t.description}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* MAIN PAGE BODY (Dashboard / Active Tool) */}
          <main className={`flex-1 flex flex-col ${activeTool ? "overflow-hidden p-3 md:p-4" : "overflow-hidden"} bg-background/5`}>
            {activeTool && ToolComponent ? (
              <div className="w-full h-full flex flex-col overflow-hidden">
                <ToolComponent />
              </div>
            ) : (
              /* DASHBOARD LANDING PAGE */
              <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">

                {/* Dashboard Header / Hero */}
                <div className="shrink-0 px-6 py-5 border-b border-border/30 bg-card/25 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <h1 className="text-sm font-extrabold tracking-tight text-foreground flex items-center gap-2">
                      <span className="p-1 rounded bg-stone-500/10 border border-stone-500/20 text-stone-500 dark:text-stone-400 shrink-0">
                        <Zap className="h-3.5 w-3.5" />
                      </span>
                      DevKit Toolbox
                    </h1>
                    <p className="text-[11px] text-muted-foreground/80 leading-normal max-w-xl">
                      An offline-first utility toolbox for developers. Prettify, encode, hash, convert, and inspect code instantly.
                    </p>
                  </div>
                  
                  {/* Filter/Search Bar */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter tools..."
                      className="pl-8 h-8 text-xs bg-background/50 border-border/40 rounded-md focus-visible:ring-ring/20 focus-visible:border-ring/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Dashboard Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  {!hasSearchResults ? (
                    <div className="flex flex-col items-center justify-center h-[350px] gap-3 text-center">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/30 text-muted-foreground">
                        <Search className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground">No results for "{searchQuery}"</p>
                        <p className="text-xs text-muted-foreground">Try searching by tool name, keyword, or format type</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSearchQuery("")} className="mt-1 h-7 text-xs rounded-lg border-border/50">
                        Clear filter
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                      {CATEGORIES.map((cat) => {
                        const catTools = TOOLS.filter(
                          (t) =>
                            t.category === cat.id &&
                            (searchQuery === "" ||
                              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())))
                        );
                        if (catTools.length === 0) return null;

                        const colors = getCategoryColorClasses(cat.id, false);

                        return (
                          <div
                            key={cat.id}
                            id={`cat-${cat.id}`}
                            className={`p-4 rounded-2xl border bg-card/45 backdrop-blur-xs flex flex-col gap-3 shadow-xs hover:shadow-md/5 transition-all duration-300 ${colors.accentBorder} ${colors.accentBg}`}
                          >
                            {/* Category Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-stone-200/20 dark:border-stone-800/10">
                              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/80">
                                {cat.name}
                              </h2>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                {catTools.length} {catTools.length === 1 ? "tool" : "tools"}
                              </span>
                            </div>

                            {/* List of tool cards (one per row) */}
                            <div className="grid grid-cols-1 gap-2">
                              {catTools.map((t) => {
                                const Icon = t.icon;
                                const toolColors = getCategoryColorClasses(t.category, false);
                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => navigateToTool(t.id)}
                                    className={`group flex items-start gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card hover:bg-card/85 cursor-pointer transition-all duration-200 text-left w-full active:scale-[0.98] ${toolColors.glow}`}
                                  >
                                    <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg border transition-all duration-200 ${toolColors.iconBox}`}>
                                      <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                      <span className="font-bold text-xs text-foreground group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors leading-tight truncate">
                                        {t.name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground/80 leading-normal line-clamp-2">
                                        {t.description}
                                      </span>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-1.5 text-muted-foreground/35 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all duration-200" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* COMMAND PALETTE DIALOG MODAL */}
        <Dialog open={isCmdKOpen} onOpenChange={setIsCmdKOpen}>
          <DialogContent className="max-w-[500px] p-0 overflow-hidden bg-card border-border/40 shadow-2xl rounded-2xl">
            <DialogTitle className="sr-only">Command Palette</DialogTitle>
            
            {/* Search Input */}
            <div className="p-4 border-b border-border/20 flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={cmdKQuery}
                onChange={(e) => setCmdKQuery(e.target.value)}
                onKeyDown={handleCmdKKeyDown}
                placeholder="Search tools or keywords..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-semibold border-none"
                autoFocus
              />
              <span className="text-[10px] font-semibold text-muted-foreground border px-1.5 py-0.5 rounded bg-muted/40 font-mono">
                ESC
              </span>
            </div>

            {/* Search Results */}
            <div className="max-h-[350px] overflow-y-auto p-2 flex flex-col gap-0.5">
              {cmdKFiltered.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  No tools found for "{cmdKQuery}"
                </div>
              ) : (
                cmdKFiltered.map((t, index) => {
                  const Icon = t.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigateToTool(t.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 text-foreground border border-primary/20"
                          : "text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-1.5 rounded-lg border ${
                          isSelected ? "bg-primary/25 border-primary/20 text-primary" : "bg-muted border-border/20"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold truncate">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate leading-normal">
                            {t.description}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/10 animate-in fade-in duration-200">
                          Launch
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="px-4 py-2 bg-muted/40 border-t border-border/20 text-[10px] text-muted-foreground flex items-center justify-between font-medium">
              <div className="flex gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
              </div>
              <span>{cmdKFiltered.length} tools available</span>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
