import { describeMark, microHeadline, PassageGrade, GradeResult } from "../lib/scoring";
import { CATEGORIES, CATEGORY_NAME, PASS_LINE } from "../lib/types";

export function MicroGrade(props: { grade: GradeResult; patternNote?: string | null }) {
  const { grade } = props;
  const bad = !grade.clean;
  return (
    <div>
      <div
        style={{
          padding: "1rem 1.1rem",
          borderRadius: "8px",
          background: bad ? "#fff4e5" : "#e8f6ee",
          border: `1px solid ${bad ? "#e0c08a" : "#b7dfc4"}`,
          marginBottom: "1rem",
        }}
      >
        <strong style={{ fontSize: "20px" }}>{microHeadline(grade)}</strong>
        <div style={{ marginTop: "0.35rem" }}>Error points on this item: {grade.points}</div>
        {bad ? (
          <div style={{ marginTop: "0.35rem" }}>
            The trap fired. This is not a clean rendering. A full passage passes at {PASS_LINE} or under; these marks total {grade.points}.
          </div>
        ) : (
          <div style={{ marginTop: "0.35rem" }}>Passage scale for a clean item: {grade.scaleLabel}</div>
        )}
      </div>
      <TrapLists grade={grade} />
      {props.patternNote ? (
        <p style={{ padding: "0.8rem 1rem", background: "#f8e8e8", borderRadius: "8px" }}>
          <strong>Pattern.</strong> {props.patternNote}
        </p>
      ) : null}
      {grade.warnings.map((w) => (
        <p key={w} style={{ color: "#555" }}>
          {w}
        </p>
      ))}
    </div>
  );
}

export function PassageGradeView(props: { grade: PassageGrade }) {
  const { grade } = props;
  const over = grade.points >= 18;
  return (
    <div>
      <div
        style={{
          padding: "1rem 1.1rem",
          borderRadius: "8px",
          background: over ? "#fdecec" : "#e8f6ee",
          border: `1px solid ${over ? "#e3b4b4" : "#b7dfc4"}`,
          marginBottom: "1rem",
        }}
      >
        <strong style={{ fontSize: "22px" }}>{grade.scaleLabel}</strong>
        <div style={{ marginTop: "0.35rem" }}>
          Error points: {grade.points}. Pass line: {PASS_LINE}.
        </div>
      </div>
      <Histogram points={grade.histogram} />
      <h3>Sentence by sentence</h3>
      {grade.fired.some((f) => f.trapId === "builtin-blank") ? (
        <p>The box is blank, so the sentence traps were not scored one by one.</p>
      ) : null}
      {grade.fired.some((f) => f.trapId === "builtin-blank")
        ? null
        : grade.sentences.map((s, i) => (
        <div key={s.id} style={{ marginBottom: "0.9rem", paddingBottom: "0.7rem", borderBottom: "1px solid #eee" }}>
          <strong>
            {i + 1}. {s.grade.clean ? "Clean" : s.grade.verdict} · {s.grade.points} pts
          </strong>
          <div style={{ color: "#333", marginTop: "0.25rem" }}>{s.spanish}</div>
          {s.grade.fired.map((f) => (
            <div key={f.trapId} style={{ marginTop: "0.35rem" }}>
              {describeMark(f)}
            </div>
          ))}
        </div>
      ))}
      {grade.fired.filter((f) => f.builtin).length ? (
        <>
          <h3>Whole-passage checks</h3>
          {grade.fired
            .filter((f) => f.builtin)
            .map((f) => (
              <p key={f.trapId}>{describeMark(f)}</p>
            ))}
        </>
      ) : null}
      {props.grade.patternNote ? (
        <p style={{ padding: "0.8rem 1rem", background: "#f8e8e8", borderRadius: "8px" }}>
          <strong>Pattern.</strong> {props.grade.patternNote}
        </p>
      ) : null}
      {grade.warnings.map((w) => (
        <p key={w}>{w}</p>
      ))}
    </div>
  );
}

function TrapLists(props: { grade: GradeResult }) {
  const missed = props.grade.fired;
  const caught = props.grade.avoided;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
      <div>
        <strong>Trap missed</strong>
        {missed.length === 0 ? <div>None.</div> : null}
        {missed.map((f) => (
          <div key={f.trapId} style={{ marginTop: "0.55rem" }}>
            <div>
              <strong>{f.code}</strong> {f.label}
            </div>
            <div>{describeMark(f)}</div>
            <div style={{ color: "#555" }}>Pass {f.pass === "A" ? "A (English only)" : "B (source vs target)"}</div>
          </div>
        ))}
      </div>
      <div>
        <strong>Trap caught</strong>
        {caught.length === 0 ? <div>None armed, or all of them fired.</div> : null}
        <ul>
          {caught.map((t) => (
            <li key={t.trapId}>
              {t.code} {t.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Histogram(props: { points: Record<string, number> }) {
  const rows = CATEGORIES.filter((c) => props.points[c] > 0);
  if (!rows.length) return <p>No category points.</p>;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <strong>Points by category</strong>
      {rows.map((c) => (
        <div key={c} style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.3rem" }}>
          <span style={{ width: "7rem" }}>
            {c} {CATEGORY_NAME[c]}
          </span>
          <span
            style={{
              display: "inline-block",
              height: "10px",
              width: `${Math.min(220, props.points[c] * 12)}px`,
              background: "#444",
            }}
          />
          <span>{props.points[c]}</span>
        </div>
      ))}
    </div>
  );
}

export function ScaleLegend() {
  return (
    <p style={{ color: "#444", fontSize: "14px" }}>
      Weights are 1 / 2 / 4 / 8 / 16. Punctuation and spelling cap at 4. Passage labels: PASS (≤17) / FAIL (≥18) / REVIEW BAND (18–25) / NO REVIEW (≥26).
    </p>
  );
}

export function PassLineMeter(props: { points: number }) {
  const width = Math.min(100, (props.points / 34) * 100);
  const mark = (17 / 34) * 100;
  return (
    <div style={{ margin: "0.4rem 0 0.8rem" }}>
      <div style={{ fontSize: "14px" }}>
        Running error points: {props.points}. Passage line: 17.
      </div>
      <div style={{ position: "relative", height: "12px", background: "#eee", borderRadius: "6px", marginTop: "0.3rem" }}>
        <div style={{ width: `${width}%`, height: "100%", background: props.points >= 18 ? "#a33" : "#3d6b4f", borderRadius: "6px" }} />
        <div style={{ position: "absolute", left: `${mark}%`, top: "-3px", bottom: "-3px", width: "2px", background: "#111" }} />
      </div>
    </div>
  );
}
