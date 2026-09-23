import { useState } from "react";
import { ASK_PRESETS, AskWhyRequest, buildArmedTraps } from "../lib/askWhy";
import { FiredMark } from "../lib/scoring";
import { Trap } from "../lib/types";

type Turn = { q: string; a: string };

export function AskWhy(props: {
  mark: FiredMark;
  spanish: string;
  candidate: string;
  reference?: string;
  traps: Trap[];
  fired: FiredMark[];
  displayedPoints: number;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(raw: string) {
    const userQuestion = raw.trim();
    if (busy) return;
    if (!userQuestion) {
      setError("Type a question, then Submit.");
      document.getElementById(`ask-q-${props.mark.trapId}`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const armedTraps = buildArmedTraps(props.traps, props.fired);
      const trap = armedTraps.find((row) => row.trapId === props.mark.trapId && row.fired);
      if (!trap) {
        setError("This row is not a fired trap.");
        return;
      }
      const body: AskWhyRequest = {
        trap,
        source: props.spanish,
        candidate: props.candidate,
        reference: props.reference,
        armedTraps,
        userQuestion,
        displayedPoints: props.displayedPoints,
      };
      const res = await fetch("/api/ask-why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        setError(data.error || "Ask why did not return an answer.");
        return;
      }
      setTurns((prev) => [...prev, { q: userQuestion, a: data.answer as string }].slice(-6));
      setQuestion("");
    } catch {
      setError("Ask why did not return an answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "0.45rem" }}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={askButton}>
        {open ? "Close" : "Ask why"}
      </button>
      {open ? (
        <div style={panel}>
          <div style={{ fontSize: "13px", color: "#444", marginBottom: "0.45rem" }}>
            Text only, on {props.mark.code}. This does not change the score. Ask in your own words, for example “why is it X and not Y?” or where to find it in the printed ATA Into-English standards.
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(question);
            }}
          >
            <label htmlFor={`ask-q-${props.mark.trapId}`} style={{ display: "block", fontWeight: "bold", marginBottom: "0.3rem" }}>
              Ask a question
            </label>
            <textarea
              id={`ask-q-${props.mark.trapId}`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              maxLength={500}
              disabled={busy}
              placeholder="Ask a question…"
              aria-label="Ask a question"
              style={field}
            />
            <button type="submit" disabled={busy} style={submitButton(busy)}>
              {busy ? "Asking…" : "Submit"}
            </button>
          </form>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.55rem" }}>
            {ASK_PRESETS.map((preset) => (
              <button key={preset} type="button" onClick={() => submit(preset)} disabled={busy} style={chip}>
                {preset}
              </button>
            ))}
          </div>
          {error ? <p style={{ color: "#8b1e1e", margin: "0.5rem 0 0" }}>{error}</p> : null}
          <div aria-live="polite">
            {turns.map((turn, index) => (
              <div key={`${turn.q}-${index}`} style={{ marginTop: "0.7rem" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>{turn.q}</div>
                {turn.a.split(/\n\n+/).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const askButton = {
  padding: "4px 10px",
  fontSize: "13px",
  background: "#222",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const panel = {
  marginTop: "0.4rem",
  padding: "0.7rem 0.75rem",
  background: "#f7f4ef",
  border: "1px solid #ddd",
  borderRadius: "6px",
};

const chip = {
  padding: "4px 8px",
  fontSize: "13px",
  background: "#fff",
  color: "#222",
  border: "1px solid #bbb",
  borderRadius: "999px",
  cursor: "pointer",
};

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  font: "inherit",
  padding: "0.4rem 0.5rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
};

function submitButton(disabled: boolean) {
  return {
    marginTop: "0.4rem",
    padding: "6px 12px",
    fontSize: "14px",
    background: disabled ? "#6c757d" : "#222",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "default" : "pointer",
  };
}
