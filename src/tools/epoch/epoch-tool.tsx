import React, { useState, useEffect } from "react";
import { CopyButton } from "@/components/shared/copy-button";
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
    <div className="flex flex-col gap-6 w-full px-4 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Epoch / Unix Timestamp Converter</h1>
        <p className="text-sm text-muted-foreground">
          Convert Unix timestamps (seconds & milliseconds) to human-readable datetime formats and vice versa.
        </p>
      </div>

      {/* Live Counter Display */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="p-2.5 bg-primary/10 rounded-full border border-primary/20 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Unix Epoch Time</span>
            <span className="font-mono text-xl font-bold text-foreground tracking-tight">{liveEpoch} seconds</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CopyButton value={liveEpoch.toString()} label="Copy Epoch" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-9 gap-1.5"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pause Ticker
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Resume Ticker
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Two Column Layout: Epoch-to-Date & Date-to-Epoch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Epoch to Date */}
        <div className="p-5 rounded-xl border border-border bg-card text-left flex flex-col gap-4 min-h-[350px]">
          <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              Epoch to Date
            </span>
            <Button variant="ghost" size="sm" onClick={loadCurrentEpoch} className="h-8 text-xs text-primary hover:bg-primary/5">
              Load Current
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={inputEpoch}
                onChange={(e) => setInputEpoch(e.target.value)}
                placeholder="Enter Unix timestamp..."
                className="font-mono text-xs h-9"
              />
            </div>
            <div className="flex bg-muted/40 border border-border/40 p-0.5 rounded-lg">
              <Button
                variant={epochUnit === "s" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setEpochUnit("s")}
                className="h-8 text-xs px-2.5"
              >
                sec
              </Button>
              <Button
                variant={epochUnit === "ms" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setEpochUnit("ms")}
                className="h-8 text-xs px-2.5"
              >
                ms
              </Button>
            </div>
          </div>

          {epochError && (
            <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-mono">
              {epochError}
            </span>
          )}

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Local Timezone</span>
                <CopyButton value={localDate} />
              </div>
              <input
                readOnly
                value={localDate}
                placeholder="Date string..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>UTC Timezone</span>
                <CopyButton value={utcDate} />
              </div>
              <input
                readOnly
                value={utcDate}
                placeholder="Date string..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Date to Epoch */}
        <div className="p-5 rounded-xl border border-border bg-card text-left flex flex-col gap-4 min-h-[350px]">
          <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-sky-500" />
              Date to Epoch
            </span>
            <Button variant="ghost" size="sm" onClick={loadCurrentDate} className="h-8 text-xs text-sky-500 hover:bg-sky-505">
              Load Current
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <Input
              type="datetime-local"
              step="1"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="font-mono text-xs h-9 bg-background/50"
            />
            <span className="text-[10px] text-muted-foreground pl-1.5 mt-0.5">Supports ISO date/time parser: e.g. YYYY-MM-DDTHH:mm:ss</span>
          </div>

          {dateError && (
            <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-mono">
              {dateError}
            </span>
          )}

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Seconds Timestamp (10 digits)</span>
                <CopyButton value={outSeconds} />
              </div>
              <input
                readOnly
                value={outSeconds}
                placeholder="Seconds..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Milliseconds Timestamp (13 digits)</span>
                <CopyButton value={outMilliseconds} />
              </div>
              <input
                readOnly
                value={outMilliseconds}
                placeholder="Milliseconds..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
