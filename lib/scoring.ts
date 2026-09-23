import {
  CATEGORIES,
  CATEGORY_NAME,
  ErrorCat,
  FAIL_AT,
  PASS_LINE,
  PassageItem,
  REVIEW_MAX,
  SentenceItem,
  Trap,
  Weight,
  DrillItem,
} from "./types";

export type FiredMark = {
  trapId: string;
  category: ErrorCat;
  weight: Weight;
  code: string;
  comment: string;
  okExample?: string;
  noExample?: string;
  pitfall: string;
  label: string;
  lemma?: string;
  pass: "A" | "B";
  builtin?: boolean;
};

export type GradeResult = {
  points: number;
  clean: boolean;
  perfect: boolean;
  /** Major omission or a blank box. The next sentence stays locked. */
  blocksAdvance: boolean;
  scaleLabel: string;
  verdict: string;
  fired: FiredMark[];
  avoided: { trapId: string; label: string; code: string; pitfall: string }[];
  warnings: string[];
  histogram: Record<ErrorCat, number>;
};

export type PassageGrade = {
  points: number;
  scaleLabel: string;
  verdict: string;
  sentences: { id: string; spanish: string; english: string; grade: GradeResult }[];
  fired: FiredMark[];
  histogram: Record<ErrorCat, number>;
  warnings: string[];
  patternNote: string | null;
};

type Gradeable = {
  mode?: "micro" | "passage";
  english: string;
  acceptables?: string[];
  traps: Trap[];
};

export function normalize(raw: string): string {
  return normalizeKeepCase(raw).toLowerCase();
}

export function normalizeKeepCase(raw: string): string {
  return (raw || "")
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u00A0]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(haystack: string, phrase: string, caseSensitive: boolean): boolean {
  const needle = caseSensitive ? normalizeKeepCase(phrase) : normalize(phrase);
  const hay = caseSensitive ? haystack : haystack.toLowerCase();
  if (!needle) return false;
  if (/\s/.test(needle)) return hay.includes(needle);
  const flags = caseSensitive ? "" : "i";
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}(?:$|[^\\p{L}\\p{N}])`, `u${flags}`).test(
    ` ${hay} `
  );
}

export function chargeWeight(category: ErrorCat, weight: number): Weight {
  const capped = category === "P" || category === "SP" ? Math.min(weight, 4) : weight;
  if (capped <= 1) return 1;
  if (capped <= 2) return 2;
  if (capped <= 4) return 4;
  if (capped <= 8) return 8;
  return 16;
}

export function scaleLabel(points: number): string {
  if (points <= PASS_LINE) return "PASS (≤17)";
  if (points >= FAIL_AT && points <= REVIEW_MAX) return "FAIL (≥18) · REVIEW BAND (18–25)";
  return "FAIL (≥18) · NO REVIEW (≥26)";
}

function terminalMark(s: string): string {
  const m = normalizeKeepCase(s).match(/[.!?。]["']?\s*$/u);
  return m ? m[0].replace(/["'\s]/g, "") : "";
}

function prepExact(s: string, stripTerminal: boolean): string {
  let n = normalizeKeepCase(s);
  if (stripTerminal) n = n.replace(/[.!?。]["']?\s*$/u, "").trim();
  return n;
}

export function isExactOrAcceptable(
  target: string,
  item: { english: string; acceptables?: string[] },
  mode: "micro" | "passage" | "sentence"
): boolean {
  const variants = [item.english, ...(item.acceptables ?? [])];
  return variants.some((variant) => {
    const strip = mode === "micro" && !!terminalMark(target) && !!terminalMark(variant);
    return prepExact(target, strip) === prepExact(variant, strip);
  });
}

function emptyHistogram(): Record<ErrorCat, number> {
  const h = {} as Record<ErrorCat, number>;
  for (const c of CATEGORIES) h[c] = 0;
  return h;
}

function markFrom(
  trap: Trap,
  category: ErrorCat,
  weight: Weight,
  builtin = false
): FiredMark {
  return {
    trapId: trap.id,
    category,
    weight,
    code: `${category}${weight}`,
    comment: trap.comment,
    okExample: trap.okExample,
    noExample: trap.noExample,
    pitfall: trap.pitfall,
    label: trap.label,
    lemma: trap.lemma,
    pass: trap.pass,
    builtin,
  };
}

function detectorFires(trap: Trap, text: string, folded: string): boolean {
  const d = trap.detector;
  switch (d.kind) {
    case "required_span": {
      const hay = d.caseSensitive ? text : folded;
      return !d.anyOf.some((s) => hasPhrase(hay, s, !!d.caseSensitive));
    }
    case "forbidden_span": {
      const hay = d.caseSensitive ? text : folded;
      return d.anyOf.some((s) => hasPhrase(hay, s, !!d.caseSensitive));
    }
    case "required_pattern":
      return !new RegExp(d.pattern, d.flags ?? "").test(text);
    case "forbidden_pattern":
      return new RegExp(d.pattern, d.flags ?? "").test(text);
    case "title_caps":
      return d.no.some((s) => hasPhrase(text, s, true));
    case "pos_job": {
      const kept = d.accept.some((s) => hasPhrase(folded, s, false));
      if (kept) return false;
      return d.reject.some((s) => hasPhrase(folded, s, false));
    }
    default:
      return false;
  }
}

export function splitEnglishSentences(text: string): string[] {
  const hidden = normalizeKeepCase(text)
    .replace(/\bU\.S\./g, "U\u0000S\u0000")
    .replace(/\b(Dr|Mr|Ms|Mrs|St|Prof)\./g, "$1\u0000");
  const parts: string[] = [];
  for (const para of hidden.split(/\n+/)) {
    const bits = para.split(/(?<=[.!?]["']?)\s+(?=["A-Z])/);
    for (const b of bits) {
      const t = b.replace(/\u0000/g, ".").trim();
      if (t) parts.push(t);
    }
  }
  return parts;
}

const IND_RE = /\b[A-Za-z]{2,}\s*\/\s*[A-Za-z]{2,}\b|\[[A-Za-z][^\]]{1,}\]/;

function builtinMarks(text: string, mode: "micro" | "passage"): FiredMark[] {
  const marks: FiredMark[] = [];
  if (!text.trim()) {
    const weight: Weight = mode === "passage" ? 16 : 8;
    marks.push({
      trapId: "builtin-blank",
      category: "O",
      weight,
      code: `O${weight}`,
      comment: "The box is blank. A missing rendering is an omission, not a pass.",
      okExample: "Translate the whole source before you proof.",
      pitfall: "Blank box",
      label: "Blank rendering",
      pass: "B",
      builtin: true,
    });
    return marks;
  }
  if (IND_RE.test(text)) {
    marks.push({
      trapId: "builtin-ind",
      category: "IND",
      weight: 2,
      code: "IND2",
      comment: "Alternatives are still in the box (a slash pair or bracketed option). Graders cannot choose for you.",
      okExample: "Leave one rendering only.",
      pitfall: "Alternatives left in the box",
      label: "Indecision: slash or bracketed alternative",
      pass: "A",
      builtin: true,
    });
  }
  if (/[¿¡«»]/.test(text)) {
    marks.push({
      trapId: "builtin-es-punct",
      category: "P",
      weight: 2,
      code: "P2",
      comment: "Spanish punctuation (¿ ¡ « ») is still in the English.",
      okExample: "Use US quotation marks and no inverted marks.",
      pitfall: "Spanish punctuation left in English",
      label: "Inverted or guillemet punctuation",
      pass: "A",
      builtin: true,
    });
  }
  return marks;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "by", "from",
  "that", "this", "is", "was", "were", "are", "be", "as", "at", "it", "its",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function contentWords(s: string): string[] {
  return stripAccents(normalize(s))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function referenceAnchors(english: string): string[] {
  const parts = normalizeKeepCase(english).split(/\s+/);
  const anchors: string[] = [];
  parts.forEach((word, index) => {
    const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.%]+$/gu, "").replace(/[.%]+$/u, "");
    if (!bare || STOP_WORDS.has(bare.toLowerCase())) return;
    const isNumber = /\d/.test(bare);
    const isCap = index > 0 && /^[\p{Lu}]/u.test(bare);
    const isAccentedName = /[àáâãäåèéêëìíîïòóôõöùúûüñç]/i.test(bare);
    if (isNumber || isCap || isAccentedName) anchors.push(stripAccents(bare).toLowerCase());
  });
  return anchors;
}

function hasAnchor(folded: string, anchor: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(anchor)}(?:$|[^\\p{L}\\p{N}])`, "u").test(` ${folded} `);
}

/** Omission check. Runs before any other mark. There is no fluency or overlap bonus. */
function majorOmissionMark(reference: string, text: string, folded: string): FiredMark | null {
  const refWords = contentWords(reference);
  const userWords = contentWords(text);
  const anchors = referenceAnchors(reference);
  const foldedPlain = stripAccents(folded);
  const anchorHits = anchors.filter((anchor) => hasAnchor(foldedPlain, anchor)).length;
  const thin = refWords.length >= 4 && userWords.length <= 1;
  const droppedAnchors = anchors.length >= 2 && anchorHits / anchors.length < 0.5;
  if (!thin && !droppedAnchors) return null;
  return {
    trapId: "builtin-major-o",
    category: "O",
    weight: 8,
    code: "O8",
    comment: "Major source content is missing. Omissions are scored before anything else. A short or partial rendering does not get credit for starting the sentence.",
    okExample: reference.replace(/[.!?。]["']?\s*$/u, ""),
    pitfall: "Major omission",
    label: "Major source content omitted",
    pass: "B",
    builtin: true,
  };
}

function terminalPunctMark(reference: string, text: string): FiredMark | null {
  if (!terminalMark(reference) || terminalMark(text)) return null;
  return {
    trapId: "builtin-terminal",
    category: "P",
    weight: 1,
    code: "P1",
    comment: "The reference ends with terminal punctuation. The box does not. US prose closes the sentence.",
    okExample: terminalMark(reference) === "?" ? "End with a question mark." : "End with a period.",
    pitfall: "Missing terminal punctuation",
    label: "Final period or question mark missing",
    pass: "A",
    builtin: true,
  };
}

function lengthWarning(target: string, reference: string): string[] {
  const a = wordCount(target);
  const b = wordCount(reference);
  if (b < 4 || a === 0) return [];
  const ratio = a / b;
  if (ratio < 0.5 || ratio > 2) {
    return [
      `Length is ${a} words against a ${b}-word reference. Soft warning only. It adds no error points and it does not clear an omission.`,
    ];
  }
  return [];
}

function blocksAdvance(fired: FiredMark[]): boolean {
  return fired.some((mark) => mark.category === "O" && mark.weight >= 8);
}

function avoidedOf(traps: Trap[], firedIds: Set<string>) {
  return traps
    .filter((t) => !firedIds.has(t.id))
    .map((t) => ({
      trapId: t.id,
      label: t.label,
      code: `${t.category}${chargeWeight(t.category, t.weightIfMissed)}`,
      pitfall: t.pitfall,
    }));
}

function verdictOf(perfect: boolean, clean: boolean, fired: FiredMark[]): string {
  if (perfect) return "Perfect";
  if (clean || fired.length === 0) return "Clean";
  return fired.map((f) => f.code).join(" + ");
}

export function gradeItem(
  item: Gradeable,
  raw: string,
  opts?: { mode?: "micro" | "passage" | "sentence"; builtins?: boolean }
): GradeResult {
  const mode = opts?.mode ?? (item.mode === "passage" ? "passage" : "micro");
  const text = normalizeKeepCase(raw);
  const folded = text.toLowerCase();
  const useBuiltins = opts?.builtins !== false && mode !== "sentence";

  if (text && mode !== "sentence" && isExactOrAcceptable(text, item, mode === "passage" ? "passage" : "micro")) {
    const histogram = emptyHistogram();
    return {
      points: 0,
      clean: true,
      perfect: true,
      blocksAdvance: false,
      scaleLabel: scaleLabel(0),
      verdict: "Perfect",
      fired: [],
      avoided: avoidedOf(item.traps, new Set()),
      warnings: [],
      histogram,
    };
  }

  const fired: FiredMark[] = [];
  const micro = mode === "micro";
  if (useBuiltins) fired.push(...builtinMarks(text, mode === "passage" ? "passage" : "micro"));

  const blank = fired.some((f) => f.trapId === "builtin-blank");
  if (!blank) {
    if (micro) {
      const major = majorOmissionMark(item.english, text, folded);
      if (major) fired.push(major);
    }
    const ordered = [...item.traps].sort((a, b) => Number(a.category !== "O") - Number(b.category !== "O"));
    for (const trap of ordered) {
      if (!detectorFires(trap, text, folded)) continue;
      const weight = chargeWeight(trap.category, trap.weightIfMissed);
      fired.push(markFrom(trap, trap.category, weight));
    }
    if (micro) {
      const terminal = terminalPunctMark(item.english, text);
      if (terminal) fired.push(terminal);
    }
  }

  const points = fired.reduce((sum, f) => sum + f.weight, 0);
  const histogram = emptyHistogram();
  for (const f of fired) histogram[f.category] += f.weight;
  const clean = points === 0;
  return {
    points,
    clean,
    perfect: false,
    blocksAdvance: blocksAdvance(fired),
    scaleLabel: scaleLabel(points),
    verdict: verdictOf(false, clean, fired),
    fired,
    avoided: avoidedOf(item.traps, new Set(fired.map((f) => f.trapId))),
    warnings: lengthWarning(text, item.english),
    histogram,
  };
}

function serialCommaInconsistent(text: string): boolean {
  const oxford = /,\s+and\b/i.test(text);
  const plain = /\b[\p{L}]+,\s+[\p{L}]+\s+and\b/u.test(text);
  return oxford && plain;
}

export function gradePassage(passage: PassageItem, raw: string): PassageGrade {
  const text = normalizeKeepCase(raw);
  if (!text) {
    const fired = builtinMarks("", "passage");
    const points = fired.reduce((sum, f) => sum + f.weight, 0);
    const histogram = emptyHistogram();
    for (const f of fired) histogram[f.category] += f.weight;
    return {
      points,
      scaleLabel: scaleLabel(points),
      verdict: scaleLabel(points),
      sentences: passage.sentences.map((s) => ({
        id: s.id,
        spanish: s.spanish,
        english: s.english,
        grade: gradeItem(s, s.english, { mode: "sentence", builtins: false }),
      })),
      fired,
      histogram,
      warnings: [],
      patternNote: null,
    };
  }
  if (isExactOrAcceptable(text, passage, "passage")) {
    const histogram = emptyHistogram();
    const sentences = passage.sentences.map((s) => ({
      id: s.id,
      spanish: s.spanish,
      english: s.english,
      grade: gradeItem(s, s.english, { mode: "sentence", builtins: false }),
    }));
    return {
      points: 0,
      scaleLabel: scaleLabel(0),
      verdict: "Perfect",
      sentences,
      fired: [],
      histogram,
      warnings: [],
      patternNote: null,
    };
  }

  const userSentences = splitEnglishSentences(text);
  const aligned = userSentences.length === passage.sentences.length;
  const sentences = passage.sentences.map((s, i) => ({
    id: s.id,
    spanish: s.spanish,
    english: s.english,
    grade: gradeItem(s, aligned ? userSentences[i] : raw, { mode: "sentence", builtins: false }),
  }));

  const fired = sentences.flatMap((s) => s.grade.fired);
  const builtins = builtinMarks(text, "passage").filter((b) => b.trapId !== "builtin-blank" || !text);
  if (!text.trim()) {
    fired.length = 0;
    fired.push(...builtinMarks("", "passage"));
  } else {
    fired.push(...builtins);
    if (serialCommaInconsistent(text)) {
      fired.push({
        trapId: "builtin-serial",
        category: "P",
        weight: 1,
        code: "P1",
        comment: "Serial commas are inconsistent in this passage. Pick one policy and keep it.",
        okExample: "Ana, Luis, and Marta — comma before and, every time.",
        pitfall: "Serial-comma inconsistency",
        label: "Serial comma not consistent",
        pass: "A",
        builtin: true,
      });
    }
  }

  const points = fired.reduce((sum, f) => sum + f.weight, 0);
  const histogram = emptyHistogram();
  for (const f of fired) histogram[f.category] += f.weight;
  const warnings = lengthWarning(text, passage.english);
  return {
    points,
    scaleLabel: scaleLabel(points),
    verdict: text && isExactOrAcceptable(text, passage, "passage") ? "Perfect" : points === 0 ? "Clean" : scaleLabel(points),
    sentences,
    fired,
    histogram,
    warnings,
    patternNote: null,
  };
}

export function patternNote(
  fired: { lemma?: string; pitfall: string; trapId: string; category: ErrorCat }[],
  prior: { lemma?: string; pitfall: string; trapId: string; category: ErrorCat }[]
): string | null {
  const all = [...prior, ...fired];
  const lemmaCount = (lemma: string) => all.filter((e) => e.lemma === lemma).length;
  const pitfallCount = (p: string) => all.filter((e) => e.pitfall === p).length;
  const catCount = (c: ErrorCat) => all.filter((e) => e.category === c).length;

  if (lemmaCount("incluso") >= 2) return "You keep dropping incluso.";
  if (pitfallCount("POS drift on noun heads") >= 2 || (fired.some((f) => f.pitfall === "POS drift on noun heads") && pitfallCount("POS drift on noun heads") >= 1 && prior.some((p) => p.pitfall === "POS drift on noun heads"))) {
    return "POS drift on noun heads.";
  }
  if (all.filter((e) => e.trapId.includes("splice") || e.pitfall.toLowerCase().includes("comma splice")).length >= 2) {
    return "Comma splices: two English clauses need a conjunction, a semicolon, or a period.";
  }
  if (catCount("O") >= 4 && fired.some((f) => f.category === "O")) return "Omissions are stacking up. Read the source once more for intensifiers, names, and numbers.";
  if (catCount("P") >= 4 && fired.some((f) => f.category === "P")) return "Punctuation is a recurring mark. Proof US commas, quotes, and number forms with the source covered.";
  return null;
}

export function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function describeMark(mark: FiredMark): string {
  const fix = mark.okExample ? ` Fix: ${mark.okExample}` : "";
  return `${mark.code} — ${CATEGORY_NAME[mark.category]}. ${mark.comment}${fix} Pitfall: ${mark.pitfall}.`;
}

export function microHeadline(grade: GradeResult): string {
  if (grade.perfect) return "Perfect — 0 points";
  if (grade.clean) return "Clean — 0 points";
  return `${grade.verdict} — trap missed`;
}

export type Keyable = DrillItem | SentenceItem | { english: string; acceptables?: string[]; traps: Trap[]; mode?: "micro" };

export function assertReferenceClean(item: DrillItem): string | null {
  const grade = gradeItem(item, item.english, { mode: "micro" });
  if (grade.points !== 0) {
    return `${item.id} reference scored ${grade.points}: ${grade.fired.map((f) => f.trapId).join(",")}`;
  }
  for (const alt of item.acceptables ?? []) {
    const g = gradeItem(item, alt, { mode: "micro" });
    if (g.points !== 0) return `${item.id} acceptable scored ${g.points}: ${alt}`;
  }
  return null;
}
