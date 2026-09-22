import { CATEGORIES, ErrorCat } from "./types";

export type MarkSnap = {
  trapId: string;
  category: ErrorCat;
  weight: number;
  lemma?: string;
  pitfall: string;
};

export type LedgerEvent = {
  id: string;
  at: string;
  day: string;
  kind: "micro" | "passage";
  itemId: string;
  bank?: string;
  points: number;
  marks: MarkSnap[];
};

export type Ledger = {
  version: 1;
  events: LedgerEvent[];
};

const KEY = "ata-es-en-ledger-v1";

export function emptyLedger(): Ledger {
  return { version: 1, events: [] };
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadLedger(): Ledger {
  if (typeof window === "undefined") return emptyLedger();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw) as Ledger;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.events)) return emptyLedger();
    return parsed;
  } catch {
    return emptyLedger();
  }
}

export function saveLedger(ledger: Ledger): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ledger));
}

export function recordEvent(ledger: Ledger, event: LedgerEvent): Ledger {
  const events = ledger.events.filter((e) => e.id !== event.id);
  events.push(event);
  return { version: 1, events: events.slice(-400) };
}

export function categoryCounts(ledger: Ledger): Record<ErrorCat, number> {
  const counts = {} as Record<ErrorCat, number>;
  for (const c of CATEGORIES) counts[c] = 0;
  for (const event of ledger.events) {
    for (const mark of event.marks) counts[mark.category] += 1;
  }
  return counts;
}

export function trapHeat(ledger: Ledger): Record<string, number> {
  const heat: Record<string, number> = {};
  for (const event of ledger.events) {
    for (const mark of event.marks) heat[mark.trapId] = (heat[mark.trapId] ?? 0) + 1;
  }
  return heat;
}

export function lemmaCounts(ledger: Ledger): { lemma: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const event of ledger.events) {
    for (const mark of event.marks) {
      if (!mark.lemma) continue;
      counts[mark.lemma] = (counts[mark.lemma] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([lemma, count]) => ({ lemma, count }))
    .sort((a, b) => b.count - a.count);
}

const TIE_BREAK: ErrorCat[] = ["O", "P", "T", "SP", "U", "SYN", "G", "A", "IND"];

export function weakestCategory(ledger: Ledger): ErrorCat {
  const counts = categoryCounts(ledger);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) return "O";
  let best: ErrorCat = "O";
  let bestN = -1;
  for (const cat of TIE_BREAK) {
    const n = counts[cat];
    if (n > bestN) {
      best = cat;
      bestN = n;
    }
  }
  return best;
}

function shiftDay(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function recentDays(now: Date, n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(dayKey(shiftDay(now, -i)));
  return days;
}

export type SparkPoint = { day: string; points: number | null };

export function passageSparkline(ledger: Ledger, now: Date): SparkPoint[] {
  return recentDays(now, 14).map((day) => {
    const passages = ledger.events.filter((e) => e.kind === "passage" && e.day === day);
    if (!passages.length) return { day, points: null };
    const points = Math.round(passages.reduce((s, e) => s + e.points, 0) / passages.length);
    return { day, points };
  });
}

export function averagePassagePoints(ledger: Ledger, now: Date): number | null {
  const days = new Set(recentDays(now, 14));
  const passages = ledger.events.filter((e) => e.kind === "passage" && days.has(e.day));
  if (!passages.length) return null;
  return Math.round(passages.reduce((s, e) => s + e.points, 0) / passages.length);
}

function countCategory(ledger: Ledger, category: ErrorCat, days: Set<string>): number {
  let n = 0;
  for (const event of ledger.events) {
    if (!days.has(event.day)) continue;
    for (const mark of event.marks) if (mark.category === category) n += 1;
  }
  return n;
}

export function weekChange(ledger: Ledger, now: Date, category: ErrorCat): { recent: number; previous: number } {
  const recent = new Set(recentDays(now, 7));
  const previous = new Set(recentDays(shiftDay(now, -7), 7));
  return {
    recent: countCategory(ledger, category, recent),
    previous: countCategory(ledger, category, previous),
  };
}

export function posDriftInLast(ledger: Ledger, limit = 20): { attempts: number; fires: number } {
  const attempts = ledger.events.filter((e) => e.bank === "POS" || e.itemId.startsWith("pos-")).slice(-limit);
  const fires = attempts.filter((e) => e.marks.some((m) => m.pitfall === "POS drift on noun heads")).length;
  return { attempts: attempts.length, fires };
}

export function todayMarks(ledger: Ledger, now: Date): MarkSnap[] {
  const day = dayKey(now);
  return ledger.events.filter((e) => e.day === day).flatMap((e) => e.marks);
}

export function allMarks(ledger: Ledger): MarkSnap[] {
  return ledger.events.flatMap((e) => e.marks);
}
