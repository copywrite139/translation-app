import { CSSProperties } from "react";

const box: CSSProperties = {
  width: "100%",
  padding: "15px",
  fontSize: "16px",
  border: "2px solid #222",
  borderRadius: "6px",
  fontFamily: "Georgia, 'Times New Roman', serif",
  lineHeight: "1.45",
  background: "#fff",
  boxSizing: "border-box",
};

function lockExamBox(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.spellcheck = true;
  el.setAttribute("spellcheck", "true");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("autocapitalize", "none");
  el.setAttribute("autocomplete", "off");
  el.setAttribute("translate", "no");
  el.setAttribute("data-gramm", "false");
  el.setAttribute("data-gramm_editor", "false");
  el.setAttribute("data-enable-grammarly", "false");
  el.setAttribute("data-lt-active", "false");
}

export function ExamTextarea(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      ref={lockExamBox}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onFocus={(e) => lockExamBox(e.currentTarget)}
      disabled={props.disabled}
      rows={props.rows ?? 8}
      spellCheck={true}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      data-lt-active="false"
      lang="en"
      style={box}
      placeholder={props.placeholder ?? "US English. One plain box."}
      aria-label="Exam translation"
    />
  );
}

export function AllowList() {
  return (
    <aside
      style={{
        marginTop: "1rem",
        padding: "0.9rem 1rem",
        background: "#f4f1ea",
        border: "1px solid #d9d0c1",
        borderRadius: "8px",
        fontSize: "14px",
        lineHeight: 1.45,
      }}
    >
      <strong>Exam box.</strong> Browser spell-check is on. No machine translation, no AI rewrite, no CAT. Lookups, if you leave this page, stay on the allow-list: Google or Yahoo spelling and usage search, WordReference (no forums), Merriam-Webster, American Heritage, DLE, DPD, Linguee, IEGS, Google Ngram. This panel does not link out.
    </aside>
  );
}
