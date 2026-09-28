import type { NextApiRequest } from "next";
import rawJson from "../data/private/ed-friend-micro-drills.json";
import type { Bank, DetectorSpec, DrillItem, ErrorCat, Trap, Weight } from "./types";

/**
 * Server-only Ed friend-extract micro bank.
 * Import this from the API route only. Do not import it from a page or client component:
 * the Spanish sources must not ship in the public bundle.
 */
if (typeof window !== "undefined") {
  throw new Error("private friend micros are server-only");
}

const COOKIE = "private_friend_micros_email";
const HEADER = "x-private-friend-micros-email";

export const PRIVATE_MICRO_LABEL = "Private · Ed only · friend extracts (micro)";

type RawDrill = {
  id: string;
  source_passage: string;
  source_passage_label: string;
  spanish_text: string;
  focus_traps: string[];
  errors_to_catch: string[];
  why_this_chunk: string;
  suggested_ok_english_hint: string;
  private: boolean;
  visibility: string;
  publishable: boolean;
  mode: string;
  approx_word_count: number;
};

type Spec = {
  category: ErrorCat;
  weight: Weight;
  pitfall: string;
  detector: DetectorSpec;
  comment: string;
  ok?: string;
  no?: string;
  lemma?: string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole phrase, case-insensitive when the detector sets the i flag. */
function W(phrase: string): string {
  return `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`;
}

function words(...phrases: string[]): string {
  return phrases.map((phrase) => W(phrase)).join("|");
}

function all(needs: string[], banRe = ""): DetectorSpec {
  const neg = banRe ? `(?![\\s\\S]*(?:${banRe}))` : "";
  const pos = needs.map((need) => `(?=[\\s\\S]*(?:${need}))`).join("");
  return { kind: "required_pattern", pattern: `^${neg}${pos}[\\s\\S]+$`, flags: "iu" };
}

function miss(pattern: string, flags = "iu"): DetectorSpec {
  return { kind: "forbidden_pattern", pattern, flags };
}

const CHATTY = "\\b(?:gonna|kinda|lol|lmao|awesome|btw)\\b";
const YOU = "\\byou(?:'re|r)?\\b";

function passFor(category: ErrorCat): "A" | "B" {
  return category === "P" || category === "SP" || category === "G" || category === "IND" ? "A" : "B";
}

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function bankFor(category: ErrorCat): Bank {
  if (category === "O" || category === "A") return "O";
  if (category === "P" || category === "IND" || category === "G") return "P";
  if (category === "SP") return "titles";
  if (category === "U") return "U";
  return "POS";
}

function toTrap(id: string, index: number, spec: Spec, label: string): Trap {
  return {
    id: `${id}:${index + 1}`,
    category: spec.category,
    weightIfMissed: spec.weight,
    detector: spec.detector,
    comment: spec.comment,
    okExample: spec.ok,
    noExample: spec.no,
    pitfall: spec.pitfall,
    label,
    lemma: spec.lemma,
    pass: passFor(spec.category),
  };
}

const SPECS: Record<string, Spec[]> = {
  "pmd-p01-01": [
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all([
        W("Baruch"),
        W("Spinoza"),
        words("Jewish", "Jew"),
        words("Portuguese", "Luso", "Lusitanian"),
        words("Dutch", "Holland", "Netherlands"),
      ]),
      comment: "Keep Baruch Spinoza, and render judío-luso-holandés as Jewish, Portuguese, and Dutch (or a close equivalent).",
      ok: "the Jewish-Portuguese-Dutch philosopher Baruch Spinoza",
      no: "the philosopher Spinoza",
      lemma: "Spinoza",
    },
    {
      category: "G",
      weight: 4,
      pitfall: "pos-syntax",
      detector: miss("\\b(?:that|which) come\\b"),
      comment: "proviene is singular. It agrees with uno…estado, so English wants comes / stems, not that come.",
      ok: "a state of mind that comes from",
      no: "states of mind that come from",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("expectation", "expectations", "our hope", "our hopes", "that hope")],
        "\\billusions?\\b"
      ),
      comment: "ilusión here is a hope or expectation. Optical illusion changes the claim.",
      ok: "our expectations will not be fulfilled",
      no: "our illusion will not be realized",
      lemma: "ilusión",
    },
  ],
  "pmd-p01-02": [
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: miss("\\bnostalgic(?:ally)?\\b|\\bnostalgia\\b"),
      comment: "añorado is longed for or yearned for, with an ironic edge. nostalgic is a different feeling.",
      ok: "feared and longed for",
      no: "feared and nostalgic",
      lemma: "añorado",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "false-friends",
      detector: all([words("longed", "longs", "longing", "yearned", "yearns", "yearning", "longed for", "longs for", "yearned for")]),
      comment: "temido y añorado are both in the source. Dropping añorado is an omission.",
      ok: "the disaster he both fears and longs for",
      no: "the disaster he fears",
      lemma: "añorado",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss(CHATTY),
      comment: "This is formal essay prose. Chatty markers (gonna, kinda, lol) drop the register.",
      ok: "is about to overtake him",
      no: "is gonna get him",
    },
  ],
  "pmd-p01-03": [
    {
      category: "O",
      weight: 8,
      pitfall: "names-titles-acronyms",
      detector: all([`S[aá]nchez Carri[oó]n`], "\\bJoseph\\b"),
      comment: "Keep José Faustino Sánchez Carrión. Joseph anglicizes the given name.",
      ok: "José Faustino Sánchez Carrión",
      no: "Joseph Faustino Sanchez Carrion",
      lemma: "Sánchez Carrión",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all(
        [words("independence", "emancipation"), words("colonial rule", "colonialism", "colonial status", "colonial subjection")],
        "\\bcoloniz(?:ation|ations)\\b|\\bcolonis(?:ation|ations)\\b"
      ),
      comment: "emancipación is independence (emancipation is fine). coloniaje is colonial rule, not colonization.",
      ok: "the dawn of independence … some form of colonial rule",
      no: "colonization",
      lemma: "coloniaje",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("regime", "regimes", "form of government", "system of government", "political system")],
        "\\bdiets?\\b"
      ),
      comment: "régimen here is a form of government. diet is the false friend.",
      ok: "any other regime",
      no: "any other diet",
      lemma: "régimen",
    },
    {
      category: "SP",
      weight: 1,
      pitfall: "names-titles-acronyms",
      detector: all([W("Peru")], W("Perú")),
      comment: "The English country name is Peru, without the Spanish accent.",
      ok: "Peru",
      no: "Perú",
    },
  ],
  "pmd-p01-04": [
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("unredeemed", "irredentist")]),
      comment: "irredento is unredeemed, or irredentist in that political sense. A calque that leaves the Spanish word unexplained misses it.",
      ok: "an unredeemed country",
      no: "an irredento country",
      lemma: "irredento",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("caudillo", "strongman", "strong man", "warlord")], "\\bcowboys?\\b"),
      comment: "caudillo stays, or becomes strongman. cowboy is the wrong picture.",
      ok: "an exceptional caudillo",
      no: "an exceptional cowboy",
      lemma: "caudillo",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss(CHATTY),
      comment: "Keep the elevated essay tone.",
      ok: "awaiting salvation at the hands of",
      no: "waiting on some awesome cowboy",
    },
  ],
  "pmd-p01-05": [
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss(CHATTY),
      comment: "Closing essay voice stays formal. Do not chat it up.",
      ok: "Nevertheless, the new Peru has not adopted",
      no: "Yeah, the new Peru is gonna",
    },
    {
      category: "SP",
      weight: 1,
      pitfall: "names-titles-acronyms",
      detector: all([W("Peru")], W("Perú")),
      comment: "Write Peru. Do not invent a political spin the source does not make, and do not keep the Spanish accent.",
      ok: "the new Peru",
      no: "the new Perú",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "register",
      detector: all([W("realism"), W("corruption"), W("democracy")]),
      comment: "sano realismo stays, and so does the double struggle: against corruption and for democracy.",
      ok: "a healthy realism … against corruption and for democracy",
      no: "people still want change",
    },
  ],
  "pmd-p02-01": [
    {
      category: "U",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all(
        [words("Ministry of Defense", "Defense Ministry", "Defense Department")],
        "(?:^|\\n)\\s*Defense analyzes\\b"
      ),
      comment: "Defensa in this headline is the Defense Ministry, not an abstract noun. Defense analyzes copies the Spanish shorthand.",
      ok: "The Defense Ministry is reviewing military pay",
      no: "Defense analyzes military pay",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(
        [words("guideline", "guidelines", "pay scale", "wage scale", "salary scale")],
        words("salary pattern", "wage pattern", "pay pattern")
      ),
      comment: "pauta salarial is a wage or pay guideline, not a salary pattern.",
      ok: "above the wage guideline",
      no: "above the salary pattern",
      lemma: "pauta salarial",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("emerged", "reported", "leaked", "became known", "was learned")],
        "\\btranscend(?:ed|s|ing)?\\b"
      ),
      comment: "trascendió means it was reported or it emerged. transcended is the false friend.",
      ok: "according to what emerged yesterday",
      no: "according to what transcended yesterday",
      lemma: "trascendió",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(
        [words("reliable source", "reliable sources", "trusted source", "trusted sources", "well-placed source", "well-placed sources")],
        words("secure source", "secure sources")
      ),
      comment: "fuentes seguras are reliable sources, not secure sources.",
      ok: "reliable sources",
      no: "secure sources",
      lemma: "fuentes seguras",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "numbers-separators",
      detector: all(["\\b15\\b", "\\bpercent\\b|%"], "\\bDefence\\b"),
      comment: "15 por ciento is 15 percent (or 15%). The ministry spelling in US English is Defense, not Defence.",
      ok: "15 percent … Ministry of Defense",
      no: "15 per cent … Ministry of Defence",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all([W("Buenos Aires"), W("La Voz")]),
      comment: "Keep the dateline and the outlet: Buenos Aires, La Voz.",
      ok: "Buenos Aires, La Voz",
      no: "A Buenos Aires paper",
    },
  ],
  "pmd-p02-02": [
    {
      category: "O",
      weight: 8,
      pitfall: "names-titles-acronyms",
      detector: all([`Borr[aá]s`]),
      comment: "Transfer Raúl Borrás, with the accent or without, but do not drop the surname.",
      ok: "Minister Raúl Borrás",
      no: "the minister",
      lemma: "Borrás",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss(CHATTY),
      comment: "News-wire voice. No essay flourishes and no chatty markers.",
      ok: "Another subject under constant review",
      no: "So yeah, another awesome topic",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: miss("\\b(?:DOD|DoD|Pentagon|MoD)\\b", "u"),
      comment: "Do not invent a US or UK ministry nickname (DOD, Pentagon, MoD) for this Argentine office.",
      ok: "the team led by Minister Raúl Borrás",
      no: "the Pentagon team led by Borrás",
    },
  ],
  "pmd-p02-03": [
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(
        [words("submission", "submissions", "filing", "filings", "request", "requests", "petition", "petitions")],
        "\\bpresentations?\\b|\\bPowerPoint\\b|\\bslide deck\\b"
      ),
      comment: "presentaciones here are budget submissions or requests, not slide decks.",
      ok: "similar submissions",
      no: "similar presentations",
      lemma: "presentaciones",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all([words("emerged", "reported", "leaked", "became known")], "\\btranscend(?:ed|s|ing)?\\b"),
      comment: "No ha trascendido means it has not emerged or been reported, not that it has not transcended.",
      ok: "it has not emerged",
      no: "it has not transcended",
      lemma: "trascendido",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "numbers-separators",
      detector: all(["\\b20\\b", "\\bpercent\\b|%", words("only", "just", "mere")]),
      comment: "20 por ciento is 20 percent. sólo means only.",
      ok: "only 20 percent",
      no: "20 por ciento",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all(["\\bArmy\\b"]),
      comment: "Ejército is the Army, named as an institution.",
      ok: "the Army calculates",
      no: "the service calculates",
    },
  ],
  "pmd-p02-04": [
    {
      category: "T",
      weight: 8,
      pitfall: "numbers-separators",
      detector: all([`${W("3,801")}|\\b3801\\b`], W("3.801")),
      comment: "3.801 millones uses a Spanish thousands dot. US English is 3,801 million. Leaving 3.801 changes the value.",
      ok: "3,801 million dollars",
      no: "3.801 million dollars",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "numbers-separators",
      detector: all([words("December", "Dec."), "\\b31\\b"], "\\b(?:19|20)\\d{2}\\b"),
      comment: "31 de diciembre último is last December 31. Do not invent a year the source does not give.",
      ok: "as of last December 31",
      no: "as of December 31, 1984",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "quotes-asides",
      detector: all(["…|\\.\\.\\."]),
      comment: "The source ellipsis marks a cut. Keep … or ... so the gap is not filled with invented text.",
      ok: "the external debt … stood at",
      no: "the external debt, including classified annexes, stood at",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: all([words("Ministry of Defense", "Defense Ministry", "Defense Department")], "\\bDefence\\b"),
      comment: "US spelling is Ministry of Defense, not Defence.",
      ok: "Ministry of Defense",
      no: "Ministry of Defence",
    },
  ],
  "pmd-p02-05": [
    {
      category: "O",
      weight: 4,
      pitfall: "quotes-asides",
      detector: all([
        '"[^"]+"[\\s\\S]*"[^"]+"',
        "\\bminister\\b",
        "\\btraining\\b",
        "\\bminimum\\b",
      ]),
      comment: "Keep both quoted blocks and the minister's attribution. Training and the minimum-operation line are in those quotes.",
      ok: '"are suffering degradation in training …" "… minimum operation …," the minister added',
      no: "The minister said the budget is tight.",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all([W("Armed Forces")]),
      comment: "Fuerzas Armadas is the Armed Forces.",
      ok: "the Armed Forces",
      no: "the military services",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "quotes-asides",
      detector: all([words("equipment", "materiel", "matériel", "decapitalization", "decapitalisation", "capital equipment")]),
      comment: "descapitalización en el equipamiento has to survive. Dropping the equipment half is an omission.",
      ok: "degradation in training and a loss of equipment",
      no: "degradation in training",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss(CHATTY),
      comment: "News register. Nested quotes stay; chatty asides do not belong.",
      ok: "the minister added",
      no: "the minister was like",
    },
  ],
  "pmd-p02-06": [
    {
      category: "P",
      weight: 2,
      pitfall: "numbers-separators",
      detector: all([W("2.7")], W("2,7")),
      comment: "2,7 is a Spanish decimal comma. US English writes 2.7.",
      ok: "2.7 percent",
      no: "2,7 percent",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all(["\\bGDP\\b|gross domestic product"], "\\bPBI\\b"),
      comment: "Producto Bruto Interno in this Argentine copy is GDP. Do not leave PBI in the English.",
      ok: "3 percent of GDP",
      no: "3 percent of PBI",
      lemma: "PBI",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: all(["\\b3\\b", "\\bpercent\\b|%"], "\\bper cent\\b"),
      comment: "Use US percent (or %). per cent is the British split form.",
      ok: "3 percent … 2.7 percent",
      no: "3 per cent",
    },
  ],
  "pmd-p03-01": [
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("sweet potato", "sweet potatoes")], "\\byams?\\b"),
      comment: "camote in this Mexican food-science copy is sweet potato, not yam, and not left unglossed.",
      ok: "sweet potato flour",
      no: "yam flour",
      lemma: "camote",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: all(["\\bglycemic\\b"], "\\bglycaemic\\b"),
      comment: "índice glucémico is glycemic index, with US spelling.",
      ok: "a low glycemic index",
      no: "a low glycaemic index",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bdiets?\\b"], "\\bregimes?\\b"),
      comment: "regímenes especiales are special or restricted diets, not political regimes.",
      ok: "people on special diets",
      no: "people on special regimes",
      lemma: "regímenes",
    },
  ],
  "pmd-p03-02": [
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all([W("National Polytechnic Institute"), "\\bIPN\\b"]),
      comment: "The source expands IPN on first use: National Polytechnic Institute (IPN). Keep both. Do not invent a different English acronym.",
      ok: "the National Polytechnic Institute (IPN)",
      no: "NPI students",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("blueberry", "blueberries")], "\\bcranberry\\b|\\bcranberries\\b"),
      comment: "arándanos in this Mexican food-science piece are blueberries, not the automatic cranberry reading.",
      ok: "sweet potato, chia, and blueberries",
      no: "sweet potato, chia, and cranberries",
      lemma: "arándanos",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([words("sweet potato", "sweet potatoes"), "omega[\\s-]?3"]),
      comment: "camote is sweet potato again, and Omega 3 stays.",
      ok: "sweet potato … omega-3",
      no: "camote … omega",
      lemma: "camote",
    },
  ],
  "pmd-p03-03": [
    {
      category: "G",
      weight: 2,
      pitfall: "pos-syntax",
      detector: all(
        ["\\bceliac\\b", "\\bdiabet"],
        words("celiac women", "diabetic women", "female celiacs")
      ),
      comment: "celiacas y diabéticas are people with celiac disease and diabetes. Inclusive English, unless the source clearly means women only — it does not.",
      ok: "people with celiac disease and people with diabetes",
      no: "celiac women and diabetic women",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([W("gluten")]),
      comment: "The gluten-intolerant gloss is in the source. Do not drop it.",
      ok: "gluten intolerant (with celiac disease)",
      no: "people with celiac disease",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "technical-precision",
      detector: miss(CHATTY),
      comment: "Keep the technical diet register.",
      ok: "many restrictions in their diet",
      no: "tons of food rules",
    },
  ],
  "pmd-p03-04": [
    {
      category: "O",
      weight: 8,
      pitfall: "names-titles-acronyms",
      detector: all([W("Tania"), W("Morales Flores"), "Adri[aá]n", W("Olvera Campos")]),
      comment: "Keep both full names: Tania Yatziry Morales Flores and Adrián Olvera Campos. Do not reorder or shorten them away.",
      ok: "Tania Yatziry Morales Flores and Adrián Olvera Campos",
      no: "the creators",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["dyslipid"], "dislipid"),
      comment: "dislipidemias is dyslipidemias. The parenthetical high-cholesterol gloss may stay. Do not copy the Spanish spelling.",
      ok: "dyslipidemias (high blood cholesterol)",
      no: "dislipidemias",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bpregnant\\b"]),
      comment: "incluso… embarazadas is in the source. Pregnant people stay in the list.",
      ok: "and even for pregnant women",
      no: "for people with obesity and dyslipidemias",
    },
  ],
  "pmd-p03-05": [
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all([
        words("Interdisciplinary Health Center", "Interdisciplinary Center of Health", "Interdisciplinary Center for Health"),
        "\\bCICS\\b",
        W("Milpa Alta"),
      ]),
      comment: "Expand CICS as in the source and keep the Milpa Alta unit. US spelling is Center, not Centre.",
      ok: "the Interdisciplinary Health Center (CICS), Milpa Alta unit",
      no: "the CICS",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: all(["\\bB6\\b", "\\bglycemic\\b"], "\\bglycaemic\\b"),
      comment: "vitamina B6 is vitamin B6. glycemic takes the US spelling.",
      ok: "low glycemic index … vitamin B6",
      no: "low glycaemic index",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([
        words("fiber", "fibre"),
        "carbohydrate",
        W("starch"),
        words("glucose", "sugar"),
        "blood",
      ]),
      comment: "The repeated glycemic explanation is still source content. Fiber, carbohydrate, starch, and the blood-sugar clause stay. Deleting the repeat is an omission.",
      ok: "fiber, carbohydrates, and starch … releases glucose into the bloodstream",
      no: "It has a low glycemic index and vitamin B6.",
    },
  ],
  "pmd-p03-06": [
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("blueberry", "blueberries")], "\\bcranberry\\b|\\bcranberries\\b"),
      comment: "arándanos again: blueberries in this Mexican food-science sense.",
      ok: "Blueberries add fiber",
      no: "Cranberries add fiber",
      lemma: "arándanos",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bLDL\\b"]),
      comment: "colesterol malo o LDL needs the LDL label, not only a paraphrase that drops the abbreviation.",
      ok: "LDL (\"bad\") cholesterol",
      no: "bad cholesterol",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([
        W("glutamic"),
        W("arginine"),
        W("leucine"),
        W("valine"),
        W("serine"),
        words("flavonoid", "flavonoids"),
      ]),
      comment: "The amino-acid list and the flavonoid gloss are source content. Dropping them is an omission.",
      ok: "glutamic acid, arginine, leucine, valine, and serine … flavonoids",
      no: "Chia has omega-3 and antioxidants.",
    },
  ],
  "pmd-p03-07": [
    {
      category: "U",
      weight: 2,
      pitfall: "regional-lexicon",
      detector: all([words("pancake", "pancakes", "hotcake", "hotcakes", "hot cake", "hot cakes")]),
      comment: "hot cakes is already English. Pick pancakes, hotcakes, or hot cakes and keep that baking item.",
      ok: "used to make pancakes",
      no: "used to make hot breads",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "regional-lexicon",
      detector: all([words("cupcake", "cupcakes", "pound cake", "pound cakes")], "panqu[eé]s"),
      comment: "panqués in Mexican bakery copy is cupcakes or pound cake. Do not leave panqués / panques in the English.",
      ok: "cookies, cupcakes, and cakes",
      no: "cookies, panques, and cakes",
      lemma: "panqués",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all(["\\bCICS\\b", W("Milpa Alta")]),
      comment: "The pilot plants are at CICS Milpa Alta. Keep the site.",
      ok: "CICS Milpa Alta pilot plants",
      no: "the campus pilot plants",
    },
  ],
  "pmd-p04-01": [
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("apartment", "apartments", "flat", "flats")],
        "\\bdepartments?\\b|\\bdepartamento\\b"
      ),
      comment: "departamento in this Mexican consumer copy is an apartment, not a government department.",
      ok: "a house or an apartment",
      no: "a house or a department",
      lemma: "departamento",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all([words("down payment", "down-payment", "downpayment")], "\\bhooks?\\b"),
      comment: "enganche is a down payment, not a hook.",
      ok: "a down payment on a car",
      no: "a hook for a car",
      lemma: "enganche",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: all([YOU]),
      comment: "The source is tú. Keep second-person you.",
      ok: "Are you thinking about buying",
      no: "The consumer who considers buying",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: miss("\\bflats?\\b"),
      comment: "US English is apartment. flat is British.",
      ok: "an apartment",
      no: "a flat",
    },
  ],
  "pmd-p04-02": [
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all([
        words("National Survey of Financial Inclusion", "National Financial Inclusion Survey"),
        "\\bENIF\\b",
      ]),
      comment: "Expand ENIF as in the source: National Survey of Financial Inclusion (ENIF). Do not invent a new English acronym and drop ENIF.",
      ok: "the National Survey of Financial Inclusion (ENIF)",
      no: "the NSFI",
    },
    {
      category: "O",
      weight: 2,
      pitfall: "names-titles-acronyms",
      detector: all([
        words("Main National and Regional Findings", "Principales hallazgos", "Main findings"),
        "\\b2018\\b",
      ]),
      comment: "Keep a consistent title strategy: translate the survey title or keep the Spanish and gloss it. The 2018 year stays either way.",
      ok: "'Main National and Regional Findings 2018'",
      no: "the 2018 report",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "numbers-separators",
      detector: all(["\\b22\\b", "\\b9\\b", "\\b4\\b", "\\b2018\\b"]),
      comment: "Keep the three shares and the year: 22%, 9%, 4%, and 2018. Percent signs or the word percent both work if the numerals stay.",
      ok: "22% … 9% … 4% … 2018",
      no: "about a fifth, some, and a few",
    },
  ],
  "pmd-p04-03": [
    {
      category: "O",
      weight: 8,
      pitfall: "names-titles-acronyms",
      detector: all(["\\bSaracho\\b"]),
      comment: "Keep Alejandro Saracho's name.",
      ok: "Alejandro Saracho",
      no: "a finance expert",
      lemma: "Saracho",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all(
        [words("Reconfiguración Financiera", "Financial Reconfiguration")],
        "best-?seller[\\s\\S]{0,80}best seller|best seller[\\s\\S]{0,80}best-?seller"
      ),
      comment: "Translate the book title or keep the Spanish title and gloss it, and do not mix bestseller with best seller in the same rendering.",
      ok: "the bestseller 'Reconfiguración Financiera'",
      no: "his bestseller best seller",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all([words("capital", "funds", "money")], words("capital city")),
      comment: "capital here is funds or money, not a capital city.",
      ok: "mishandling funds",
      no: "mishandling the capital city",
      lemma: "capital",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: miss("\\bhereby\\b|\\bpursuant\\b|" + CHATTY),
      comment: "Consumer-advice register: plain US prose, not hereby / pursuant and not chatty slang.",
      ok: "it is not something to take lightly",
      no: "you are hereby notified",
    },
  ],
  "pmd-p04-04": [
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(["\\bmortgages?\\b"], "\\bhypothec"),
      comment: "crédito hipotecario is a mortgage. hypothecary is the false friend.",
      ok: "a mortgage",
      no: "a hypothecary credit",
      lemma: "hipotecario",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(["\\bapps?\\b"], "\\bapplications?\\b"),
      comment: "aplicación here is a mobile app, not an application.",
      ok: "the free Monthly Budget app",
      no: "the free monthly budget application",
      lemma: "aplicación",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: all([YOU]),
      comment: "The source addresses the reader as tú. Keep you, and do not drop content while you tidy the long sentence.",
      ok: "so you know how much you can pay",
      no: "so the user knows the monthly figure",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "pos-syntax",
      detector: all([W("Android"), "\\biOS\\b"]),
      comment: "Android and iOS stay as written. Do not rename the platforms.",
      ok: "for Android and iOS",
      no: "for mobile phones",
    },
  ],
  "pmd-p04-05": [
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: all([YOU]),
      comment: "Advice voice stays second person.",
      ok: "when you apply for a loan, you think",
      no: "when one applies for a loan, one thinks",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all(["\\bSaracho\\b"]),
      comment: "Alejandro Saracho is named again. Keep the name.",
      ok: "Alejandro Saracho recommends",
      no: "The author recommends",
      lemma: "Saracho",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "register",
      detector: all([words("useful life", "service life", "working life", "usable life")]),
      comment: "vida útil is useful life or service life: how long the thing lasts, set against how long you will be paying.",
      ok: "the useful life of what you are buying",
      no: "the useful life cycle paradigm",
    },
  ],
  "pmd-p05-01": [
    {
      category: "T",
      weight: 8,
      pitfall: "source-defects",
      detector: all(
        ["\\b(?:speak|speaks|speaking|talk|talks|talking|mention|mentions|mentioned|claim|claims)\\b"],
        "\\bhad even\\b|hab[ií]an"
      ),
      comment: "habían incluso is a source defect for hablan incluso. They speak of an improvement. Do not translate the typo as had.",
      ok: "and even speak of a notable improvement",
      no: "and there had even been a notable improvement",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "source-defects",
      detector: all([words("encouraging", "hopeful", "promising")], "esperanzado4"),
      comment: "esperanzado4res is a broken esperanzadores. Restore encouraging / hopeful. Never translate the OCR garbage.",
      ok: "some encouraging flashes",
      no: "some esperanzado4res flashes",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("programming", "schedule", "lineup")],
        "\\bcoding\\b|\\bprogrammer\\b"
      ),
      comment: "programación here is TV programming or the schedule, not software coding.",
      ok: "our humor programming",
      no: "our humor coding",
      lemma: "programación",
    },
    {
      category: "O",
      weight: 8,
      pitfall: "names-titles-acronyms",
      detector: all([W("Wilfredo"), W("Cancio Isla"), "\\bUNEAC\\b"]),
      comment: "Keep the byline Wilfredo Cancio Isla and the acronym UNEAC. Expand UNEAC only if you also keep the acronym.",
      ok: "by Wilfredo Cancio Isla … the UNEAC Tertulia",
      no: "by the author … the writers' union",
    },
    {
      category: "G",
      weight: 4,
      pitfall: "source-defects",
      detector: all(["there (?:have|has) been|there were"], "\\bhumour\\b"),
      comment: "ha habido is existential: there have been. humor takes US spelling, not humour.",
      ok: "there have been some encouraging flashes",
      no: "there humour had been",
    },
  ],
  "pmd-p05-02": [
    {
      category: "T",
      weight: 8,
      pitfall: "source-defects",
      detector: all([words("appeared", "appearing", "debuted")], "aparacido"),
      comment: "aparacido is a broken aparecido. New programs have appeared. Do not copy the typo.",
      ok: "New programs have appeared",
      no: "New programs have aparacido",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "quotes-asides",
      detector: all([W("exquisite"), W("necessary"), "[—–]|--"]),
      comment: "Keep the em-dash parenthetical: exquisite—necessary—.",
      ok: "the exquisite—necessary—level",
      no: "the exquisite and necessary level",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "quotes-asides",
      detector: all([W("street")]),
      comment: "The aside ¡al fin el humor a la calle! is easy to drop. Humor out on the street has to stay.",
      ok: "(humor out on the street at last!)",
      no: "breaking with old formulas",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("production", "producing")],
        "\\brealizations?\\b|\\brealisations?\\b"
      ),
      comment: "realización here is television production, not realization.",
      ok: "television humor production",
      no: "the realization of television humor",
      lemma: "realización",
    },
  ],
  "pmd-p05-03": [
    {
      category: "U",
      weight: 4,
      pitfall: "register",
      detector: all(
        [W("socialist"), W("Marx")],
        words("so-called socialist", "evil empire")
      ),
      comment: "Transfer sociedad socialista and Marx in a neutral register. Do not editorialize.",
      ok: "in our socialist society … Marx spoke",
      no: "in our so-called socialist society",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "source-defects",
      detector: all([words("laughable", "ridiculous", "risible", "absurd")], "risibiles"),
      comment: "risibiles is a typo for risibles. Use laughable, ridiculous, or risible. Do not copy the broken spelling.",
      ok: "laughable types",
      no: "risibiles types",
    },
    {
      category: "P",
      weight: 2,
      pitfall: "quotes-asides",
      detector: all([W("satire"), W("irony"), words("comic", "comical"), "[—–]|--"]),
      comment: "Keep the dash appositive: humor, satire, and irony—forms of the comic—.",
      ok: "satire, and irony—forms of the comic—",
      no: "Humor, satire, and irony have to",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "register",
      detector: miss("\\bhumour\\b"),
      comment: "US spelling is humor, not humour.",
      ok: "Humor, satire, and irony",
      no: "Humour, satire, and irony",
    },
  ],
  "pmd-p05-04": [
    {
      category: "T",
      weight: 8,
      pitfall: "false-friends",
      detector: all(
        [words("participation", "input", "help", "assistance", "contribution")],
        "\\bcontests?\\b|\\bcompetitions?\\b|\\bpageants?\\b"
      ),
      comment: "concurso here is help, participation, or input, not a contest.",
      ok: "needs the participation and collaboration",
      no: "needs the contest and the collaboration",
      lemma: "concurso",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "register",
      detector: all(
        [words("stakeholder", "stakeholders", "parties", "factors", "actors", "players")],
        "\\bfactories\\b"
      ),
      comment: "factores are stakeholders, parties, or factors. factories is the wrong word.",
      ok: "every possible stakeholder",
      no: "every possible factory",
      lemma: "factores",
    },
    {
      category: "SP",
      weight: 2,
      pitfall: "us-spelling",
      detector: miss("\\bhumour\\b|" + CHATTY),
      comment: "US humor, and an opinion column's register — not humour, and not chatty slang.",
      ok: "humorous wealth",
      no: "humour, gonna",
    },
  ],
  "pmd-p06-01": [
    {
      category: "O",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all([
        words("Mexican Congress", "Congress of Mexico", "Mexico's Congress"),
        words("central bank", "Central Bank"),
      ]),
      comment: "Congreso mexicano is the Mexican Congress. Banco Central is the central bank.",
      ok: "the Mexican Congress … the central bank",
      no: "lawmakers questioned bankers",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([words("paper money", "paper currency", "banknote", "banknotes"), "\\bintrinsic\\b"]),
      comment: "papel moneda is paper money. valor intrínseco is intrinsic value.",
      ok: "paper money … no intrinsic value",
      no: "currency with no real value",
    },
    {
      category: "G",
      weight: 2,
      pitfall: "pos-syntax",
      detector: all([
        words("unusual", "unprecedented", "extraordinary", "remarkable"),
        words("worthy of study", "worth studying", "deserves study", "merits study"),
      ]),
      comment: "The source agreement glitch (inusitados y digno) becomes natural English: unusual and worthy of study. Do not add claims the source does not make.",
      ok: "one of the most unusual and worthy of study",
      no: "one of the most unusual and worthy of a constitutional crisis",
    },
    {
      category: "U",
      weight: 2,
      pitfall: "pos-syntax",
      detector: miss(CHATTY),
      comment: "Formal opinion register.",
      ok: "will go down in history",
      no: "is gonna go down in history",
    },
  ],
  "pmd-p06-02": [
    {
      category: "T",
      weight: 8,
      pitfall: "numbers-separators",
      detector: all(
        ["\\$35|\\bUSD\\s*35\\b|\\b35[ -]?dollars\\b|\\b35-dollar\\b", "\\bounces?\\b|\\boz\\b"],
        "\\b35\\s+ounces\\b|\\b35\\s+oz\\b|\\bper\\s+35\\s+ounces\\b"
      ),
      comment: "una onza por cada 35 dólares is one ounce per 35 dollars, or $35 per ounce. Do not swap the ratio.",
      ok: "one ounce per 35 dollars",
      no: "35 ounces per dollar",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "names-titles-acronyms",
      detector: all(["\\b1971\\b", words("United States", "U.S.")]),
      comment: "Keep 1971 and the United States (U.S. is fine).",
      ok: "In 1971, when the United States broke",
      no: "When America left the gold standard",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bgold\\b", "\\bdollars?\\b", "\\bback(?:ed|ing)?\\b|\\bconvertib"]),
      comment: "The gold-window sense stays: the dollar was no longer backed with gold.",
      ok: "broke the commitment to back its dollar with gold",
      no: "changed its currency policy",
    },
  ],
  "pmd-p06-03": [
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bfiat\\b"]),
      comment: "dinero fiat is fiat money. Keep the term.",
      ok: "Fiat money reigns",
      no: "Decree money reigns",
      lemma: "fiat",
    },
    {
      category: "U",
      weight: 4,
      pitfall: "register",
      detector: all([words("dogmatism", "dogma")]),
      comment: "Keep the elevated tone. dogmatismo stays dogmatism; do not soften it into a mild difference of opinion.",
      ok: "a dogmatism that nobody dares to question",
      no: "a viewpoint people rarely debate",
    },
  ],
  "pmd-p06-04": [
    {
      category: "T",
      weight: 4,
      pitfall: "false-friends",
      detector: all(["\\bdiscretion(?:ary)?\\b"], "discretionarity|discretionality|discrecional"),
      comment: "discrecionalidad is discretion or discretionary power, not discretionarity.",
      ok: "the authorities' discretionary power",
      no: "the authorities' discretionarity",
      lemma: "discrecionalidad",
    },
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all([words("debt receipt", "debt receipts", "IOU", "IOUs", "debt certificate", "debt certificates", "certificates of debt")]),
      comment: "recibos de deuda are debt receipts, IOUs, or debt certificates.",
      ok: "not mere debt receipts",
      no: "not mere receipts of owing",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "institutions-headlines",
      detector: all([
        words("Mexican Congress", "Congress of Mexico", "Mexico's Congress"),
        "\\bintrinsic\\b",
        W("private property"),
      ]),
      comment: "The Mexican Congress is the institution studying this. Keep intrinsic value and the private-property claim in the parallel coin series.",
      ok: "only in the Mexican Congress … intrinsic value … private property",
      no: "Lawmakers want an honest coin",
    },
  ],
  "pmd-p06-05": [
    {
      category: "T",
      weight: 4,
      pitfall: "technical-precision",
      detector: all(["\\bfiduciary\\b|\\bfiat\\b", "\\bin circulation\\b|\\bmoney supply\\b"]),
      comment: "circulante fiduciario is fiduciary or fiat currency in circulation, not the calque fiduciary circulating.",
      ok: "fiduciary currency in circulation",
      no: "fiduciary circulating",
      lemma: "circulante fiduciario",
    },
    {
      category: "O",
      weight: 4,
      pitfall: "pos-syntax",
      detector: all(["\\bparallels?\\b", "\\bcomplements?\\b|\\bcomplementary\\b"]),
      comment: "en paralelo and de forma complementaria are both in the source. Do not collapse them into one adverb.",
      ok: "in parallel and in a complementary way",
      no: "alongside the other currency",
    },
    {
      category: "T",
      weight: 8,
      pitfall: "pos-syntax",
      detector: all(["\\bsilver\\b", "\\b(?:not|n't|without)\\b[\\s\\S]{0,60}\\breplac"]),
      comment: "no se pretende sustituir is negative: the silver coin is not meant to replace currency already in circulation.",
      ok: "not meant to replace fiduciary currency in circulation",
      no: "meant to replace fiduciary currency in circulation",
    },
  ],
};

function build(rawItems: RawDrill[]): DrillItem[] {
  if (rawItems.length !== 32) {
    throw new Error(`private micro bank expected 32 items, got ${rawItems.length}`);
  }
  const specIds = Object.keys(SPECS);
  if (specIds.length !== rawItems.length) {
    throw new Error(`private micro traps ${specIds.length} != items ${rawItems.length}`);
  }
  return rawItems.map((item) => {
    if (item.private !== true || item.visibility !== "user-only" || item.publishable !== false) {
      throw new Error(`refusing ${item.id}: privacy flags are not user-only`);
    }
    if (item.mode !== "sentence" && item.mode !== "short-paragraph") {
      throw new Error(`refusing ${item.id}: mode ${item.mode}`);
    }
    if (wordCount(item.spanish_text) > 100) {
      throw new Error(`refusing ${item.id}: source is too long for a micro`);
    }
    const specs = SPECS[item.id];
    if (!specs) throw new Error(`missing traps for ${item.id}`);
    if (specs.length !== item.errors_to_catch.length) {
      throw new Error(`${item.id} traps ${specs.length} != errors ${item.errors_to_catch.length}`);
    }
    for (const spec of specs) {
      if (!item.focus_traps.includes(spec.pitfall)) {
        throw new Error(`${item.id} pitfall ${spec.pitfall} is not in focus_traps`);
      }
    }
    for (const tag of item.focus_traps) {
      if (!specs.some((spec) => spec.pitfall === tag)) {
        throw new Error(`${item.id} focus ${tag} has no trap`);
      }
    }
    const traps = specs.map((spec, index) => toTrap(item.id, index, spec, item.errors_to_catch[index]));
    const drill: DrillItem = {
      id: item.id,
      mode: "micro",
      bank: bankFor(traps[0]?.category ?? "T"),
      spanish: item.spanish_text,
      english: "",
      domain: item.source_passage_label,
      level: "ATA",
      focus: item.focus_traps.slice(),
      errors_to_catch: item.errors_to_catch.slice(),
      traps,
      coachHint: item.suggested_ok_english_hint,
      microShape: item.mode,
      sourceLabel: item.source_passage_label,
      why: item.why_this_chunk,
      gated: true,
    };
    if (drill.focus.join("|") !== item.focus_traps.join("|")) {
      throw new Error(`${item.id} focus drifted`);
    }
    if (drill.errors_to_catch.join("|") !== traps.map((trap) => trap.label).join("|")) {
      throw new Error(`${item.id} errors_to_catch drifted`);
    }
    return drill;
  });
}

export const PRIVATE_FRIEND_MICROS: DrillItem[] = build(rawJson as RawDrill[]);

export function privateFriendMicrosEnv(env: NodeJS.ProcessEnv = process.env): {
  devInclude: boolean;
  allowEmails: string[];
  configured: boolean;
} {
  const flag = (env.PRIVATE_FRIEND_MICROS || "").trim().toLowerCase();
  const devInclude = flag === "1" || flag === "true";
  const allowEmails = (env.PRIVATE_FRIEND_MICROS_EMAIL || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  return { devInclude, allowEmails, configured: devInclude || allowEmails.length > 0 };
}

export function allowPrivateFriendMicros(opts: {
  devInclude: boolean;
  allowEmails: string[];
  presentedEmail?: string | null;
}): boolean {
  if (opts.devInclude) return true;
  const allow = opts.allowEmails.map((email) => email.trim().toLowerCase()).filter(Boolean);
  const email = (opts.presentedEmail || "").trim().toLowerCase();
  if (!email || allow.length === 0) return false;
  return allow.includes(email);
}

export function presentedPrivateEmail(parts: {
  header?: string | string[];
  cookie?: string;
  bodyEmail?: string;
}): string {
  const header = Array.isArray(parts.header) ? parts.header[0] : parts.header;
  return (header || parts.cookie || parts.bodyEmail || "").trim().slice(0, 200);
}

export type PrivateAccess = "off" | "email" | "open";

export function privateAccessFor(env: NodeJS.ProcessEnv, presentedEmail: string): PrivateAccess {
  const config = privateFriendMicrosEnv(env);
  if (!config.configured) return "off";
  if (allowPrivateFriendMicros({ ...config, presentedEmail })) return "open";
  if (config.allowEmails.length > 0) return "email";
  return "off";
}

export function privateMicrosFor(env: NodeJS.ProcessEnv, presentedEmail: string): {
  access: PrivateAccess;
  items: DrillItem[];
} {
  const access = privateAccessFor(env, presentedEmail);
  return { access, items: access === "open" ? PRIVATE_FRIEND_MICROS : [] };
}

export function emailFromApi(req: NextApiRequest, bodyEmail = ""): string {
  return presentedPrivateEmail({
    header: req.headers[HEADER],
    cookie: req.cookies?.[COOKIE],
    bodyEmail,
  });
}

export function privateCookie(email: string, secure: boolean): string {
  const value = encodeURIComponent(email.trim().toLowerCase());
  const parts = [
    `${COOKIE}=${value}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=5184000",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function filterPrivateMicros(
  items: DrillItem[],
  opts: { shape?: string; focus?: string; itemId?: string; count?: number }
): DrillItem[] {
  let pool = items.filter((item) => item.gated);
  if (opts.itemId) {
    const one = pool.find((item) => item.id === opts.itemId);
    return one ? [one] : [];
  }
  if (opts.shape === "sentence" || opts.shape === "short-paragraph") {
    pool = pool.filter((item) => item.microShape === opts.shape);
  }
  if (opts.focus) pool = pool.filter((item) => item.focus.includes(opts.focus as string));
  if (opts.count && opts.count > 0) pool = pool.slice(0, opts.count);
  return pool;
}
