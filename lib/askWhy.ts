import { chargeWeight, FiredMark } from "./scoring";
import { CATEGORIES, CATEGORY_NAME, DetectorSpec, ErrorCat, Trap, Weight } from "./types";

/** Armed or fired trap facts the explainer is allowed to use. */
export type AskTrap = {
  trapId: string;
  code: string;
  category: ErrorCat;
  weight: Weight;
  label: string;
  comment: string;
  pitfall: string;
  pass: "A" | "B";
  lemma?: string;
  okExample?: string;
  noExample?: string;
  detector?: DetectorSpec;
  fired: boolean;
};

export type AskWhyRequest = {
  trap: AskTrap;
  source: string;
  candidate: string;
  reference?: string;
  armedTraps: AskTrap[];
  userQuestion: string;
  displayedPoints: number;
};

export const ASK_PRESETS = ["Why this code?", "What was the Spanish job?", "What's a clean fix?"] as const;

const WEIGHTS: Weight[] = [1, 2, 4, 8, 16];

const CODE_RE = /\b(SP|IND|SYN|O|A|T|P|U|G)\s*-?\s*(1|2|4|8|16)\b/gi;

const CATEGORY_WORDS: { re: RegExp; category: ErrorCat }[] = [
  { re: /\bomissions?\b/i, category: "O" },
  { re: /\badditions?\b/i, category: "A" },
  { re: /\btransfers?\b|\bpart of speech\b|\bpos\b/i, category: "T" },
  { re: /\bpunctuation\b/i, category: "P" },
  { re: /\busage\b/i, category: "U" },
  { re: /\bgrammar\b/i, category: "G" },
  { re: /\bspelling\b|\bcapitali[sz]/i, category: "SP" },
  { re: /\bindecision\b/i, category: "IND" },
  { re: /\bsyntax\b/i, category: "SYN" },
];

export function codesIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(new RegExp(CODE_RE))) {
    out.push(`${match[1].toUpperCase()}${match[2]}`);
  }
  return out;
}

export function tutorSentences(text: string): string[] {
  const masked = text
    .replace(/"[^"]*"/g, (quoted) => quoted.replace(/[.!?]/g, ""))
    .replace(/(\d)\.(?=\d)/g, "$1");
  return masked
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function buildArmedTraps(traps: Trap[], fired: FiredMark[]): AskTrap[] {
  const firedById = new Map(fired.map((mark) => [mark.trapId, mark]));
  // A blank box short-circuits sentence traps. They were not scored, so they are not "quiet".
  const evaluated = !fired.some((mark) => mark.trapId === "builtin-blank");
  const rows: AskTrap[] = [];
  if (evaluated) {
    for (const trap of traps) {
      const hit = firedById.get(trap.id);
      const weight = hit?.weight ?? chargeWeight(trap.category, trap.weightIfMissed);
      rows.push({
        trapId: trap.id,
        code: hit?.code ?? `${trap.category}${weight}`,
        category: trap.category,
        weight,
        label: trap.label,
        comment: trap.comment,
        pitfall: trap.pitfall,
        pass: hit?.pass ?? trap.pass,
        lemma: trap.lemma,
        okExample: trap.okExample,
        noExample: trap.noExample,
        detector: trap.detector,
        fired: !!hit,
      });
    }
  }
  for (const mark of fired) {
    if (rows.some((row) => row.trapId === mark.trapId)) continue;
    rows.push(fromFiredMark(mark));
  }
  return rows;
}

function fromFiredMark(mark: FiredMark): AskTrap {
  return {
    trapId: mark.trapId,
    code: mark.code,
    category: mark.category,
    weight: mark.weight,
    label: mark.label,
    comment: mark.comment,
    pitfall: mark.pitfall,
    pass: mark.pass,
    lemma: mark.lemma,
    okExample: mark.okExample,
    noExample: mark.noExample,
    fired: true,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function splitSentences(text: string): string[] {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts: string[] = [];
  let buf = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    buf += ch;
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    const prev = normalized[i - 1] || "";
    const next = normalized[i + 1] || "";
    if (ch === "." && /\d/.test(prev) && /\d/.test(next)) continue;
    if (next && next !== " " && next !== '"') continue;
    const sentence = buf.trim();
    if (sentence) parts.push(sentence);
    buf = "";
    while (normalized[i + 1] === " ") i++;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function quote(text: string): string {
  return `"${text.replace(/"/g, "'")}"`;
}

function list(items: string[], max = 8): string {
  const shown = items.slice(0, max);
  return shown.join(", ") + (items.length > max ? ", …" : "");
}

function jobName(job: string): string {
  if (job === "title-noun") return "a noun in a title";
  if (job === "noun") return "a noun";
  if (job === "adjective") return "an adjective";
  if (job === "verb") return "a verb";
  return `a ${job}`;
}

function needles(trap: AskTrap): string[] {
  const out: string[] = [];
  if (trap.noExample) out.push(trap.noExample);
  if (trap.lemma) out.push(trap.lemma);
  const detector = trap.detector;
  if (!detector) return out;
  if (detector.kind === "pos_job") out.push(...detector.reject, ...detector.accept);
  if (detector.kind === "forbidden_span" || detector.kind === "required_span") out.push(...detector.anyOf);
  if (detector.kind === "title_caps") out.push(...detector.no);
  return out.filter(Boolean);
}

function excerpt(candidate: string, hints: string[]): string {
  const clean = (candidate || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = splitSentences(clean);
  if (sentences.length <= 2 && clean.length <= 220) return clean;
  const lower = clean.toLowerCase();
  let at = -1;
  for (const hint of hints) {
    const found = lower.indexOf(hint.toLowerCase());
    if (found >= 0) {
      at = found;
      break;
    }
  }
  if (at < 0) {
    const first = sentences[0] || clean;
    return first.length > 180 ? `${first.slice(0, 177).trim()}…` : first;
  }
  const start = Math.max(0, at - 48);
  const end = Math.min(clean.length, at + 96);
  let snip = clean.slice(start, end).trim();
  if (start > 0) snip = `…${snip}`;
  if (end < clean.length) snip = `${snip}…`;
  return snip;
}

function cleanFix(trap: AskTrap, reference?: string): string {
  const raw = (trap.okExample || "").trim();
  const shortRef = (reference || "").trim();
  const source = raw || (shortRef.length > 0 && shortRef.length <= 180 ? shortRef : "");
  if (!source) return "";
  const first = splitSentences(source)[0] || source;
  const bare = first.replace(/[.!?]+$/, "").trim();
  if (bare.length <= 160) return bare;
  return `${bare.slice(0, 157).trim()}…`;
}

function scoreSentence(points: number): string {
  if (!Number.isInteger(points) || points < 0) {
    return "This note does not change the error points already shown.";
  }
  const unit = points === 1 ? "error point" : "error points";
  return `This note does not change the ${points} ${unit} already shown.`;
}

function angle(trap: AskTrap): string {
  if (trap.category === "T") {
    return trap.detector?.kind === "pos_job"
      ? "a part-of-speech change is transfer on the ATA chart, not a style preference"
      : "transfer marks a change of meaning or grammatical job, not a style preference";
  }
  if (trap.category === "O") return "omission is source meaning left out, not a style note";
  if (trap.category === "A") return "addition is meaning the source did not give";
  if (trap.category === "P" || trap.category === "SP") {
    return `${CATEGORY_NAME[trap.category].toLowerCase()} is capped at 4 on this scale`;
  }
  if (trap.category === "U") return "usage is an English word or collocation that does not fit";
  if (trap.category === "G") return "grammar is an English structure error";
  if (trap.category === "SYN") return "syntax is English word order or clause structure";
  if (trap.category === "IND") return "indecision leaves an option in the box for the grader to choose";
  return trap.pitfall;
}

function iegsLine(trap: AskTrap, didFire: boolean): string {
  const name = CATEGORY_NAME[trap.category];
  const pass = trap.pass === "A" ? "Pass A reads the English alone" : "Pass B compares the source with the target";
  const verb = didFire ? "did fire as" : "is";
  return `IEGS/ATA: ${trap.code} ${verb} ${name}, weight ${trap.weight}, because ${angle(trap)} (${pass}).`;
}

/** Locator for the printed PDF. Category names come from the app. No page numbers are stored. */
function standardsPointer(trap: AskTrap): string {
  const name = CATEGORY_NAME[trap.category];
  const pass = trap.pass === "A" ? "Pass A (English only)" : "Pass B (source vs target)";
  const label = (trap.pitfall || "").replace(/[.!?]/g, "").trim();
  const labelBit = label ? `, label "${label}"` : "";
  return `Standards pointer: printed ATA Into-English grading standards, error category ${name} (${trap.category}), ${pass}${labelBit} (no page number stored).`;
}

function asksWhere(question: string): boolean {
  return /where\b|grading standards|into[-\s]?english|reference point|printed pdf|\bpdf\b/i.test(question);
}

function asksCompare(question: string): boolean {
  return /\bwhy\b[\s\S]{0,220}\bnot\b/i.test(question) && !asksWhyQuiet(question);
}

function categoryFromPhrase(phrase: string): ErrorCat | null {
  const text = phrase.trim().toLowerCase();
  if (!text) return null;
  for (const category of CATEGORIES) {
    const name = CATEGORY_NAME[category].toLowerCase();
    if (text === name || text.includes(name)) return category;
  }
  return null;
}

function splitCompare(question: string): { left: string; right: string } | null {
  const match = question.match(/\bwhy\b([\s\S]+?)\bnot\b([\s\S]+)/i);
  if (!match) return null;
  const left = match[1]
    .replace(/^(?:\s*(?:is|it|this|that|the|a|an|mark|code)\b)+/i, "")
    .replace(/\s+\band\s*$/i, "")
    .trim();
  const right = match[2].replace(/[?!.]+$/g, "").trim();
  if (!left || !right) return null;
  return { left, right };
}

function spanishJob(trap: AskTrap): string {
  if (trap.detector?.kind === "pos_job") {
    const bits = splitSentences(trap.comment);
    if (bits.length >= 2) {
      const first = bits[0].replace(/[.!?]$/, "");
      const second = bits[1].replace(/[.!?]$/, "");
      return ensurePeriod(`Spanish job: ${first}, and ${second}`);
    }
    if (bits.length === 1) return `Spanish job: ${ensurePeriod(bits[0])}`;
    const head = trap.lemma ? quote(trap.lemma) : "the head";
    return `Spanish job: the source uses ${head} as ${jobName(trap.detector.job)}, so English has to keep that grammatical job.`;
  }
  const fact = splitSentences(trap.comment)[0] || trap.label;
  return `Spanish job: ${ensurePeriod(fact)}`;
}

function explainFired(trap: AskTrap, req: AskWhyRequest, didFire: boolean): string {
  const fix = cleanFix(trap, req.reference);
  const wrote = excerpt(req.candidate, needles(trap));
  const allows =
    trap.detector?.kind === "pos_job"
      ? fix
        ? `What English allows: the same grammatical job is ${jobName(trap.detector.job)}, as in ${quote(fix)}.`
        : `What English allows: English has to keep ${jobName(trap.detector.job)}.`
      : fix
        ? `What English allows: ${quote(fix)}.`
        : "What English allows: only the wording the armed note already accepts.";
  return [
    spanishJob(trap),
    wrote ? `What you wrote: ${quote(wrote.replace(/[.!?…]+$/u, "").trim())}.` : "What you wrote: the box is blank.",
    allows,
    `${iegsLine(trap, didFire)} ${scoreSentence(req.displayedPoints)}`,
    standardsPointer(trap),
    fix ? `One clean fix: ${ensurePeriod(fix)}` : "One clean fix: the armed trap stores no model fragment, so change only the wording that note names.",
  ].join("\n\n");
}

function explainWhere(trap: AskTrap, req: AskWhyRequest): string {
  const fix = cleanFix(trap, req.reference);
  return [
    standardsPointer(trap),
    `Open that heading for ${trap.code}. ${ensurePeriod(capitalize(angle(trap)))}`,
    spanishJob(trap),
    fix ? `One clean fix: ${ensurePeriod(fix)}` : "",
    scoreSentence(req.displayedPoints),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function explainCompare(anchor: AskTrap, req: AskWhyRequest, pointerFirst: boolean): string {
  const parts = splitCompare(req.userQuestion);
  const left = parts?.left ?? "";
  const right = parts?.right ?? "";
  const rightCat = categoryFromPhrase(right);
  const leftCat = categoryFromPhrase(left);
  const otherCat = rightCat && rightCat !== anchor.category ? rightCat : leftCat && leftCat !== anchor.category ? leftCat : null;
  const lines: string[] = [];

  if (anchor.detector?.kind === "pos_job") {
    const rejectHit = anchor.detector.reject.find((word) => left.toLowerCase().includes(word.toLowerCase()));
    const acceptHit = anchor.detector.accept.find((word) => right.toLowerCase().includes(word.toLowerCase()));
    if (rejectHit && acceptHit) {
      lines.push(
        `It is ${quote(rejectHit)}, not ${quote(acceptHit)}, because ${acceptHit} keeps the ${jobName(anchor.detector.job)} and ${rejectHit} changes that job.`,
        `That mark is ${anchor.code} ${CATEGORY_NAME[anchor.category]}, not a style preference.`
      );
    }
  }

  if (!lines.length && /style|stylistic|preference|fluency/i.test(right)) {
    lines.push(`It is ${anchor.code} ${CATEGORY_NAME[anchor.category]}, not a style preference, because ${angle(anchor)}.`);
  }

  const rightCodes = codesIn(right);
  if (!lines.length && rightCodes.length) {
    const known = req.armedTraps.filter((trap) => rightCodes.includes(trap.code));
    const unknown = rightCodes.filter((code) => !req.armedTraps.some((trap) => trap.code === code));
    if (unknown.length && !known.length) {
      lines.push(`${unknown.join(" and ")} is not on the armed list for this item, so I will not add that mark.`);
      lines.push(`What fired is ${anchor.code} ${CATEGORY_NAME[anchor.category]}.`);
    } else if (known.some((trap) => !trap.fired)) {
      const quiet = known.filter((trap) => !trap.fired).slice(0, 2);
      lines.push(`It is ${anchor.code} ${CATEGORY_NAME[anchor.category]}, not ${quiet.map((trap) => trap.code).join(" or ")}.`);
      lines.push(
        `${quiet.map((trap) => trap.code).join(" and ")} was armed and did not fire. ${quiet
          .map((trap) => `${trap.code} (${trap.label}): ${ruleOf(trap)}`)
          .join(". ")}.`
      );
    }
  }

  if (!lines.length && otherCat) {
    const named = CATEGORY_NAME[otherCat];
    const inList = req.armedTraps.filter((trap) => trap.category === otherCat);
    const quiet = inList.filter((trap) => !trap.fired).slice(0, 2);
    if (!inList.length) {
      lines.push(`${named} (${otherCat}) is not on the armed list for this item, so I will not add it.`);
      lines.push(`What fired is ${anchor.code} ${CATEGORY_NAME[anchor.category]}.`);
    } else if (quiet.length) {
      lines.push(`It is ${anchor.code} ${CATEGORY_NAME[anchor.category]}, not ${named}, because ${angle(anchor)}.`);
      lines.push(
        `${named} was armed and did not fire. ${quiet.map((trap) => `${trap.code} (${trap.label}): ${ruleOf(trap)}`).join(". ")}.`
      );
    } else {
      lines.push(`${named} also fired on this item. This row is ${anchor.code} ${CATEGORY_NAME[anchor.category]}.`);
    }
  }

  if (!lines.length) {
    const other = right.replace(/[.!?]/g, "").trim();
    lines.push(
      other
        ? `It is ${anchor.code} ${CATEGORY_NAME[anchor.category]}. "${other}" is not an armed category here, so I will not add it.`
        : `It is ${anchor.code} ${CATEGORY_NAME[anchor.category]}.`
    );
    lines.push(spanishJob(anchor));
  }

  lines.push(standardsPointer(anchor), scoreSentence(req.displayedPoints));
  if (pointerFirst) {
    const pointer = lines.filter((line) => line.startsWith("Standards pointer"));
    const rest = lines.filter((line) => !line.startsWith("Standards pointer"));
    return [...pointer, ...rest].join("\n\n");
  }
  return lines.join("\n\n");
}

function ruleOf(trap: AskTrap): string {
  const detector = trap.detector;
  if (!detector) return (splitSentences(trap.comment)[0] || trap.label).replace(/[.!?]$/, "");
  switch (detector.kind) {
    case "required_span":
      return `it fires only when the English has none of: ${list(detector.anyOf)}`;
    case "forbidden_span":
      return `it fires when the English contains any of: ${list(detector.anyOf)}`;
    case "title_caps":
      return `it fires when this lowercase title is still in the English: ${list(detector.no)}`;
    case "pos_job":
      return `it fires when ${list(detector.accept)} is missing and the English uses ${list(detector.reject)}, which changes the ${jobName(detector.job)} job`;
    case "required_pattern":
      return "it fires when the armed punctuation or form pattern is missing";
    case "forbidden_pattern":
      return "it fires when the armed punctuation or form pattern is present";
    default:
      return (splitSentences(trap.comment)[0] || trap.label).replace(/[.!?]$/, "");
  }
}

function explainQuiet(traps: AskTrap[], req: AskWhyRequest): string {
  const fired = req.armedTraps.filter((trap) => trap.fired);
  const firedBit = fired.length
    ? `What did fire stays ${fired.map((trap) => `${trap.code} (${trap.label})`).join("; ")}.`
    : "Nothing on the armed list fired.";
  const shown = traps.slice(0, 3);
  const lead =
    shown.length === 1
      ? `${shown[0].code} (${shown[0].label}) was armed and did not fire. ${ensurePeriod(capitalize(ruleOf(shown[0])))}`
      : `These armed traps did not fire. ${shown.map((trap) => `${trap.code} (${trap.label}): ${ruleOf(trap)}`).join(". ")}.`;
  const extra = traps.length > 3 ? ` ${traps.length - 3} other armed traps also stayed quiet.` : "";
  const firedTrap = req.armedTraps.find((trap) => trap.fired);
  return [lead + extra, firedBit, firedTrap ? standardsPointer(firedTrap) : "", scoreSentence(req.displayedPoints)]
    .filter(Boolean)
    .join("\n\n");
}

function explainUnarmed(codes: string[], req: AskWhyRequest): string {
  const asked = unique(codes).join(" and ");
  if (req.armedTraps.some((trap) => trap.trapId === "builtin-blank")) {
    return [
      `${asked} was not scored, because the box is blank and the other traps did not run.`,
      `I will not invent that mark. ${scoreSentence(req.displayedPoints)}`,
    ].join("\n\n");
  }
  const armedCodes = unique(req.armedTraps.map((trap) => trap.code));
  return [
    `${asked} is not on the armed list for this item, so I will not add that mark.`,
    `Armed codes here: ${armedCodes.join(", ") || "none"}.`,
    standardsPointer(req.trap),
    scoreSentence(req.displayedPoints),
  ].join("\n\n");
}

function asksWhyQuiet(question: string): boolean {
  const quiet = /didn'?t|did not|does not|doesn'?t|hasn'?t|has not|wasn'?t|isn'?t|not fire/i.test(question);
  const aboutTrap = /fire|mark|trap|code|omission|transfer|punctuat|spell|usage|grammar|syntax|indecision|addition|part of speech|\bpos\b/i.test(
    question
  );
  return quiet && aboutTrap;
}

function labelMentioned(question: string, trap: AskTrap): boolean {
  const q = question.toLowerCase();
  const stop = new Set(["omitted", "rendered", "adjective", "noun", "title", "change", "drift", "missing", "english"]);
  const words = `${trap.label} ${trap.pitfall}`
    .toLowerCase()
    .split(/[^a-záéíóúüñ]+/)
    .filter((word) => word.length > 4 && !stop.has(word));
  return words.some((word) => q.includes(word));
}

function selectTraps(req: AskWhyRequest): { kind: "unarmed"; codes: string[] } | { kind: "traps"; traps: AskTrap[] } | { kind: "anchor" } {
  const askedCodes = unique(codesIn(req.userQuestion));
  const categories = CATEGORY_WORDS.filter((entry) => entry.re.test(req.userQuestion)).map((entry) => entry.category);
  const lemmas = unique(
    req.armedTraps
      .map((trap) => trap.lemma || "")
      .filter((lemma) => lemma && req.userQuestion.toLowerCase().includes(lemma.toLowerCase()))
  );

  if (askedCodes.length) {
    const known = req.armedTraps.filter((trap) => askedCodes.includes(trap.code));
    const unknown = askedCodes.filter((code) => !req.armedTraps.some((trap) => trap.code === code));
    if (!known.length && unknown.length) return { kind: "unarmed", codes: unknown };
    let pool = known;
    if (categories.length) {
      const narrowed = pool.filter((trap) => categories.includes(trap.category));
      if (narrowed.length) pool = narrowed;
    }
    if (lemmas.length) {
      const narrowed = pool.filter((trap) => trap.lemma && lemmas.some((lemma) => lemma.toLowerCase() === trap.lemma!.toLowerCase()));
      if (narrowed.length) pool = narrowed;
    }
    return { kind: "traps", traps: pool };
  }

  let pool = req.armedTraps.slice();
  let narrowed = false;
  if (categories.length) {
    pool = pool.filter((trap) => categories.includes(trap.category));
    narrowed = true;
  }
  if (lemmas.length) {
    const byLemma = pool.filter((trap) => trap.lemma && lemmas.some((lemma) => lemma.toLowerCase() === trap.lemma!.toLowerCase()));
    if (byLemma.length) {
      pool = byLemma;
      narrowed = true;
    }
  }
  const byLabel = pool.filter((trap) => labelMentioned(req.userQuestion, trap));
  if (byLabel.length) {
    pool = byLabel;
    narrowed = true;
  }
  if (narrowed && pool.length) return { kind: "traps", traps: pool };
  return { kind: "anchor" };
}

function compose(req: AskWhyRequest): string {
  const anchor = req.armedTraps.find((trap) => trap.trapId === req.trap.trapId) || req.trap;
  const choice = selectTraps(req);
  const whyQuiet = asksWhyQuiet(req.userQuestion);
  const where = asksWhere(req.userQuestion);
  const compare = asksCompare(req.userQuestion);

  if (!whyQuiet && compare) return explainCompare(anchor, req, where);

  if (!whyQuiet && where) {
    if (choice.kind === "unarmed") return explainUnarmed(choice.codes, req);
    if (choice.kind === "traps") {
      const fired = choice.traps.find((trap) => trap.fired);
      if (fired) return explainWhere(fired, req);
      const quiet = choice.traps.filter((trap) => !trap.fired).slice(0, 2);
      if (quiet.length) {
        return [
          standardsPointer(quiet[0]),
          `${quiet.map((trap) => `${trap.code} (${trap.label})`).join(" and ")} was armed and did not fire.`,
          `The fired mark on this row is ${anchor.code}. ${standardsPointer(anchor)}`,
          scoreSentence(req.displayedPoints),
        ].join("\n\n");
      }
    }
    return explainWhere(anchor, req);
  }

  if (choice.kind === "unarmed") return explainUnarmed(choice.codes, req);

  if (choice.kind === "traps") {
    const quiet = choice.traps.filter((trap) => !trap.fired);
    const fired = choice.traps.filter((trap) => trap.fired);
    if (whyQuiet && quiet.length) return explainQuiet(quiet, req);
    if (fired.length) {
      const chosen = fired.find((trap) => trap.trapId === anchor.trapId) || fired[0];
      return explainFired(chosen, req, whyQuiet);
    }
    if (quiet.length) return explainQuiet(quiet, req);
  }

  return explainFired(anchor, req, whyQuiet && anchor.fired);
}

function grounded(answer: string, req: AskWhyRequest): string {
  const allowed = new Set([...req.armedTraps.map((trap) => trap.code.toUpperCase()), ...codesIn(req.userQuestion)]);
  const stray = codesIn(answer).filter((code) => !allowed.has(code));
  if (stray.length || tutorSentences(answer).length > 8) {
    return `I can only explain armed traps on this item. ${scoreSentence(req.displayedPoints)}`;
  }
  return answer;
}

/** Tutor note for one fired trap. Uses the armed packet only and does not rescore. */
export function explainAskWhy(req: AskWhyRequest): string {
  return grounded(compose(req), req);
}

function isWeight(value: unknown): value is Weight {
  return WEIGHTS.includes(value as Weight);
}

function isCategory(value: unknown): value is ErrorCat {
  return CATEGORIES.includes(value as ErrorCat);
}

function readDetector(value: unknown): DetectorSpec | undefined {
  if (!value || typeof value !== "object") return undefined;
  const detector = value as DetectorSpec;
  if (detector.kind === "required_span" || detector.kind === "forbidden_span") {
    if (!Array.isArray(detector.anyOf) || !detector.anyOf.every((item) => typeof item === "string")) return undefined;
    return { kind: detector.kind, anyOf: detector.anyOf.slice(0, 12), caseSensitive: !!detector.caseSensitive };
  }
  if (detector.kind === "required_pattern" || detector.kind === "forbidden_pattern") {
    if (typeof detector.pattern !== "string") return undefined;
    return { kind: detector.kind, pattern: detector.pattern.slice(0, 200), flags: detector.flags };
  }
  if (detector.kind === "title_caps") {
    if (!Array.isArray(detector.no) || !detector.no.every((item) => typeof item === "string")) return undefined;
    return { kind: "title_caps", no: detector.no.slice(0, 12) };
  }
  if (detector.kind === "pos_job") {
    const jobs = ["noun", "adjective", "verb", "title-noun"];
    if (!jobs.includes(detector.job)) return undefined;
    if (!Array.isArray(detector.accept) || !Array.isArray(detector.reject)) return undefined;
    if (!detector.accept.every((item) => typeof item === "string") || !detector.reject.every((item) => typeof item === "string")) {
      return undefined;
    }
    return {
      kind: "pos_job",
      job: detector.job,
      accept: detector.accept.slice(0, 12),
      reject: detector.reject.slice(0, 12),
    };
  }
  return undefined;
}

function readTrap(value: unknown, index: number): AskTrap | string {
  if (!value || typeof value !== "object") return `armedTraps[${index}] is not a trap`;
  const row = value as Record<string, unknown>;
  if (typeof row.trapId !== "string" || !row.trapId.trim()) return `armedTraps[${index}] needs a trapId`;
  if (!isCategory(row.category)) return `armedTraps[${index}] has an unknown category`;
  if (!isWeight(row.weight)) return `armedTraps[${index}] has an unknown weight`;
  if (typeof row.label !== "string" || typeof row.comment !== "string" || typeof row.pitfall !== "string") {
    return `armedTraps[${index}] is missing label, comment, or pitfall`;
  }
  if (row.pass !== "A" && row.pass !== "B") return `armedTraps[${index}] has an unknown pass`;
  if (typeof row.fired !== "boolean") return `armedTraps[${index}] needs fired true or false`;
  const code = `${row.category}${row.weight}`;
  return {
    trapId: row.trapId.slice(0, 80),
    code,
    category: row.category,
    weight: row.weight,
    label: row.label.slice(0, 200),
    comment: row.comment.slice(0, 800),
    pitfall: row.pitfall.slice(0, 200),
    pass: row.pass,
    lemma: typeof row.lemma === "string" ? row.lemma.slice(0, 80) : undefined,
    okExample: typeof row.okExample === "string" ? row.okExample.slice(0, 400) : undefined,
    noExample: typeof row.noExample === "string" ? row.noExample.slice(0, 400) : undefined,
    detector: readDetector(row.detector),
    fired: row.fired,
  };
}

export function parseAskWhyRequest(body: unknown): { ok: true; value: AskWhyRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing request body" };
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.armedTraps) || raw.armedTraps.length === 0 || raw.armedTraps.length > 80) {
    return { ok: false, error: "armedTraps must list the traps armed for this grade" };
  }
  const armedTraps: AskTrap[] = [];
  for (let i = 0; i < raw.armedTraps.length; i++) {
    const trap = readTrap(raw.armedTraps[i], i);
    if (typeof trap === "string") return { ok: false, error: trap };
    armedTraps.push(trap);
  }
  const trap = readTrap(raw.trap, 0);
  if (typeof trap === "string") return { ok: false, error: "trap must be the fired trap for this row" };
  if (!trap.fired) return { ok: false, error: "Ask why opens from a fired trap" };
  if (!armedTraps.some((row) => row.trapId === trap.trapId && row.fired)) {
    return { ok: false, error: "That trap is not on the fired list for this grade" };
  }
  if (typeof raw.source !== "string" || typeof raw.candidate !== "string") {
    return { ok: false, error: "source and candidate are required" };
  }
  if (raw.source.length > 20000 || raw.candidate.length > 20000) {
    return { ok: false, error: "source or candidate is too long" };
  }
  const userQuestion = typeof raw.userQuestion === "string" ? raw.userQuestion.trim().slice(0, 500) : "";
  if (!userQuestion) return { ok: false, error: "Type a question or pick a chip" };
  const displayedPoints = raw.displayedPoints;
  if (typeof displayedPoints !== "number" || !Number.isInteger(displayedPoints) || displayedPoints < 0 || displayedPoints > 999) {
    return { ok: false, error: "displayedPoints must be the score already on screen" };
  }
  const reference = typeof raw.reference === "string" ? raw.reference.slice(0, 20000) : undefined;
  return {
    ok: true,
    value: {
      trap,
      source: raw.source,
      candidate: raw.candidate,
      reference,
      armedTraps,
      userQuestion,
      displayedPoints,
    },
  };
}
