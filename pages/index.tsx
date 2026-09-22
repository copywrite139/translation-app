import Link from "next/link";
import { useEffect, useState } from "react";
import { bankCounts } from "../lib/drills";
import {
  averagePassagePoints,
  categoryCounts,
  lemmaCounts,
  loadLedger,
  passageSparkline,
  posDriftInLast,
  weakestCategory,
  weekChange,
  Ledger,
} from "../lib/ledger";
import { daysUntilExam, todayPlan, WEEKLY_NOTE } from "../lib/plan";
import { CATEGORY_NAME, PASS_LINE } from "../lib/types";

export default function Home() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    setLedger(loadLedger());
  }, []);

  if (!now || !ledger) {
    return (
      <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "980px", margin: "0 auto" }}>
        <h1>Spanish into English</h1>
        <p>Loading today's plan and the error ledger…</p>
      </div>
    );
  }

  const loaded = ledger;
  const weakest = weakestCategory(loaded);
  const plan = todayPlan(now, weakest);
  const counts = categoryCounts(loaded);
  const spark = passageSparkline(loaded, now);
  const avg = averagePassagePoints(loaded, now);
  const oWeek = weekChange(loaded, now, "O");
  const pWeek = weekChange(loaded, now, "P");
  const pos = posDriftInLast(loaded, 20);
  const lemmas = lemmaCounts(loaded).slice(0, 6);
  const banks = bankCounts();
  const days = daysUntilExam(now);
  const maxBar = Math.max(17, ...spark.map((p) => p.points ?? 0));

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "980px", margin: "0 auto" }}>
      <h1>Spanish into English</h1>
      <p>
        ATA practice. Pass line {PASS_LINE} per passage. Exam 28 October 2026, in person, Hyatt Regency San Francisco.
        {days >= 0 ? ` ${days} days left.` : ""}
      </p>

      <section style={{ marginTop: "1.4rem" }}>
        <h2>Today · {plan.kind}</h2>
        <p>Two hours. The blocks below are the whole day.</p>
        <div style={{ display: "grid", gap: "0.8rem" }}>
          {plan.blocks.map((block) => (
            <Link key={block.id} href={block.href} style={{ textDecoration: "none", color: "inherit" }}>
              <article style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "0.9rem 1rem" }}>
                <strong>
                  {block.id} · {block.minutes} min · {block.title}
                </strong>
                <div style={{ marginTop: "0.3rem" }}>{block.detail}</div>
              </article>
            </Link>
          ))}
        </div>
        <p style={{ color: "#444" }}>{WEEKLY_NOTE}</p>
      </section>

      <section style={{ marginTop: "1.2rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <Link href="/practice">Practice</Link>
        <Link href="/practice?bank=P&minutes=10">10-minute P micro</Link>
        <Link href="/practice?bank=O&minutes=10">10-minute O micro</Link>
        <Link href="/practice?bank=POS&minutes=10&item=pos-compromiso">POS: compromiso</Link>
        <Link href="/passage?minutes=90">90-minute passage</Link>
      </section>

      <section id="ledger" style={{ marginTop: "2rem" }}>
        <h2>Error ledger</h2>
        {!ledger ? (
          <p>Loading…</p>
        ) : loaded.events.length === 0 ? (
          <p>
            Nothing saved yet. The next drill still has a seed: omissions, then punctuation. That is the pattern from the
            last sitting.
          </p>
        ) : (
          <p>{loaded.events.length} graded sittings saved in this browser.</p>
        )}
        <p>
          <Link href={`/practice?bank=weak&minutes=10`}>Next drill: {weakest} · {CATEGORY_NAME[weakest]}</Link>
        </p>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", margin: "0.8rem 0" }}>
          {Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([cat, n]) => (
              <span key={cat} style={{ padding: "0.35rem 0.6rem", background: cat === weakest ? "#fff3cd" : "#f4f4f4", borderRadius: "6px" }}>
                {cat} {n}
              </span>
            ))}
        </div>
        {lemmas.length ? (
          <p>
            Lemmas: {lemmas.map((l) => `${l.lemma} (${l.count})`).join(" · ")}
          </p>
        ) : null}
        <h3>14-day passage points</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "90px" }}>
          {spark.map((p) => (
            <div key={p.day} title={p.points === null ? `${p.day}: no passage` : `${p.day}: ${p.points}`} style={{ flex: 1 }}>
              <div
                style={{
                  height: p.points === null ? "4px" : `${Math.max(8, (p.points / maxBar) * 80)}px`,
                  background: p.points === null ? "#ddd" : p.points <= 17 ? "#2f7d4a" : p.points <= 25 ? "#c48a12" : "#a33",
                }}
              />
            </div>
          ))}
        </div>
        <ul>
          <li>14-day average passage points: {avg === null ? "no passage yet" : avg} (toward ≤17)</li>
          <li>
            O marks, last 7 days {oWeek.recent} vs the 7 before {oWeek.previous}
            {oWeek.recent < oWeek.previous ? " — falling" : oWeek.recent === oWeek.previous ? " — flat" : " — up"}
          </li>
          <li>
            P marks, last 7 days {pWeek.recent} vs the 7 before {pWeek.previous}
            {pWeek.recent < pWeek.previous ? " — falling" : pWeek.recent === pWeek.previous ? " — flat" : " — up"}
          </li>
          <li>
            POS-drift fires in the last {pos.attempts} POS items: {pos.fires}. Goal before exam week: 0 in the last 20.
          </li>
        </ul>
        <p style={{ color: "#555" }}>
          Banks: O {banks.O}, P {banks.P}, POS {banks.POS}, titles {banks.titles}, U {banks.U}.
        </p>
      </section>
    </div>
  );
}
