import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  Globe,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
} from "lucide-react";

// Curated popular timezones to show as quick additions when search is empty
const POPULAR_TIMEZONES = [
  { value: "UTC", label: "UTC (Universal Time Coordinated)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Asia/Colombo", label: "Asia/Colombo (IST, LKR)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

// Fallback list of timezones if Intl API is not fully available
const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Colombo",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const getSupportedTimezones = (): string[] => {
  try {
    if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
      return (Intl as any).supportedValuesOf("timeZone");
    }
  } catch (e) {
    console.warn("Intl.supportedValuesOf is not supported or failed:", e);
  }
  return FALLBACK_TIMEZONES;
};

// Global cache for Intl.DateTimeFormat objects to avoid recreating them on every cell render
const formattersCache: Record<string, Intl.DateTimeFormat> = {};

const getCachedFormatter = (timeZone: string, cacheKey: string, options: Intl.DateTimeFormatOptions) => {
  const key = `${timeZone}-${cacheKey}`;
  if (!formattersCache[key]) {
    formattersCache[key] = new Intl.DateTimeFormat("en-US", {
      timeZone,
      ...options,
    });
  }
  return formattersCache[key];
};

const getTzOffsetMs = (timeZone: string, date: Date): number => {
  try {
    const formatter = getCachedFormatter(timeZone, "offsetCalc", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
    
    const year = parseInt(getVal("year"), 10);
    const month = parseInt(getVal("month"), 10) - 1;
    const day = parseInt(getVal("day"), 10);
    const hour = parseInt(getVal("hour"), 10) % 24;
    const minute = parseInt(getVal("minute"), 10);
    const second = parseInt(getVal("second"), 10);
    
    const localUtcTime = Date.UTC(year, month, day, hour, minute, second);
    return localUtcTime - date.getTime();
  } catch {
    return 0;
  }
};

const getUtcDateFromLocal = (selectedDate: number, localHour: number, localMinute: number, timeZone: string): Date => {
  const baseDate = new Date(selectedDate);
  const tempUtcDate = new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    localHour,
    localMinute,
    0
  ));
  const offsetMs = getTzOffsetMs(timeZone, tempUtcDate);
  return new Date(tempUtcDate.getTime() - offsetMs);
};

const getSelectionBorderClass = (isActive: boolean, isHovered: boolean, rowIndex: number, totalRows: number) => {
  if (isActive) {
    const isTop = rowIndex === 0;
    const isBottom = rowIndex === totalRows - 1;
    if (isTop && isBottom) return "border-2 border-stone-500 dark:border-stone-400 rounded-md z-20";
    if (isTop) return "border-t-2 border-x-2 border-stone-500 dark:border-stone-400 rounded-t-md z-20";
    if (isBottom) return "border-b-2 border-x-2 border-stone-500 dark:border-stone-400 rounded-b-md z-20";
    return "border-x-2 border-stone-500 dark:border-stone-400 z-20";
  }
  if (isHovered) {
    const isTop = rowIndex === 0;
    const isBottom = rowIndex === totalRows - 1;
    if (isTop && isBottom) return "border border-stone-400/50 dark:border-stone-500/50 rounded-md z-20";
    if (isTop) return "border-t border-x border-stone-400/50 dark:border-stone-500/50 rounded-t-md z-20";
    if (isBottom) return "border-b border-x border-stone-400/50 dark:border-stone-500/50 rounded-b-md z-20";
    return "border-x border-stone-400/50 dark:border-stone-500/50 z-20";
  }
  return "border-transparent";
};

export const TimezoneTool: React.FC = () => {
  // Timezone list state (load from LocalStorage or use defaults)
  const [timezones, setTimezones] = useState<string[]>(() => {
    const saved = localStorage.getItem("devkit-timezones");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse timezones from localStorage:", e);
      }
    }
    // Default initial list
    return ["UTC", "America/New_York", "Europe/London", "Asia/Colombo"];
  });

  // Selected date timestamp (milliseconds)
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(() => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  });

  // Active selected UTC hour (0 to 23)
  const [activeUtcHour, setActiveUtcHour] = useState<number>(() => {
    return new Date().getUTCHours();
  });

  // Active selected UTC minute (0 to 59)
  const [activeMinute, setActiveMinute] = useState<number>(() => {
    return new Date().getUTCMinutes();
  });

  // Hover state (aligned column index)
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  // Dynamic grid interval state (in minutes: 1, 5, 10, 15, 30, 60)
  const [gridInterval, setGridInterval] = useState<number>(60);

  // Timeline horizontal scroll container ref
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  // Programmatic scroll handler
  const scrollTimeline = (direction: "left" | "right") => {
    if (timelineScrollRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      timelineScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Search and selector state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [is24Hour, setIs24Hour] = useState(true);

  // Save timezones to local storage on change
  const saveTimezones = (newTzs: string[]) => {
    setTimezones(newTzs);
    localStorage.setItem("devkit-timezones", JSON.stringify(newTzs));
  };

  // Move timezone position up or down
  const moveTimezone = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timezones.length) return;

    const updated = [...timezones];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    saveTimezones(updated);
  };

  // Remove a timezone from list
  const removeTimezone = (tzToRemove: string) => {
    const updated = timezones.filter((tz) => tz !== tzToRemove);
    saveTimezones(updated);
  };

  // Add a timezone to list
  const addTimezone = (tzToAdd: string) => {
    if (timezones.includes(tzToAdd)) return;
    const updated = [...timezones, tzToAdd];
    saveTimezones(updated);
    setSearchQuery("");
    setShowSearchDropdown(false);
  };

  // Filter timezones for search dropdown
  const allSupportedZones = getSupportedTimezones();
  const searchResults =
    searchQuery.trim() === ""
      ? []
      : allSupportedZones
          .filter((tz) => tz.toLowerCase().replace(/_/g, " ").includes(searchQuery.toLowerCase()))
          .slice(0, 10);

  // Time ticks calculation helper based on column index
  const getLocalTimeDetails = (colIndex: number, timeZone: string) => {
    const cellTotalMinutes = colIndex * gridInterval;
    const targetHour = Math.floor(cellTotalMinutes / 60);
    const targetMin = cellTotalMinutes % 60;

    const referenceTz = timezones[0] || "UTC";
    const dateAtTime = getUtcDateFromLocal(selectedTimestamp, targetHour, targetMin, referenceTz);

    try {
      const partsFormatter = getCachedFormatter(timeZone, "parts", {
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const parts = partsFormatter.formatToParts(dateAtTime);

      const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
      const localHour = parseInt(getVal("hour"), 10);
      const localMinute = parseInt(getVal("minute"), 10);

      const dayNum = getVal("day");
      const monthStr = getVal("month");

      let displayHour = "";
      let displayMinSuffix = localMinute !== 0 ? `:${getVal("minute")}` : "";
      
      if (is24Hour) {
        displayHour = getVal("hour").padStart(2, "0");
      } else {
        const hour12 = localHour % 12 || 12;
        const ampm = localHour >= 12 ? "pm" : "am";
        if (localHour === 0 || localHour === 12) {
          displayHour = `${hour12}${ampm}`;
        } else {
          displayHour = `${hour12}`;
        }
      }

      // Determine day offset string (+1d, -1d, or empty)
      const targetDateFormatter = getCachedFormatter(timeZone, "ymd", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const targetFmt = targetDateFormatter.format(dateAtTime);

      const referenceDateFormatter = getCachedFormatter(referenceTz, "ymd", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const referenceFmt = referenceDateFormatter.format(dateAtTime);

      let dayOffset = "";
      if (targetFmt > referenceFmt) dayOffset = "+1d";
      else if (targetFmt < referenceFmt) dayOffset = "-1d";

      // Day / Night categorisation
      let timeType: "work" | "transition" | "night" = "work";
      if (localHour >= 22 || localHour < 6) {
        timeType = "night";
      } else if (localHour === 6 || localHour === 7 || (localHour >= 18 && localHour < 22)) {
        timeType = "transition";
      }

      return {
        hour: localHour,
        minute: localMinute,
        displayHour,
        displayMinSuffix,
        dateStrFmtShort: `${monthStr} ${dayNum}`,
        dayString: `${monthStr}-${dayNum}`,
        dayOffset,
        timeType,
      };
    } catch (e) {
      return {
        hour: 0,
        minute: 0,
        displayHour: "--",
        displayMinSuffix: "",
        dateStrFmtShort: "",
        dayString: "",
        dayOffset: "",
        timeType: "night" as const,
      };
    }
  };

  // Get active timezone offset
  const getTzInfo = (timeZone: string) => {
    try {
      const date = new Date(selectedTimestamp);
      const partFormatter = getCachedFormatter(timeZone, "offset", {
        timeZoneName: "shortOffset",
      });
      const parts = partFormatter.formatToParts(date);
      const offsetStr = parts.find((p) => p.type === "timeZoneName")?.value || "";

      // Digital time representation
      const baseDate = new Date(selectedTimestamp);
      const activeDateTime = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), activeUtcHour, activeMinute, 0));
      
      const timeFormatter = getCachedFormatter(timeZone, is24Hour ? "time24" : "time12", {
        hour: "numeric",
        minute: "numeric",
        hour12: !is24Hour,
      });
      const timeStr = timeFormatter.format(activeDateTime);

      // Date string representation
      const dateFormatter = getCachedFormatter(timeZone, "dateShort", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const dateStr = dateFormatter.format(activeDateTime);

      return {
        offset: offsetStr.replace("GMT", "UTC"),
        timeStr,
        dateStr,
      };
    } catch {
      return { offset: "", timeStr: "--:--", dateStr: "" };
    }
  };

  // Date Shift Helper
  const shiftDate = (days: number) => {
    const current = new Date(selectedTimestamp);
    current.setUTCDate(current.getUTCDate() + days);
    setSelectedTimestamp(current.getTime());
  };

  // Reset to Current Time
  const resetToNow = () => {
    const now = new Date();
    setSelectedTimestamp(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    setActiveUtcHour(now.getUTCHours());
    setActiveMinute(now.getUTCMinutes());
  };

  // Clipboard Copied string format
  const activeDateTimeUTC = (() => {
    const baseDate = new Date(selectedTimestamp);
    return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), activeUtcHour, activeMinute, 0));
  })();

  const formatMeetingTimes = () => {
    let output = `📅 Selected Meeting Time: ${activeDateTimeUTC.toUTCString()}\n\nAligned Timezones:\n`;
    timezones.forEach((tz) => {
      const info = getTzInfo(tz);
      output += `- ${tz} (${info.offset}): ${info.dateStr} at ${info.timeStr}\n`;
    });
    return output;
  };

  // Close search dropdown on click away
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSearchDropdown(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Compute dynamic column layout properties
  const totalColumns = 1440 / gridInterval;
  const getCellWidth = (interval: number) => {
    switch (interval) {
      case 60: return "48px";
      case 30: return "36px";
      case 15: return "28px";
      case 10: return "24px";
      case 5: return "16px";
      case 1: return "8px";
      default: return "48px";
    }
  };
  const cellWidth = getCellWidth(gridInterval);

  const getHeaderLabel = (hour: number, minute: number) => {
    const referenceTz = timezones[0] || "UTC";
    const dateAtTime = getUtcDateFromLocal(selectedTimestamp, hour, minute, referenceTz);
    
    try {
      const formatter = getCachedFormatter(referenceTz, "headerFmt", {
        hour: "numeric",
        minute: "numeric",
        hour12: !is24Hour,
      });
      const timeStr = formatter.format(dateAtTime);
      return (
        <div className="flex flex-col items-center leading-none">
          <span className="text-xs font-bold">{timeStr.split(" ")[0]}</span>
          <span className="text-[8px] opacity-65 font-bold tracking-wider uppercase mt-0.5">
            {timeStr.includes(" ") ? timeStr.split(" ")[1] : ""}
          </span>
        </div>
      );
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ToolLayout
        title="World Time & Timezone Converter"
        description="Plan meetings, compare regional offsets, and align timezones. Hover columns to view equivalent hours and select specific timings dynamically."
        inputType="none"
        outputType="none"
      >
        <div className="flex-1 w-full min-h-0 flex flex-col gap-4 overflow-hidden text-left bg-background border border-border/50 rounded-xl p-3">
            
            {/* Top Toolbar controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-border/30 pb-3">
              
              {/* Date Navigation */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button variant="outline" className="h-8 w-8 p-0 rounded-lg border-border/50 bg-background" onClick={() => shiftDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border/50 bg-background text-xs font-semibold select-none text-foreground">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {new Date(selectedTimestamp).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
                <Button variant="outline" className="h-8 w-8 p-0 rounded-lg border-border/50 bg-background" onClick={() => shiftDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="h-8 text-xs ml-1 rounded-lg border-border/50 bg-background" onClick={resetToNow}>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Reset to Now
                </Button>
              </div>

              {/* Timezone search/addition & Format switches */}
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">

                {/* Interval Selector */}
                <div className="flex items-center gap-1.5 border border-border/50 bg-background rounded-lg px-2 h-8 text-xs font-semibold text-foreground">
                  <span className="text-[10px] font-bold text-muted-foreground select-none">Interval:</span>
                  <select
                    value={gridInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setGridInterval(val);
                    }}
                    className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs font-semibold pr-1.5 cursor-pointer text-foreground"
                  >
                    <option value={60} className="bg-popover text-foreground">1 Hour</option>
                    <option value={30} className="bg-popover text-foreground">30 Min</option>
                  </select>
                </div>

                {/* Search field */}
                <div className="relative shrink-0 w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      placeholder="Add timezone... e.g. Tokyo"
                      className="h-8 pr-8 text-xs font-medium bg-background text-foreground border-border/50 rounded-lg"
                    />
                    <Plus className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>

                  {/* Dropdown list */}
                  {showSearchDropdown && (
                    <div className="absolute right-0 left-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border/50 bg-popover text-popover-foreground shadow-lg z-50 p-1 flex flex-col gap-0.5 animate-in fade-in duration-100">
                      {searchQuery.trim() === "" ? (
                        <>
                          <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                            Popular Zones
                          </div>
                          {POPULAR_TIMEZONES.filter(tz => !timezones.includes(tz.value)).map((tz) => (
                            <button
                              key={tz.value}
                              type="button"
                              onClick={() => addTimezone(tz.value)}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/80 hover:text-foreground transition-all duration-75 flex items-center gap-1.5 font-medium"
                            >
                              <Globe className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                              <span className="truncate">{tz.label}</span>
                            </button>
                          ))}
                        </>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((tz) => (
                           <button
                            key={tz}
                            type="button"
                            onClick={() => addTimezone(tz)}
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/80 hover:text-foreground transition-all duration-75 flex items-center gap-1.5 font-medium"
                          >
                            <Globe className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                            <span className="truncate">{tz.replace(/_/g, " ")}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-2.5 py-2 text-xs text-muted-foreground select-none text-center">
                          No matching timezone found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 12h/24h toggle */}
                <Button
                  variant="outline"
                  className="h-8 text-xs rounded-lg border-border/50 bg-background"
                  onClick={() => setIs24Hour(!is24Hour)}
                >
                  {is24Hour ? "12-Hour" : "24-Hour"}
                </Button>
              </div>

            </div>

            {/* Unified Grid Table Container */}
            <div className="flex-1 min-h-0 flex flex-col border border-border/50 rounded-xl bg-background/50 p-1 overflow-y-auto overflow-x-hidden">
              
              {/* Outer Horizontal Scroll Wrapper for timelines */}
              <div ref={timelineScrollRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin bg-background border border-border/50 rounded-xl flex flex-col">
                <div className="min-w-full h-full flex flex-col select-none relative animate-in fade-in duration-200">
                  
                  {/* Row 0: Top Header Hour Scale */}
                  <div className="flex items-center h-10 border-b border-border/30 bg-muted/40 shrink-0 select-none">
                    {/* Left Sticky Spacer matching zone cards width */}
                    <div className="w-[210px] md:w-[250px] shrink-0 sticky left-0 z-30 bg-muted/40 border-r border-border/30 flex items-center justify-between px-3 h-full">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timezones</span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="outline"
                          className="h-6 w-6 p-0 bg-background hover:bg-muted text-muted-foreground border-border/50 rounded-md shadow-2xs"
                          onClick={() => scrollTimeline("left")}
                          title="Scroll Left"
                          type="button"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          className="h-6 w-6 p-0 bg-background hover:bg-muted text-muted-foreground border-border/50 rounded-md shadow-2xs"
                          onClick={() => scrollTimeline("right")}
                          title="Scroll Right"
                          type="button"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Right Hour Grid Scale */}
                    <div
                      className="flex-1 h-full grid"
                      style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(${cellWidth}, 1fr))` }}
                    >
                      {Array.from({ length: totalColumns }).map((_, i) => {
                        const cellTotalMinutes = i * gridInterval;
                        const hour = Math.floor(cellTotalMinutes / 60);
                        const minute = cellTotalMinutes % 60;
                        const referenceTz = timezones[0] || "UTC";
                        
                        // Check if active
                        const cellDate = getUtcDateFromLocal(selectedTimestamp, hour, minute, referenceTz);
                        const activeTimeRounded = Math.floor(activeDateTimeUTC.getTime() / (gridInterval * 60 * 1000)) * (gridInterval * 60 * 1000);
                        const cellTimeRounded = Math.floor(cellDate.getTime() / (gridInterval * 60 * 1000)) * (gridInterval * 60 * 1000);
                        const isActive = activeTimeRounded === cellTimeRounded;
                        const isHovered = i === hoveredColIndex;

                        const borderClass = gridInterval >= 15
                          ? "border-r border-border/20 dark:border-border/10"
                          : (minute === 0 ? "border-r border-border/60" : "");

                        const selectionBorder = getSelectionBorderClass(isActive, isHovered, 0, timezones.length + 1);

                        return (
                          <div
                            key={i}
                            onMouseEnter={() => setHoveredColIndex(i)}
                            onMouseLeave={() => setHoveredColIndex(null)}
                            onClick={() => {
                              const targetDate = getUtcDateFromLocal(selectedTimestamp, hour, minute, referenceTz);
                              setActiveUtcHour(targetDate.getUTCHours());
                              setActiveMinute(targetDate.getUTCMinutes());
                            }}
                            className={`flex flex-col items-center justify-center cursor-pointer transition-all font-mono select-none relative ${borderClass} ${selectionBorder} ${
                              isActive
                                ? "bg-primary/25 text-foreground font-bold shadow-inner"
                                : isHovered
                                ? "bg-muted dark:bg-muted/50 text-foreground font-semibold"
                                : "text-muted-foreground/75 hover:bg-muted/20"
                            }`}
                          >
                            {getHeaderLabel(hour, minute)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rows List */}
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    {timezones.map((tz, rowIndex) => {
                      const info = getTzInfo(tz);
                      const isReference = rowIndex === 0;

                      // Calculate relative offset in hours relative to the reference timezone
                      const refTz = timezones[0] || "UTC";
                      const baseDate = new Date(selectedTimestamp);
                      const refOffset = getTzOffsetMs(refTz, baseDate);
                      const thisOffset = getTzOffsetMs(tz, baseDate);
                      const diffHours = (thisOffset - refOffset) / 3600000;
                      const diffHoursStr = diffHours === 0 
                        ? "home" 
                        : (diffHours > 0 ? `+${diffHours}` : `${diffHours}`).replace(".5", ".5h");

                      return (
                        <div key={tz} className="flex items-center h-14 border-b last:border-b-0 border-border/20 hover:bg-muted/5 transition-colors group/row">
                          {/* Left Sticky Timezone Metadata Card */}
                          <div className="w-[210px] md:w-[250px] shrink-0 sticky left-0 z-30 bg-background border-r border-border/30 px-3 flex items-center justify-between gap-2 h-full">
                            <div className="flex items-center min-w-0 h-full relative flex-1">
                              
                              {/* Left control/badge area */}
                              <div className="w-[60px] shrink-0 h-full flex items-center relative mr-2">
                                {/* Stars/Offset badge (visible by default, hidden on hover) */}
                                <div className="absolute inset-0 flex items-center opacity-100 group-hover/row:opacity-0 transition-opacity duration-150 pointer-events-none">
                                  {isReference ? (
                                    <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 dark:bg-amber-500/5 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      ★ <span className="text-[8px] uppercase tracking-wide opacity-80">ref</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">
                                      {diffHoursStr}
                                    </span>
                                  )}
                                </div>

                                {/* Reorder / Action control triggers (hidden by default, visible on hover) */}
                                <div className="absolute inset-0 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 pointer-events-none group-hover/row:pointer-events-auto transition-opacity duration-150">
                                  <Button
                                    variant="outline"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:bg-muted bg-background border-border/50 shadow-2xs"
                                    onClick={() => moveTimezone(rowIndex, "up")}
                                    disabled={rowIndex === 0}
                                    title="Move Up"
                                    type="button"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:bg-muted bg-background border-border/50 shadow-2xs"
                                    onClick={() => moveTimezone(rowIndex, "down")}
                                    disabled={rowIndex === timezones.length - 1}
                                    title="Move Down"
                                    type="button"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-5 w-5 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10 bg-background border-border/50 shadow-2xs"
                                    onClick={() => removeTimezone(tz)}
                                    disabled={timezones.length <= 1}
                                    title="Remove"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Timezone Name */}
                              <div className="flex flex-col min-w-0 justify-center">
                                <span className="text-sm font-bold truncate text-foreground leading-tight" title={tz}>
                                  {tz.split("/").pop()?.replace(/_/g, " ")}
                                </span>
                                <span className="text-[10px] text-muted-foreground/80 truncate font-medium mt-0.5 leading-none">
                                  {tz.split("/")[0]}
                                </span>
                              </div>
                            </div>

                            {/* Digital Time & Date */}
                            <div className="text-right shrink-0 flex flex-col items-end justify-center font-mono">
                              <span className="text-sm font-extrabold text-foreground leading-tight">
                                {info.timeStr.split(" ")[0]}
                                <span className="text-[10px] font-medium text-muted-foreground ml-0.5 font-sans">
                                  {info.timeStr.includes(" ") ? info.timeStr.split(" ")[1] : ""}
                                </span>
                              </span>
                              <span className="text-[10px] text-muted-foreground leading-none font-medium mt-1">
                                {info.dateStr.split(",")[0]}, {info.dateStr.split(",").slice(1).join(",")}
                              </span>
                            </div>
                          </div>

                          {/* Right Timeline Grid */}
                          <div
                            className="flex-1 h-full grid"
                            style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(${cellWidth}, 1fr))` }}
                          >
                            {Array.from({ length: totalColumns }).map((_, i) => {
                              const cellTotalMinutes = i * gridInterval;
                              const cellHour = Math.floor(cellTotalMinutes / 60);
                              const cellMinute = cellTotalMinutes % 60;
                              
                              const cellDate = getUtcDateFromLocal(selectedTimestamp, cellHour, cellMinute, refTz);
                              const activeTimeRounded = Math.floor(activeDateTimeUTC.getTime() / (gridInterval * 60 * 1000)) * (gridInterval * 60 * 1000);
                              const cellTimeRounded = Math.floor(cellDate.getTime() / (gridInterval * 60 * 1000)) * (gridInterval * 60 * 1000);
                              const isActive = activeTimeRounded === cellTimeRounded;
                              const isHovered = i === hoveredColIndex;

                              const details = getLocalTimeDetails(i, tz);

                              // Calculate if we need a day boundary date badge
                              // Show date badge if this is the first cell (i === 0) OR the date is different from previous cell
                              let showDayBadge = false;
                              let dayBadgeText = "";
                              if (i === 0) {
                                showDayBadge = true;
                                dayBadgeText = details.dateStrFmtShort; // e.g. "Jun 17"
                              } else {
                                const prevDetails = getLocalTimeDetails(i - 1, tz);
                                if (details.dayString !== prevDetails.dayString) {
                                  showDayBadge = true;
                                  dayBadgeText = details.dateStrFmtShort;
                                }
                              }

                              const isFirstOfDay = i === 0 || details.dayString !== getLocalTimeDetails(i - 1, tz).dayString;
                              const isLastOfDay = i === totalColumns - 1 || details.dayString !== getLocalTimeDetails(i + 1, tz).dayString;

                              const isToday = details.dayOffset === "";
                              let ribbonBg = isToday 
                                ? "bg-stone-50 dark:bg-stone-900/40" 
                                : "bg-stone-200 dark:bg-stone-950/80";
                              let ribbonBorderColor = isToday
                                ? "border-stone-200 dark:border-stone-800/80"
                                : "border-stone-300/70 dark:border-stone-900/60";

                              const isMidnight = details.hour === 0 && details.minute === 0;

                              if (isMidnight && !isActive && !isHovered) {
                                ribbonBg = "bg-blue-600 dark:bg-blue-600 text-white";
                                ribbonBorderColor = "border-blue-600 dark:border-blue-700";
                              } else if (isActive) {
                                ribbonBg = "bg-primary/20 dark:bg-primary/25";
                                ribbonBorderColor = "border-primary/30 dark:border-primary/30";
                              } else if (isHovered) {
                                ribbonBg = "bg-stone-200/70 dark:bg-stone-800/60";
                                ribbonBorderColor = "border-stone-300/50 dark:border-stone-700/50";
                              }

                              let ribbonShapeClass = "";
                              if (isFirstOfDay && isLastOfDay) {
                                ribbonShapeClass = `rounded-xl border ${ribbonBg} ${ribbonBorderColor} mx-1`;
                              } else if (isFirstOfDay) {
                                ribbonShapeClass = `rounded-l-xl border-l border-y ${ribbonBg} ${ribbonBorderColor} ml-1`;
                              } else if (isLastOfDay) {
                                ribbonShapeClass = `rounded-r-xl border-r border-y ${ribbonBg} ${ribbonBorderColor} mr-1`;
                              } else {
                                ribbonShapeClass = `border-y ${ribbonBg} ${ribbonBorderColor}`;
                              }

                              const getHourStyle = (type: "work" | "transition" | "night") => {
                                if (isActive || isHovered) return "text-foreground font-bold";
                                if (isMidnight) return "text-white font-bold";
                                switch (type) {
                                  case "work":
                                    return "text-stone-900 dark:text-stone-100 font-extrabold";
                                  case "transition":
                                    return "text-stone-600 dark:text-stone-300 font-semibold";
                                  case "night":
                                    return "text-stone-400/75 dark:bg-transparent dark:text-stone-500/70 font-medium italic";
                                }
                              };

                              const selectionBorder = getSelectionBorderClass(isActive, isHovered, rowIndex + 1, timezones.length + 1);

                              return (
                                <div
                                  key={i}
                                  onMouseEnter={() => setHoveredColIndex(i)}
                                  onMouseLeave={() => setHoveredColIndex(null)}
                                  onClick={() => {
                                    const targetDate = getUtcDateFromLocal(selectedTimestamp, cellHour, cellMinute, refTz);
                                    setActiveUtcHour(targetDate.getUTCHours());
                                    setActiveMinute(targetDate.getUTCMinutes());
                                  }}
                                  className={`flex flex-col items-stretch justify-center cursor-pointer transition-all select-none relative h-full ${selectionBorder}`}
                                >
                                  <div className={`flex flex-col items-center justify-center h-10 my-2 px-0.5 relative transition-all duration-150 ${ribbonShapeClass}`}>
                                    {isMidnight ? (
                                      <div className="flex flex-col items-center leading-none">
                                        <span className={`text-[7px] font-extrabold uppercase tracking-wider font-sans mb-0.5 ${(isActive || isHovered) ? "text-primary/95" : "text-white/90"}`}>
                                          Midnight
                                        </span>
                                        <span className={`text-[10px] font-bold ${(isActive || isHovered) ? "text-foreground" : "text-white"}`}>
                                          {details.dateStrFmtShort}
                                        </span>
                                      </div>
                                    ) : showDayBadge ? (
                                      <div className="flex flex-col items-center leading-none">
                                        <span className="text-[8px] font-extrabold uppercase tracking-wide bg-primary/20 text-primary px-1 py-0.2 rounded mb-0.5 font-sans">
                                          {dayBadgeText}
                                        </span>
                                        <span className={`text-xs font-bold ${getHourStyle(details.timeType)}`}>
                                          {details.displayHour}
                                          {details.displayMinSuffix}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center leading-none">
                                        <span className={`text-xs ${getHourStyle(details.timeType)}`}>
                                          {details.displayHour}
                                        </span>
                                        {details.displayMinSuffix && (
                                          <span className={`text-[8px] font-bold mt-0.5 ${(isActive || isHovered) ? "text-foreground/80" : "text-stone-500 dark:text-stone-400"}`}>
                                            {details.displayMinSuffix}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>

            {/* Bottom summary info & Copy Action */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-background/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 animate-pulse" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">
                    Selected Meeting: {activeDateTimeUTC.toUTCString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Click any cell to choose an hour and minute. Hover columns to align times. Shading indicates Work Hours (Business), Transitions, and Night/Out-of-Hours. Configured minute updates all timelines synchronized. Select different intervals above. Use the scroll arrows on the top left of the grid to scroll horizontally.
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <CopyButton
                  value={formatMeetingTimes()}
                  label="Copy Aligned Meeting Times"
                />
              </div>
            </div>

          </div>
      </ToolLayout>
    </div>
  );
};
