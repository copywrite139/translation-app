import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { AllowList, ExamTextarea } from "../components/ExamEditor";
import { PassageGradeView, ScaleLegend } from "../components/GradePanel";
import { PASSAGE } from "../lib/drills";
import { allMarks, dayKey, loadLedger, recordEvent, saveLedger, Ledger } from "../lib/ledger";
import { gradePassage, patternNote, splitEnglishSentences, wordCount, PassageGrade } from "../lib/scoring";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const CHECKS = [
  "Omissions vs source",
  "US punctuation (IEGS)",
  "English-only read (source covered)",
  "Names / numbers / dates",
  "No alternatives left in the box",
  "POS/job check on titles and noun heads",
];

export default function PassagePage() {
  const router = useRouter();
  const minutes = Math.max(35, Number(one(router.query.minutes) || 90));
  const proofRequested = one(router.query.proof) === "1";
  const part = one(router.query.part);
  const proofWindow = minutes >= 90 ? 25 * 60 : 20 * 60;
  const storageKey = `ata-passage-clock-${PASSAGE.id}-${minutes}-${part || "all"}-${proofRequested ? "proof" : "draft"}`;

  const sentences = useMemo(() => {
    if (part === "1") return PASSAGE.sentences.slice(0, Math.ceil(PASSAGE.sentences.length / 2));
    if (part === "2") return PASSAGE.sentences.slice(Math.ceil(PASSAGE.sentences.length / 2));
    return PASSAGE.sentences;
  }, [part]);

  const source = sentences.map((s) => s.spanish).join(" ");
  const [text, setText] = useState("");
  const [left, setLeft] = useState(minutes * 60);
  const [proofLock, setProofLock] = useState(proofRequested);
  const [snapshotWords, setSnapshotWords] = useState(0);
  const [hardStop, setHardStop] = useState(false);
  const [sourceHidden, setSourceHidden] = useState(proofRequested);
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false));
  const [grade, setGrade] = useState<PassageGrade | null>(null);
  const [gradedText, setGradedText] = useState("");
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    setLedger(loadLedger());
    const saved = window.sessionStorage.getItem(storageKey);
    const now = Date.now();
    if (saved) {
      const start = Number(saved);
      setStartedAt(start);
      setLeft(Math.max(0, minutes * 60 - Math.floor((now - start) / 1000)));
    } else {
      window.sessionStorage.setItem(storageKey, String(now));
      setStartedAt(now);
      setLeft(minutes * 60);
    }
  }, [storageKey, minutes]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(Math.max(0, minutes * 60 - Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [minutes, startedAt]);

  useEffect(() => {
    if (!proofLock && left <= proofWindow) {
      setProofLock(true);
      setSnapshotWords(wordCount(text));
    }
  }, [left, proofLock, proofWindow, text]);

  const wordsNow = wordCount(text);
  const draftingHard = proofLock && snapshotWords > 0 && wordsNow > snapshotWords + 25;
  const aligned = splitEnglishSentences(text).length === sentences.length;

  const onChange = (next: string) => {
    if (proofLock && snapshotWords > 0 && wordCount(next) > snapshotWords + 50) {
      setHardStop(true);
      return;
    }
    setHardStop(false);
    setText(next);
  };

  const startProof = () => {
    setProofLock(true);
    setSnapshotWords(wordCount(text));
    setSourceHidden(true);
  };

  const gradeNow = () => {
    const view = {
      ...PASSAGE,
      spanish: source,
      english: sentences.map((s) => s.english).join(" "),
      sentences,
    };
    const result = gradePassage(view, text);
    const prior = ledger ? allMarks(ledger) : [];
    result.patternNote = patternNote(result.fired, prior);
    setGradedText(text);
    setGrade(result);
    if (ledger) {
      const next = recordEvent(ledger, {
        id: `passage-${startedAt}-${part || "all"}`,
        at: new Date().toISOString(),
        day: dayKey(new Date()),
        kind: "passage",
        itemId: part ? `${PASSAGE.id}-${part}` : PASSAGE.id,
        bank: "passage",
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
    }
  };

  const checksDone = checks.every(Boolean);
  const ti = PASSAGE.translationInstructions;

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>{part ? `Half passage ${part}` : `${minutes}-minute passage`}</h1>
      <p>
        {PASSAGE.title} · {wordCount(source)} Spanish words on this screen
        {part ? ` (full passage is ${PASSAGE.wordCount})` : ` · full passage ${PASSAGE.wordCount}`} · {minutes} min
        clock · proof lock in the last {Math.round(proofWindow / 60)} min
      </p>
      <p>
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/passage?minutes=90">Full 90</Link>
        {" · "}
        <Link href="/passage?minutes=70">70-minute sitting</Link>
        {" · "}
        <Link href="/passage?minutes=35&part=1">Half 1 (35 min)</Link>
        {" · "}
        <Link href="/passage?minutes=35&part=2">Half 2 (35 min)</Link>
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <strong style={{ fontSize: "28px", fontVariantNumeric: "tabular-nums" }}>{formatClock(left)}</strong>
        <span>{proofLock ? "PROOF LOCK" : "Drafting"}</span>
      </div>

      <section style={{ margin: "1rem 0", padding: "1rem", background: "#f4f1ea", borderRadius: "8px" }}>
        <strong>Translation instructions</strong>
        <div>Source: {ti.sourceMedium}</div>
        <div>Target: {ti.targetMedium}</div>
        <div>Purpose: {ti.purpose}</div>
        <div>Audience: {ti.audience}</div>
      </section>

      {sourceHidden ? (
        <div style={{ padding: "1rem", background: "#222", color: "#fff", borderRadius: "8px" }}>
          Source covered. Read the English alone.
          <div>
            <button onClick={() => setSourceHidden(false)} style={smallButton}>
              Show source
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "1rem 1.1rem", background: "#e8f4fd", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
          {source}
          <div>
            <button onClick={() => setSourceHidden(true)} style={smallButton}>
              Cover source
            </button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: "18px" }}>English</h2>
      <ExamTextarea value={text} onChange={onChange} rows={16} />
      <AllowList />
      {hardStop ? (
        <p style={{ color: "#8b1e1e", fontWeight: "bold" }}>
          Proof lock refused that paste. It adds more than 50 words after the lock. Fix what is already there.
        </p>
      ) : null}
      {draftingHard ? (
        <p style={{ color: "#8b1e1e", fontWeight: "bold" }}>
          Proof lock: this looks like new drafting (more than 25 words since the lock). Stop and proof.
        </p>
      ) : null}

      <div style={{ marginTop: "1rem" }}>
        {!proofLock ? (
          <button onClick={startProof} style={smallButton}>
            Start proof early
          </button>
        ) : (
          <ol>
            {CHECKS.map((label, i) => (
              <li key={label} style={{ margin: "0.35rem 0" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) => {
                      const next = checks.slice();
                      next[i] = e.target.checked;
                      if (i === 2 && e.target.checked) setSourceHidden(true);
                      setChecks(next);
                    }}
                  />{" "}
                  {label}
                </label>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button onClick={gradeNow} disabled={proofLock && !checksDone} style={{ marginTop: "0.6rem", ...smallButton, opacity: proofLock && !checksDone ? 0.5 : 1 }}>
        {proofLock ? "Grade passage" : "Grade before the proof lock"}
      </button>
      {proofLock && !checksDone ? <p>Tick the six proof checks before grading.</p> : null}
      {!aligned && text.trim() ? (
        <p>Sentence breaks do not match the source. Grading will check each sentence's traps on the full English.</p>
      ) : null}

      {grade ? (
        <div style={{ marginTop: "1.2rem" }}>
          <PassageGradeView
            grade={grade}
            ask={passageAsk(source, gradedText, sentences)}
          />
          <p>
            Saved to the ledger. <Link href="/practice?bank=today&minutes=10&count=3">Three micros on these traps</Link>
          </p>
        </div>
      ) : null}
      <ScaleLegend />
    </div>
  );
}

function passageAsk(
  source: string,
  gradedText: string,
  sentences: { id: string; english: string; traps: (typeof PASSAGE.sentences)[number]["traps"] }[]
) {
  const parts = splitEnglishSentences(gradedText);
  const aligned = parts.length === sentences.length;
  return {
    source,
    candidate: gradedText,
    reference: sentences.map((s) => s.english).join(" "),
    sentences: sentences.map((s, i) => ({
      id: s.id,
      traps: s.traps,
      candidate: aligned ? parts[i] : gradedText,
    })),
  };
}

const smallButton = {
  padding: "10px 16px",
  fontSize: "15px",
  background: "#222",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
