import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AllowList, ExamTextarea } from "../components/ExamEditor";
import { MicroGrade, PassLineMeter, ScaleLegend } from "../components/GradePanel";
import { corePractice, MICROS, selectMicros } from "../lib/drills";
import {
  allMarks,
  dayKey,
  loadLedger,
  recordEvent,
  saveLedger,
  todayMarks,
  trapHeat,
  weakestCategory,
  Ledger,
} from "../lib/ledger";
import { gradeItem, patternNote, GradeResult } from "../lib/scoring";
import { ErrorCat } from "../lib/types";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function Practice() {
  const router = useRouter();
  const sessionId = useRef(`micro-${Date.now()}`);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [running, setRunning] = useState(0);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  const minutesQuery = one(router.query.minutes);
  const minutes = minutesQuery ? Number(minutesQuery) : undefined;
  const countParam = one(router.query.count);
  const count = countParam ? Number(countParam) : minutes && minutes <= 10 ? 5 : 8;
  const bank = one(router.query.bank);
  const itemId = one(router.query.item);

  const queue = useMemo(() => {
    if (!router.isReady || !ledger) return [];
    if (!bank && !itemId) return corePractice();
    const today = todayMarks(ledger, new Date());
    return selectMicros({
      bank,
      count: Number.isFinite(count) && count > 0 ? count : 5,
      itemId,
      heat: trapHeat(ledger),
      weakest: weakestCategory(ledger),
      todayTrapIds: today.map((m) => m.trapId),
      todayPitfalls: today.map((m) => m.pitfall),
      todayLemmas: today.map((m) => m.lemma || ""),
      todayCategories: today.map((m) => m.category as ErrorCat),
    });
  }, [router.isReady, ledger, bank, count, itemId]);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    sessionId.current = `micro-${Date.now()}`;
    setIndex(0);
    setText("");
    setGrade(null);
    setNote(null);
    setRunning(0);
    setFinished(false);
    setLeft(minutes ? Math.max(1, minutes) * 60 : null);
  }, [router.isReady, bank, count, itemId, minutes]);

  useEffect(() => {
    if (left === null || finished) return;
    const id = window.setInterval(() => {
      setLeft((s) => (s === null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [left === null, finished]);

  const current = queue[index];

  const analyze = () => {
    if (!current || !ledger) return;
    const result = gradeItem(current, text, { mode: "micro" });
    const prior = allMarks(ledger);
    setGrade(result);
    setNote(patternNote(result.fired, prior));
  };

  const persist = (result: GradeResult) => {
    if (!current || !ledger) return ledger;
    const next = recordEvent(ledger, {
      id: `${sessionId.current}:${current.id}`,
      at: new Date().toISOString(),
      day: dayKey(new Date()),
      kind: "micro",
      itemId: current.id,
      bank: current.bank,
      points: result.points,
      marks: result.fired.map((f) => ({
        trapId: f.trapId,
        category: f.category,
        weight: f.weight,
        lemma: f.lemma,
        pitfall: f.pitfall,
      })),
    });
    saveLedger(next);
    setLedger(next);
    return next;
  };

  const goNext = () => {
    if (!grade) return;
    persist(grade);
    const nextRunning = running + grade.points;
    setRunning(nextRunning);
    if (index >= queue.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setText("");
    setGrade(null);
    setNote(null);
  };

  const title = !bank
    ? "Capitalization, punctuation, and formatting"
    : bank === "P"
      ? "P micro-drill"
      : bank === "O"
        ? "O micro-drill"
        : bank === "POS"
          ? "POS micro-drill"
          : bank === "titles"
            ? "Titles and caps"
            : bank === "today"
              ? "Micros from today's traps"
              : bank === "weak"
                ? "Micros from the weakest category"
                : "Micro-drill";

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Professional Translation Practice</h1>
      <h2>
        {title}
        {minutes ? ` · ${minutes} min` : ""}
      </h2>
      <p>
        <Link href="/practice">The 15</Link>
        {" · "}
        <Link href="/practice?bank=P&minutes=10">10-min P</Link>
        {" · "}
        <Link href="/practice?bank=O&minutes=10">10-min O</Link>
        {" · "}
        <Link href="/practice?bank=POS&minutes=10">POS</Link>
        {" · "}
        <Link href="/passage?minutes=90">90-min passage</Link>
        {" · "}
        <Link href="/">Today</Link>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
          marginBottom: "1.2rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <div>
          <strong>Progress</strong>
          <br />
          {queue.length ? `${Math.min(index + 1, queue.length)}/${queue.length}` : "—"}
        </div>
        <div>
          <strong>Bank</strong>
          <br />
          {current?.bank || bank}
        </div>
        <div>
          <strong>Domain</strong>
          <br />
          {current?.domain || "—"}
        </div>
        <div>
          <strong>Level</strong>
          <br />
          {current?.level || "—"}
        </div>
        <div>
          <strong>Clock</strong>
          <br />
          {left === null ? "—" : left === 0 ? "Time is up" : formatClock(left)}
        </div>
      </div>
      <PassLineMeter points={running + (grade?.points || 0)} />

      {finished ? (
        <section style={{ border: "2px solid #ddd", padding: "1.5rem", borderRadius: "12px" }}>
          <h3>Session saved to the ledger</h3>
          <p>
            {queue.length} items. Session error points: {running}.
          </p>
          <p>The next drill on the home screen reads this ledger and opens the heaviest category.</p>
          <p>
            <Link href="/">Back to the ledger</Link>
            {" · "}
            <Link href="/practice?bank=today&minutes=10&count=3">Three micros on these traps</Link>
          </p>
        </section>
      ) : !current ? (
        <p>{ledger ? "No items in this bank yet." : "Loading the ledger…"}</p>
      ) : (
        <section style={{ border: "2px solid #ddd", padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "6px" }}>
            <strong>Focus:</strong> {current.focus.join(", ")}
            <br />
            <strong>Watch for:</strong> {current.errors_to_catch.join(" · ")}
          </div>
          <div style={{ marginBottom: "1rem", padding: "1.2rem", backgroundColor: "#e8f4fd", borderRadius: "8px" }}>
            <strong>Spanish source</strong>
            <div style={{ fontSize: "18px", whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>{current.spanish}</div>
          </div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.4rem" }}>Your translation</label>
          <ExamTextarea value={text} onChange={setText} disabled={!!grade} rows={5} />
          <AllowList />

          {grade ? (
            <div style={{ marginTop: "1.2rem" }}>
              <MicroGrade grade={grade} patternNote={note} />
              <div style={{ marginTop: "0.8rem", padding: "1rem", background: "#e8f6ee", borderRadius: "8px" }}>
                <strong>Reference</strong>
                <div style={{ fontSize: "18px", marginTop: "0.3rem" }}>{current.english}</div>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {!grade ? (
              <button
                onClick={analyze}
                disabled={!text.trim()}
                style={button(text.trim() ? "#007bff" : "#6c757d")}
              >
                Grade traps
              </button>
            ) : (
              <>
                <button onClick={goNext} style={button("#28a745")}>
                  {index < queue.length - 1 ? "Save and next" : "Save and finish"}
                </button>
                <button
                  onClick={() => {
                    setText("");
                    setGrade(null);
                    setNote(null);
                  }}
                  style={button("#ffc107", "#212529")}
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </section>
      )}
      <ScaleLegend />
      <p style={{ color: "#666", fontSize: "13px" }}>{MICROS.length} micros in the banks. Metadata is stored on each item.</p>
    </div>
  );
}

function button(background: string, color = "white") {
  return {
    padding: "12px 22px",
    fontSize: "16px",
    fontWeight: "bold" as const,
    backgroundColor: background,
    color,
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };
}
