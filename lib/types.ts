export type ErrorCat = "O" | "A" | "T" | "P" | "U" | "G" | "SP" | "IND" | "SYN";

export type Weight = 1 | 2 | 4 | 8 | 16;

export type Bank = "O" | "P" | "POS" | "titles" | "U";

export type PassId = "A" | "B";

export type DetectorSpec =
  | { kind: "required_span"; anyOf: string[]; caseSensitive?: boolean }
  | { kind: "forbidden_span"; anyOf: string[]; caseSensitive?: boolean }
  | { kind: "required_pattern"; pattern: string; flags?: string }
  | { kind: "forbidden_pattern"; pattern: string; flags?: string }
  | {
      kind: "pos_job";
      job: "noun" | "adjective" | "verb" | "title-noun";
      accept: string[];
      reject: string[];
    }
  | { kind: "title_caps"; no: string[] };

export type Trap = {
  id: string;
  category: ErrorCat;
  weightIfMissed: Weight;
  detector: DetectorSpec;
  comment: string;
  okExample?: string;
  noExample?: string;
  pitfall: string;
  label: string;
  lemma?: string;
  pass: PassId;
};

export type TranslationInstructions = {
  sourceMedium: string;
  targetMedium: string;
  purpose: string;
  audience: string;
};

export type DrillItem = {
  id: string;
  mode: "micro";
  bank: Bank;
  spanish: string;
  english: string;
  acceptables?: string[];
  domain: string;
  level?: string;
  focus: string[];
  errors_to_catch: string[];
  traps: Trap[];
  translationInstructions?: TranslationInstructions;
};

export type SentenceItem = {
  id: string;
  spanish: string;
  english: string;
  acceptables?: string[];
  traps: Trap[];
};

export type PassageItem = {
  id: string;
  mode: "passage";
  title: string;
  spanish: string;
  english: string;
  domain: string;
  wordCount: number;
  translationInstructions: TranslationInstructions;
  sentences: SentenceItem[];
  focus: string[];
  errors_to_catch: string[];
};

export const PASS_LINE = 17;
export const REVIEW_MAX = 25;
export const FAIL_AT = 18;

export const CATEGORIES: ErrorCat[] = ["O", "A", "T", "P", "U", "G", "SP", "IND", "SYN"];

export const CATEGORY_NAME: Record<ErrorCat, string> = {
  O: "Omission",
  A: "Addition",
  T: "Transfer",
  P: "Punctuation",
  U: "Usage",
  G: "Grammar",
  SP: "Spelling",
  IND: "Indecision",
  SYN: "Syntax",
};
