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
import { gradeItem, patternNote, wordCount, GradeResult } from "../lib/scoring";
import { DrillItem, ErrorCat } from "../lib/types";

const PRIVATE_LABEL = "Private · Ed only · friend extracts (micro)";

const FOCUS_LABEL: Record<string, string> = {
  "numbers-separators": "Numbers and separators",
  "false-friends": "False friends",
  "names-titles-acronyms": "Names, titles, acronyms",
  "institutions-headlines": "Institutions and headlines",
  "us-spelling": "US spelling",
  "regional-lexicon": "Regional lexicon",
  "quotes-asides": "Quotes and asides",
  register: "Register",
  "technical-precision": "Technical precision",
  "source-defects": "Source defects",
  "pos-syntax": "POS and syntax",
};

type PrivateAccess = "off" | "email" | "open";

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
  const [slots, setSlots] = useState<{ clean: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [privateItems, setPrivateItems] = useState<DrillItem[]>([]);
  const [privateAccess, setPrivateAccess] = useState<PrivateAccess>("off");
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const minutesQuery = one(router.query.minutes);
  const countParam = one(router.query.count);
  const bank = one(router.query.bank);
  const itemId = one(router.query.item);
  const shape = one(router.query.shape);
  const focus = one(router.query.focus);
  const privateSession = bank === "private" || !!itemId?.startsWith("pmd-");
  const minutes = minutesQuery ? Number(minutesQuery) : itemId || bank === "private" ? undefined : bank ? 10 : 15;
  const count = countParam ? Number(countParam) : minutes && minutes <= 10 ? 5 : 8;

  const queue = useMemo(() => {
    if (!router.isReady || !ledger) return [];
    if (privateSession) {
      let pool = privateItems.filter((item) => item.gated);
      if (itemId) return pool.filter((item) => item.id === itemId);
      if (shape === "sentence" || shape === "short-paragraph") {
        pool = pool.filter((item) => item.microShape === shape);
      }
      if (focus) pool = pool.filter((item) => item.focus.includes(focus));
      if (countParam && Number.isFinite(count) && count > 0) pool = pool.slice(0, count);
      return pool;
    }
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
  }, [router.isReady, ledger, bank, count, countParam, itemId, privateSession, privateItems, shape, focus]);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  const loadPrivate = () => {
    fetch("/api/private-micros", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const access = data?.access === "open" || data?.access === "email" ? data.access : "off";
        setPrivateAccess(access);
        setPrivateItems(access === "open" && Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        setPrivateAccess("off");
        setPrivateItems([]);
      });
  };

  useEffect(() => {
    loadPrivate();
  }, []);

  const unlockPrivate = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setUnlockError(null);
    fetch("/api/private-micros", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unlockEmail }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.access !== "open") {
          setUnlockError(typeof data?.error === "string" ? data.error : "This email is not enabled for the private bank.");
          setPrivateItems([]);
          return;
        }
        setPrivateAccess("open");
        setPrivateItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => setUnlockError("This email is not enabled for the private bank."));
  };

  useEffect(() => {
    if (!router.isReady) return;
    sessionId.current = `micro-${Date.now()}`;
    setIndex(0);
    setText("");
    setGrade(null);
    setNote(null);
    setRunning(0);
    setSlots([]);
    setFinished(false);
    setLeft(minutes ? Math.max(1, minutes) * 60 : null);
  }, [router.isReady, bank, count, itemId, minutes, shape, focus, privateSession ? privateItems.length : 0]);

  useEffect(() => {
    if (left === null || finished) return;
    const id = window.setInterval(() => {
      setLeft((s) => (s === null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [left === null, finished]);

  const current = queue[index];
  const completed = slots.length;
  const correct = slots.filter((slot) => slot.clean).length;
  const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;
  const advanceLocked = !!grade?.blocksAdvance;

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
    if (!grade || grade.blocksAdvance) return;
    setSlots((prev) => [...prev, { clean: grade.clean }]);
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

  const privateTags = Array.from(new Set(privateItems.flatMap((item) => item.focus)));
  const privateHref = (next: { shape?: string; focus?: string }) => {
    const params = new URLSearchParams();
    params.set("bank", "private");
    const nextShape = next.shape === undefined ? shape : next.shape;
    const nextFocus = next.focus === undefined ? focus : next.focus;
    if (nextShape === "sentence" || nextShape === "short-paragraph") params.set("shape", nextShape);
    if (nextFocus) params.set("focus", nextFocus);
    return `/practice?${params.toString()}`;
  };

  const title = privateSession
    ? PRIVATE_LABEL
    : !bank
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
      {privateAccess === "open" && privateItems.length ? (
        <p>
          <Link href="/practice?bank=private">{PRIVATE_LABEL}</Link>
          {" · "}
          <Link href={privateHref({ shape: "sentence", focus: focus || "" })}>Sentence</Link>
          {" · "}
          <Link href={privateHref({ shape: "short-paragraph", focus: focus || "" })}>Short paragraph</Link>
          {privateSession ? (
            <label style={{ marginLeft: "0.6rem" }}>
              Focus{" "}
              <select
                value={focus || ""}
                onChange={(event) => {
                  router.push(privateHref({ focus: event.target.value }));
                }}
              >
                <option value="">All traps</option>
                {privateTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {FOCUS_LABEL[tag] || tag}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </p>
      ) : null}
      {privateAccess === "email" ? (
        <form onSubmit={unlockPrivate} style={{ margin: "0 0 1rem", padding: "0.8rem 1rem", background: "#f4f4f4", borderRadius: "8px" }}>
          <strong>Private practice</strong>
          <p style={{ margin: "0.35rem 0" }}>
            Enter the email in PRIVATE_FRIEND_MICROS_EMAIL. Nothing from that bank is listed until it matches.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={unlockEmail}
              onChange={(event) => setUnlockEmail(event.target.value)}
              style={{ padding: "8px 10px", minWidth: "240px" }}
            />
            <button type="submit" style={button("#007bff")}>
              Unlock
            </button>
          </div>
          {unlockError ? <p style={{ color: "#a33", marginBottom: 0 }}>{unlockError}</p> : null}
        </form>
      ) : null}

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
          {current?.gated
            ? `Private · ${current.microShape === "short-paragraph" ? "short paragraph" : "sentence"}`
            : current?.bank || bank || "—"}
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
        <div>
          <strong>Accuracy</strong>
          <br />
          {completed > 0 ? `${accuracy}% (${correct}/${completed})` : "—"}
        </div>
      </div>
      {left === 0 ? <p>Time is up. Grade what is in the box, or move on only if there is no major omission.</p> : null}
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
        <p>
          {!ledger
            ? "Loading the ledger…"
            : privateSession && privateAccess === "email"
              ? "Private practice is locked."
              : "No items in this bank yet."}
        </p>
      ) : (
        <section style={{ border: "2px solid #ddd", padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "6px" }}>
            <strong>Focus:</strong> {current.focus.map((tag) => FOCUS_LABEL[tag] || tag).join(", ")}
            {current.microShape ? (
              <>
                <br />
                <strong>Length:</strong> {current.microShape === "short-paragraph" ? "Short paragraph" : "Sentence"}
              </>
            ) : null}
            {current.sourceLabel ? (
              <>
                <br />
                <strong>Extract:</strong> {current.sourceLabel}
              </>
            ) : null}
            <br />
            <strong>Watch for:</strong> {current.errors_to_catch.join(" · ")}
            {current.why ? (
              <>
                <br />
                <strong>Why this chunk:</strong> {current.why}
              </>
            ) : null}
          </div>
          <div style={{ marginBottom: "1rem", padding: "1.2rem", backgroundColor: "#e8f4fd", borderRadius: "8px" }}>
            <strong>Spanish source</strong>
            <div style={{ fontSize: "18px", whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>{current.spanish}</div>
          </div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.4rem" }}>Your translation</label>
          <ExamTextarea value={text} onChange={setText} disabled={!!grade} rows={current.microShape === "short-paragraph" ? 8 : 5} />
          <div style={{ marginTop: "0.4rem", color: "#444", fontSize: "14px" }}>
            {current.english
              ? `Words: ${wordCount(text)} · reference ${wordCount(current.english)}. Over twice the reference, or under half, is a soft warning only.`
              : `Words: ${wordCount(text)} · source ${wordCount(current.spanish)}. No exact-match key; traps score the rendering.`}
          </div>
          <AllowList />

          {grade ? (
            <div style={{ marginTop: "1.2rem" }}>
              <MicroGrade
                grade={grade}
                patternNote={note}
                ask={{
                  spanish: current.spanish,
                  candidate: text,
                  reference: current.english || undefined,
                  traps: current.traps,
                }}
              />
              {current.coachHint ? (
                <div style={{ marginTop: "0.8rem", padding: "1rem", background: "#e8f6ee", borderRadius: "8px" }}>
                  <strong>Coach hint</strong>
                  <div style={{ color: "#333", marginTop: "0.2rem" }}>Not a model key. The traps above scored the rendering.</div>
                  <div style={{ fontSize: "18px", marginTop: "0.3rem" }}>{current.coachHint}</div>
                </div>
              ) : current.english ? (
                <div style={{ marginTop: "0.8rem", padding: "1rem", background: "#e8f6ee", borderRadius: "8px" }}>
                  <strong>Reference</strong>
                  <div style={{ fontSize: "18px", marginTop: "0.3rem" }}>{current.english}</div>
                </div>
              ) : null}
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
                <button onClick={goNext} disabled={advanceLocked} style={button(advanceLocked ? "#6c757d" : "#28a745")}>
                  {advanceLocked
                    ? "Omission — fix before next"
                    : index < queue.length - 1
                      ? "Save and next"
                      : "Save and finish"}
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
      <p style={{ color: "#666", fontSize: "13px" }}>
        {privateItems.length
          ? `${MICROS.length} micros in the public banks. ${privateItems.length} private items on this browser.`
          : `${MICROS.length} micros in the banks. Metadata is stored on each item.`}
      </p>
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
