import React, { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, CalendarRange } from "lucide-react";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number) => {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1];
};

const daysInYear = (year: number) => (isLeapYear(year) ? 366 : 365);

const pad2 = (n: number) => n.toString().padStart(2, "0");
const pad3 = (n: number) => n.toString().padStart(3, "0");

const weekdayFromYmd = (year: number, month: number, day: number) => {
  // Sakamoto's method — calendar weekday without Date timezone surprises
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
};

type ParsedDate = {
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
};

const gregorianToOrdinal = (year: number, month: number, day: number): ParsedDate => {
  if (year < 1 || year > 9999) throw new Error("Year must be between 0001 and 9999");
  if (month < 1 || month > 12) throw new Error("Month must be between 01 and 12");
  const dim = daysInMonth(year, month);
  if (day < 1 || day > dim) throw new Error(`Day must be between 01 and ${pad2(dim)} for this month`);

  let dayOfYear = day;
  for (let m = 1; m < month; m++) {
    dayOfYear += daysInMonth(year, m);
  }
  return { year, month, day, dayOfYear };
};

const ordinalToGregorian = (year: number, dayOfYear: number): ParsedDate => {
  if (year < 1 || year > 9999) throw new Error("Year must be between 0001 and 9999");
  const max = daysInYear(year);
  if (dayOfYear < 1 || dayOfYear > max) {
    throw new Error(`Day of year must be between 001 and ${pad3(max)}${isLeapYear(year) ? " (leap year)" : ""}`);
  }

  let remaining = dayOfYear;
  for (let month = 1; month <= 12; month++) {
    const dim = daysInMonth(year, month);
    if (remaining <= dim) {
      return { year, month, day: remaining, dayOfYear };
    }
    remaining -= dim;
  }
  throw new Error("Could not map ordinal date");
};

const parseJulianInput = (raw: string): ParsedDate => {
  const trimmed = raw.trim().replace(/\s+/g, "");
  const match = trimmed.match(/^(\d{4})[-/.]?(\d{1,3})$/);
  if (!match) {
    throw new Error("Use yyyyDDD or yyyy-DDD (e.g. 2026228 or 2026-228)");
  }
  return ordinalToGregorian(parseInt(match[1], 10), parseInt(match[2], 10));
};

const parseGregorianInput = (raw: string): ParsedDate => {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) {
    throw new Error("Use yyyy-mm-dd (e.g. 2026-08-16)");
  }
  return gregorianToOrdinal(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10));
};

const formatGregorian = (d: ParsedDate) => `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
const formatJulianCompact = (d: ParsedDate) => `${d.year}${pad3(d.dayOfYear)}`;
const formatJulianDashed = (d: ParsedDate) => `${d.year}-${pad3(d.dayOfYear)}`;

const todayLocal = (): ParsedDate => {
  const now = new Date();
  return gregorianToOrdinal(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

const DateFacts: React.FC<{ date: ParsedDate | null }> = ({ date }) => {
  if (!date) return null;
  const weekday = WEEKDAYS[weekdayFromYmd(date.year, date.month, date.day)];
  const leap = isLeapYear(date.year);
  const yearLen = daysInYear(date.year);
  const remaining = yearLen - date.dayOfYear;
  const pct = Math.round((date.dayOfYear / yearLen) * 100);

  return (
    <div className="flex flex-col gap-3 mt-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Weekday</div>
          <div className="text-xs font-bold font-mono mt-0.5">{weekday}</div>
        </div>
        <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Year type</div>
          <div className="text-xs font-bold font-mono mt-0.5">{leap ? "Leap (366 days)" : "Common (365 days)"}</div>
        </div>
        <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Long form</div>
          <div className="text-xs font-bold font-mono mt-0.5">
            {MONTHS[date.month - 1]} {date.day}, {date.year}
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Days remaining</div>
          <div className="text-xs font-bold font-mono mt-0.5">{remaining} of {yearLen}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span>Day {date.dayOfYear} of {yearLen}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

export const JulianTool: React.FC = () => {
  const today = useMemo(() => todayLocal(), []);

  const [julianInput, setJulianInput] = useState(formatJulianCompact(today));
  const [gregorianFromJulian, setGregorianFromJulian] = useState(formatGregorian(today));
  const [julianDashed, setJulianDashed] = useState(formatJulianDashed(today));
  const [julianParsed, setJulianParsed] = useState<ParsedDate | null>(today);
  const [julianError, setJulianError] = useState<string | null>(null);

  const [gregorianInput, setGregorianInput] = useState(formatGregorian(today));
  const [julianFromGregorian, setJulianFromGregorian] = useState(formatJulianCompact(today));
  const [julianDashedFromGregorian, setJulianDashedFromGregorian] = useState(formatJulianDashed(today));
  const [gregorianParsed, setGregorianParsed] = useState<ParsedDate | null>(today);
  const [gregorianError, setGregorianError] = useState<string | null>(null);

  useEffect(() => {
    if (!julianInput.trim()) {
      setGregorianFromJulian("");
      setJulianDashed("");
      setJulianParsed(null);
      setJulianError(null);
      return;
    }
    try {
      const parsed = parseJulianInput(julianInput);
      setJulianError(null);
      setJulianParsed(parsed);
      setGregorianFromJulian(formatGregorian(parsed));
      setJulianDashed(formatJulianDashed(parsed));
    } catch (err: unknown) {
      setJulianError(err instanceof Error ? err.message : "Invalid Julian date");
      setGregorianFromJulian("");
      setJulianDashed("");
      setJulianParsed(null);
    }
  }, [julianInput]);

  useEffect(() => {
    if (!gregorianInput.trim()) {
      setJulianFromGregorian("");
      setJulianDashedFromGregorian("");
      setGregorianParsed(null);
      setGregorianError(null);
      return;
    }
    try {
      const parsed = parseGregorianInput(gregorianInput);
      setGregorianError(null);
      setGregorianParsed(parsed);
      setJulianFromGregorian(formatJulianCompact(parsed));
      setJulianDashedFromGregorian(formatJulianDashed(parsed));
    } catch (err: unknown) {
      setGregorianError(err instanceof Error ? err.message : "Invalid Gregorian date");
      setJulianFromGregorian("");
      setJulianDashedFromGregorian("");
      setGregorianParsed(null);
    }
  }, [gregorianInput]);

  return (
    <div className="flex flex-col gap-6 w-full px-4 py-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Julian Date Converter</h1>
        <p className="text-sm text-muted-foreground">
          Convert ordinal Julian dates (<span className="font-mono">yyyyDDD</span>) to Gregorian (<span className="font-mono">yyyy-mm-dd</span>) and back. Day 001 is January 1.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="p-2.5 bg-primary/10 rounded-full border border-primary/20 text-primary">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s ordinal date</span>
            <span className="font-mono text-xl font-bold text-foreground tracking-tight">
              {formatJulianCompact(today)}
              <span className="text-sm font-semibold text-muted-foreground ml-2">
                {formatGregorian(today)} · {WEEKDAYS[weekdayFromYmd(today.year, today.month, today.day)]}
              </span>
            </span>
          </div>
        </div>
        <CopyButton value={formatJulianCompact(today)} label="Copy yyyyDDD" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="p-5 rounded-xl border border-border bg-card text-left flex flex-col gap-4 min-h-[380px]">
          <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4 text-primary" />
              Julian to Gregorian
            </span>
            <Button variant="ghost" size="sm" onClick={() => setJulianInput(formatJulianCompact(today))} className="h-8 text-xs text-primary hover:bg-primary/5">
              Load Today
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ordinal date (yyyyDDD)</span>
            <Input
              value={julianInput}
              onChange={(e) => setJulianInput(e.target.value)}
              placeholder="2026228 or 2026-228"
              className="font-mono text-xs h-9"
            />
            <span className="text-[10px] text-muted-foreground pl-1.5 mt-0.5">Accepts 2026228, 2026-228, or 2026.228</span>
          </div>

          {julianError && (
            <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-mono">
              {julianError}
            </span>
          )}

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Gregorian (yyyy-mm-dd)</span>
                <CopyButton value={gregorianFromJulian} />
              </div>
              <input
                readOnly
                value={gregorianFromJulian}
                placeholder="yyyy-mm-dd..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Dashed ordinal (yyyy-DDD)</span>
                <CopyButton value={julianDashed} />
              </div>
              <input
                readOnly
                value={julianDashed}
                placeholder="yyyy-DDD..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>
          </div>

          <DateFacts date={julianParsed} />
        </div>

        <div className="p-5 rounded-xl border border-border bg-card text-left flex flex-col gap-4 min-h-[380px]">
          <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-sky-500" />
              Gregorian to Julian
            </span>
            <Button variant="ghost" size="sm" onClick={() => setGregorianInput(formatGregorian(today))} className="h-8 text-xs text-sky-500 hover:bg-sky-500/5">
              Load Today
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gregorian date (yyyy-mm-dd)</span>
            <Input
              type="date"
              value={gregorianInput}
              onChange={(e) => setGregorianInput(e.target.value)}
              className="font-mono text-xs h-9 bg-background/50"
            />
            <span className="text-[10px] text-muted-foreground pl-1.5 mt-0.5">Pick a date or type yyyy-mm-dd</span>
          </div>

          {gregorianError && (
            <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-mono">
              {gregorianError}
            </span>
          )}

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Julian compact (yyyyDDD)</span>
                <CopyButton value={julianFromGregorian} />
              </div>
              <input
                readOnly
                value={julianFromGregorian}
                placeholder="yyyyDDD..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Dashed ordinal (yyyy-DDD)</span>
                <CopyButton value={julianDashedFromGregorian} />
              </div>
              <input
                readOnly
                value={julianDashedFromGregorian}
                placeholder="yyyy-DDD..."
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-border/30 bg-muted/20 focus:outline-none"
              />
            </div>
          </div>

          <DateFacts date={gregorianParsed} />
        </div>
      </div>
    </div>
  );
};
