import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { ToolPanel, ToolShell } from "@/components/shared/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Play, Pause, Calendar, ArrowRightLeft } from "lucide-react";

export const EpochTool: React.FC = () => {
  // Live ticker state
  const [liveEpoch, setLiveEpoch] = useState<number>(Math.floor(Date.now() / 1000));
  const [isPlaying, setIsPlaying] = useState(true);

  // Epoch to Date state
  const [inputEpoch, setInputEpoch] = useState(Math.floor(Date.now() / 1000).toString());
  const [epochUnit, setEpochUnit] = useState<"s" | "ms">("s");
  const [localDate, setLocalDate] = useState("");
  const [utcDate, setUtcDate] = useState("");
  const [epochError, setEpochError] = useState<string | null>(null);

  // Date to Epoch state
  const [inputDate, setInputDate] = useState(new Date().toISOString().slice(0, 19)); // YYYY-MM-DDTHH:mm:ss
  const [outSeconds, setOutSeconds] = useState("");
  const [outMilliseconds, setOutMilliseconds] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  // Live Counter Effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLiveEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Convert Epoch to Date Logic
  const convertEpochToDate = (epochStr: string, unit: "s" | "ms") => {
    setEpochError(null);
    if (!epochStr.trim()) {
      setLocalDate("");
      setUtcDate("");
      return;
    }

    const val = parseInt(epochStr, 10);
    if (isNaN(val)) {
      setEpochError("Invalid number format");
      setLocalDate("");
      setUtcDate("");
      return;
    }

    try {
      const timestamp = unit === "s" ? val * 1000 : val;
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        throw new Error("Invalid timestamp value range");
      }

      setLocalDate(date.toLocaleString());
      setUtcDate(date.toUTCString());
    } catch (err: any) {
      setEpochError(err.message || "Invalid Date");
      setLocalDate("");
      setUtcDate("");
    }
  };

  // Convert Date to Epoch Logic
  const convertDateToEpoch = (dateStr: string) => {
    setDateError(null);
    if (!dateStr.trim()) {
      setOutSeconds("");
      setOutMilliseconds("");
      return;
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error("Could not parse date string");
      }

      const ms = date.getTime();
      setOutSeconds(Math.floor(ms / 1000).toString());
      setOutMilliseconds(ms.toString());
    } catch (err: any) {
      setDateError(err.message || "Invalid date format");
      setOutSeconds("");
      setOutMilliseconds("");
    }
  };

  useEffect(() => {
    convertEpochToDate(inputEpoch, epochUnit);
  }, [inputEpoch, epochUnit]);

  useEffect(() => {
    convertDateToEpoch(inputDate);
  }, [inputDate]);

  const loadCurrentEpoch = () => {
    setInputEpoch(Math.floor(Date.now() / 1000).toString());
    setEpochUnit("s");
  };

  const loadCurrentDate = () => {
    setInputDate(new Date().toISOString().slice(0, 19));
  };

  return (
    <ToolShell
      title="Epoch / Unix Timestamp Converter"
      description="Convert Unix timestamps (seconds and milliseconds) to human-readable datetimes and back."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-left">
            <div className="rounded-lg border border-border/50 bg-background p-2 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Unix time</span>
              <span className="font-mono text-lg font-bold tracking-tight text-foreground">{liveEpoch}s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={liveEpoch.toString()} label="Copy" />
            <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)} className="h-7 gap-1.5 text-xs">
              {isPlaying ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
          <ToolPanel className="gap-3 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Epoch to Date
              </span>
              <Button variant="ghost" size="sm" onClick={loadCurrentEpoch} className="h-7 text-xs">
                Load current
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={inputEpoch}
                onChange={(e) => setInputEpoch(e.target.value)}
                placeholder="Enter Unix timestamp..."
                className="h-8 flex-1 font-mono text-xs"
              />
              <div className="flex rounded-lg border border-border/50 bg-background/50 p-0.5">
                <Button variant={epochUnit === "s" ? "secondary" : "ghost"} size="sm" onClick={() => setEpochUnit("s")} className="h-7 px-2.5 text-xs">sec</Button>
                <Button variant={epochUnit === "ms" ? "secondary" : "ghost"} size="sm" onClick={() => setEpochUnit("ms")} className="h-7 px-2.5 text-xs">ms</Button>
              </div>
            </div>
            {epochError && (
              <span className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 font-mono text-xs text-destructive">{epochError}</span>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Local</span>
                  <CopyButton value={localDate} />
                </div>
                <input readOnly value={localDate} placeholder="Date string..." className="w-full rounded-lg border border-border/50 bg-background/50 p-2 font-mono text-xs focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>UTC</span>
                  <CopyButton value={utcDate} />
                </div>
                <input readOnly value={utcDate} placeholder="Date string..." className="w-full rounded-lg border border-border/50 bg-background/50 p-2 font-mono text-xs focus:outline-none" />
              </div>
            </div>
          </ToolPanel>

          <ToolPanel className="gap-3 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Date to Epoch
              </span>
              <Button variant="ghost" size="sm" onClick={loadCurrentDate} className="h-7 text-xs">
                Load current
              </Button>
            </div>
            <Input
              type="datetime-local"
              step="1"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="h-8 bg-background/50 font-mono text-xs"
            />
            {dateError && (
              <span className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 font-mono text-xs text-destructive">{dateError}</span>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Seconds</span>
                  <CopyButton value={outSeconds} />
                </div>
                <input readOnly value={outSeconds} placeholder="Seconds..." className="w-full rounded-lg border border-border/50 bg-background/50 p-2 font-mono text-xs focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Milliseconds</span>
                  <CopyButton value={outMilliseconds} />
                </div>
                <input readOnly value={outMilliseconds} placeholder="Milliseconds..." className="w-full rounded-lg border border-border/50 bg-background/50 p-2 font-mono text-xs focus:outline-none" />
              </div>
            </div>
          </ToolPanel>
        </div>
      </div>
    </ToolShell>
  );
};
