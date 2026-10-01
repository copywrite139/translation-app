import { ErrorCat } from "./types";

/**
 * Curated index of ATA Into-English Grading Standards, version 2025.
 * Printed pages are the TOC pages in the 67-page IEGS (hand-checked against the text).
 * Excerpts are at most two sentences. The full standards are not stored here.
 *
 * App category T is Transfer. Framework letter T means Terminology and is not mapped.
 */

export type IegsExcerpt = {
  id: string;
  /** Printed page the sentences appear on. May be later than the TOC start page. */
  page: number;
  text: string;
};

export type IegsTopic = {
  id: string;
  title: string;
  /** Printed TOC page where the topic starts. */
  page: number;
  excerpts?: IegsExcerpt[];
};

export type IegsHit = {
  topic: IegsTopic;
  excerpt?: IegsExcerpt;
};

export const IEGS_TOPICS: IegsTopic[] = [
  {
    id: "abbreviated-forms",
    title: "Abbreviated forms and titles",
    page: 4,
    excerpts: [
      {
        id: "initial-caps",
        page: 4,
        text: "Such titles are written in initial caps; ending these abbreviations with a period is standard in contemporary U.S. English and omitting the period may earn an error point.",
      },
    ],
  },
  {
    id: "acronyms",
    title: "Acronyms",
    page: 5,
    excerpts: [
      {
        id: "translating",
        page: 7,
        text: "Whether an acronym occurring in a source text may be repeated in the target text without translation, expansion, or explanation depends primarily on whether the acronym is readily recognizable to the specified target audience.",
      },
      {
        id: "all-caps",
        page: 6,
        text: "In U.S. English, acronyms formed from initial letters are written in all capitals; failure to do so is an error.",
      },
    ],
  },
  { id: "anaphora", title: "Anaphora / Referents", page: 8 },
  {
    id: "similar-terms",
    title: "Choosing between similar terms and translating cognates",
    page: 10,
    excerpts: [
      {
        id: "cognates",
        page: 10,
        text: "The same rules apply to the use of English cognates of source words.",
      },
    ],
  },
  { id: "articles", title: "Articles", page: 11 },
  {
    id: "capitalization-titles",
    title: "Capitalization in headings and titles of works",
    page: 14,
    excerpts: [
      {
        id: "headings",
        page: 14,
        text: "Two systems exist in U.S. English for capitalizing headings. Most often main headings are written with initial capitals for many categories of words or words with four or more letters (title-case capitalization or headline style).",
      },
      {
        id: "proper-nouns",
        page: 14,
        text: "Sentence case capitalization capitalizes only the first word and all proper nouns or other words that would normally be capitalized (names of companies or associations, laws, government agencies, etc.).",
      },
      {
        id: "titles-of-works",
        page: 14,
        text: "It is acceptable to use the title-case system for book titles in conjunction with the sentence-case system for article titles in a single passage.",
      },
    ],
  },
  { id: "collective-nouns", title: "Collective and mass nouns", page: 15 },
  {
    id: "commas",
    title: "Commas",
    page: 16,
    excerpts: [
      {
        id: "open",
        page: 16,
        text: "Because comma usage in English can differ significantly from conventions in a source language, commas tend to account for a significant share of the errors candidates make on the ATA Certification Exam.",
      },
    ],
  },
  { id: "commas-overview", title: "Overview", page: 17 },
  { id: "commas-dependent", title: "Dependent clauses (with subordinating conjunctions)", page: 17 },
  { id: "commas-independent", title: "Independent clauses (with coordinating conjunctions)", page: 17 },
  { id: "commas-conjunctive", title: "Conjunctive adverbs", page: 18 },
  { id: "commas-compound", title: "Compound predicates", page: 18 },
  { id: "commas-introductory", title: "Introductory words and phrases", page: 19 },
  { id: "commas-subject", title: "Comma between subject and predicate", page: 19 },
  { id: "commas-digressions", title: "Digressions/interrupters/parenthetical comments", page: 20 },
  {
    id: "special-contexts",
    title: "Special contexts (serial comma, dates, proper names, places, quotations, parentheses)",
    page: 21,
    excerpts: [
      {
        id: "serial-comma",
        page: 21,
        text: "The serial comma before the conjunctions and or or may be either used or omitted unless omission would result in ambiguity or confusion.",
      },
      {
        id: "decimals",
        page: 22,
        text: "The use of a comma instead of a period to indicate decimals is also an error.",
      },
    ],
  },
  { id: "conditional", title: "Conditional tenses", page: 23 },
  { id: "dangling-modifiers", title: "Dangling modifiers", page: 25 },
  { id: "distinctions", title: "Distinctions compulsory in the source but not in English", page: 25 },
  { id: "exclamation-points", title: "Exclamation points", page: 26 },
  { id: "grammatical-ambiguity", title: "Grammatical ambiguity in the source language", page: 26 },
  { id: "gender-terms", title: "He/she and gender-specific terms", page: 27 },
  {
    id: "hyphens",
    title: "Hyphens",
    page: 28,
    excerpts: [
      {
        id: "roles",
        page: 28,
        text: "Hyphens play numerous roles in U.S. English.",
      },
    ],
  },
  {
    id: "idioms",
    title: "Idioms",
    page: 31,
    excerpts: [
      {
        id: "idioms",
        page: 31,
        text: "Idiomatic expressions may occur in exam passages if the idiom is considered common enough to be readily understood by a qualified candidate.",
      },
    ],
  },
  { id: "may", title: "May and its alternatives", page: 34 },
  { id: "misplaced-adverbs", title: "Misplaced adverbs", page: 34 },
  {
    id: "names",
    title: "Names, personal and geographic",
    page: 35,
    excerpts: [
      {
        id: "equivalents",
        page: 35,
        text: "Candidates are expected to provide the correct English equivalent of personal and geographic names from the source- or target-language culture.",
      },
    ],
  },
  { id: "nonparallel", title: "Nonparallel constructions", page: 36 },
  {
    id: "non-us-usage",
    title: "Non-U.S. usage",
    page: 37,
    excerpts: [
      {
        id: "british",
        page: 37,
        text: "Each instance of British (Canadian, Australian, etc.) spelling is penalized as an error.",
      },
    ],
  },
  {
    id: "numbers",
    title: "Numbers",
    page: 37,
    excerpts: [
      {
        id: "consistency",
        page: 37,
        text: "Either is acceptable on the ATA Exam, as long as usage is consistent throughout the translation.",
      },
      {
        id: "digit-groups",
        page: 37,
        text: "Commas, not decimal points or spaces, should be used to separate groups of three digits for numbers of five digits or more.",
      },
    ],
  },
  {
    id: "parentheses",
    title: "Parenthetical material and use of parentheses",
    page: 38,
    excerpts: [
      {
        id: "asides",
        page: 38,
        text: "Parentheses may be used to enclose asides or explanations without penalty if the sentence retains its meaning and reads normally in English, even if the original had the analogous phrase enclosed in commas or dashes.",
      },
    ],
  },
  { id: "passive", title: "Passive and active voice", page: 39 },
  { id: "phrasal-verbs", title: "Phrasal verbs", page: 40 },
  { id: "offensive-terms", title: "Possibly offensive terms", page: 41 },
  {
    id: "quotation-marks",
    title: "Quotation marks",
    page: 42,
    excerpts: [
      {
        id: "double",
        page: 42,
        text: "With exceptions described below, only double quotation marks (straight or curly) are acceptable in certification exams. Other marks or conventions used in other countries or in special contexts to indicate quoted speech, such as ‘single quotes,’ «guillemets», „low nine double quotes,“ dashes, or italics, are not acceptable.",
      },
      {
        id: "inside",
        page: 42,
        text: "In U.S. usage, commas and periods are always placed inside a closing quotation mark, while colons and semicolons are placed outside.",
      },
      {
        id: "question-mark",
        page: 42,
        text: "Exclamation points and question marks are placed inside closing quotation marks only if they are part of the matter being quoted.",
      },
    ],
  },
  { id: "redundancy", title: "Redundancy", page: 44 },
  {
    id: "register",
    title: "Register",
    page: 45,
    excerpts: [
      {
        id: "register",
        page: 45,
        text: "Candidates are expected to find terms and phrases appropriate to the register (or language level) of the target context. Information about the target audience as indicated in the passage's Translation Instructions is often useful in making decisions about proper register.",
      },
    ],
  },
  { id: "restrictive", title: "Restrictive and nonrestrictive clauses and appositives", page: 48 },
  { id: "relative-pronouns", title: "Relative pronouns", page: 49 },
  {
    id: "run-on",
    title: "Run-on sentences / comma splices",
    page: 51,
    excerpts: [
      {
        id: "splice",
        page: 51,
        text: "The most common form of run-on sentence, known as a comma splice, connects the two clauses with a comma but no conjunction.",
      },
    ],
  },
  { id: "sentence-fragments", title: "Sentence fragments", page: 53 },
  { id: "shall-will", title: "Shall and will", page: 53 },
  { id: "split-infinitives", title: "Split infinitives", page: 54 },
  { id: "stranded-prepositions", title: "Stranded prepositions", page: 55 },
  { id: "subjunctive", title: "Subjunctive mood", page: 55 },
  { id: "verb-tenses", title: "Verb tenses", page: 56 },
  { id: "tense-formation", title: "Formation of tenses", page: 57 },
  { id: "tense-usage", title: "Usage Conditions and Rules for Use of the Tenses", page: 57 },
  { id: "present-tenses", title: "Present tenses", page: 57 },
  { id: "present-perfect-past", title: "Present perfect used for past events", page: 60 },
  {
    id: "present-perfect-progressive",
    title: "Present perfect progressive (used only in very specific situations)",
    page: 61,
  },
  { id: "past-progressive", title: "Past progressive", page: 61 },
  { id: "past-perfect", title: "Past perfect", page: 62 },
  { id: "past-perfect-progressive", title: "Past perfect progressive", page: 62 },
  { id: "simple-future", title: "Simple future", page: 62 },
  { id: "future-progressive", title: "Future progressive", page: 63 },
  { id: "future-perfect-progressive", title: "Future perfect progressive", page: 63 },
  { id: "tense-sequence", title: "Tense sequence in complex sentences referring to the future", page: 64 },
  { id: "who-whom", title: "Who and whom", page: 64 },
];

/**
 * App error categories that have IEGS homes.
 * Omission, Addition, Transfer, and Indecision are not IEGS chapters.
 * Transfer is not Framework Terminology.
 */
export const CATEGORY_TOPIC_IDS: Partial<Record<ErrorCat, readonly string[]>> = {
  P: ["commas", "special-contexts", "quotation-marks", "run-on", "hyphens"],
  U: ["similar-terms", "idioms", "register", "non-us-usage", "phrasal-verbs"],
  G: ["articles", "collective-nouns", "verb-tenses", "subjunctive", "who-whom"],
  SP: ["abbreviated-forms", "capitalization-titles", "acronyms", "non-us-usage"],
  SYN: ["nonparallel", "dangling-modifiers", "misplaced-adverbs", "sentence-fragments"],
};

const TEXT_RULES: { re: RegExp; topicId: string; excerptId?: string }[] = [
  { re: /serial comma|oxford comma/i, topicId: "special-contexts", excerptId: "serial-comma" },
  { re: /decimal comma|spanish decimal/i, topicId: "special-contexts", excerptId: "decimals" },
  { re: /thousands separator|spanish number format|groups of three digits/i, topicId: "numbers", excerptId: "digit-groups" },
  { re: /comma splice|run-on sentence|run on sentence/i, topicId: "run-on", excerptId: "splice" },
  { re: /question mark outside|exclamation points?/i, topicId: "quotation-marks", excerptId: "question-mark" },
  { re: /closing quote|comma outside|inside (?:a )?closing quotation/i, topicId: "quotation-marks", excerptId: "inside" },
  { re: /american quotes?|guillemets?|\braya\b|quotation marks?/i, topicId: "quotation-marks", excerptId: "double" },
  { re: /false[- ]friends?|cognates?/i, topicId: "similar-terms", excerptId: "cognates" },
  { re: /title before a name|lowercase title|officeholder|secretary of state/i, topicId: "abbreviated-forms", excerptId: "initial-caps" },
  { re: /capitalization in headings|headings and titles of works/i, topicId: "capitalization-titles", excerptId: "headings" },
  { re: /publication caps|titles of (?:works|periodicals)|title-case|\bperiodicals?\b/i, topicId: "capitalization-titles", excerptId: "titles-of-works" },
  {
    re: /\b(?:institution|country-name|place-name|party-name|court|document|war-name|legal-citation|body|month|weekday|disease-name) caps\b/i,
    topicId: "capitalization-titles",
    excerptId: "proper-nouns",
  },
  { re: /\bacronyms?\b/i, topicId: "acronyms", excerptId: "translating" },
  { re: /\bregisters?\b|\blegalese\b/i, topicId: "register", excerptId: "register" },
  { re: /name-order|geographic names?|place name left|personal and geographic/i, topicId: "names", excerptId: "equivalents" },
  { re: /\bhyphens?\b/i, topicId: "hyphens", excerptId: "roles" },
  { re: /\bidioms?\b/i, topicId: "idioms", excerptId: "idioms" },
  { re: /\bcaps\b/i, topicId: "capitalization-titles", excerptId: "proper-nouns" },
  { re: /capitali[sz]/i, topicId: "capitalization-titles", excerptId: "headings" },
  { re: /\bcommas?\b/i, topicId: "commas", excerptId: "open" },
  { re: /\bnumbers\b/i, topicId: "numbers", excerptId: "consistency" },
  { re: /non-?u\.?s\.? (?:usage|spelling)|british spelling/i, topicId: "non-us-usage", excerptId: "british" },
];

const TOPICS_BY_LENGTH = [...IEGS_TOPICS].sort((a, b) => b.title.length - a.title.length);

function topicById(id: string): IegsTopic | undefined {
  return IEGS_TOPICS.find((topic) => topic.id === id);
}

function excerptById(topic: IegsTopic, id: string | undefined): IegsExcerpt | undefined {
  if (!id) return undefined;
  return topic.excerpts?.find((excerpt) => excerpt.id === id);
}

/** Match a question, pitfall, or label to one indexed topic. No match means no page. */
export function matchIegsText(text: string): IegsHit | null {
  const raw = text || "";
  if (!raw.trim()) return null;
  for (const rule of TEXT_RULES) {
    if (!rule.re.test(raw)) continue;
    const topic = topicById(rule.topicId);
    if (!topic) return null;
    return { topic, excerpt: excerptById(topic, rule.excerptId) };
  }
  const hay = raw.toLowerCase();
  for (const topic of TOPICS_BY_LENGTH) {
    if (topic.title.length < 12) continue;
    if (hay.includes(topic.title.toLowerCase())) {
      return { topic, excerpt: topic.excerpts?.[0] };
    }
  }
  return null;
}

export function matchTrapToIegs(trap: { pitfall: string; label: string; comment?: string }): IegsHit | null {
  // Pitfall and label only. Comments mention words like "register" in passing.
  return matchIegsText(`${trap.pitfall}\n${trap.label}`);
}

export function topicsForCategory(category: ErrorCat): IegsTopic[] {
  const ids = CATEGORY_TOPIC_IDS[category] || [];
  return ids.map((id) => topicById(id)).filter((topic): topic is IegsTopic => !!topic);
}

export function formatIegsLocator(topic: IegsTopic): string {
  return `IEGS 2025 p.${topic.page} — ${topic.title}`;
}

export function formatIegsQuote(excerpt: IegsExcerpt): string {
  return `IEGS 2025, p.${excerpt.page}: "${excerpt.text.replace(/"/g, "'")}"`;
}
