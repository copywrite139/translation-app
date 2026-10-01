import { getMicro, PASSAGE } from "../lib/drills";
import { gradeItem, gradePassage, chargeWeight, describeMark, assertReferenceClean } from "../lib/scoring";

const item = getMicro("pos-compromiso");
if (!item) throw new Error("missing compromiso item");

const bad = gradeItem(item, "Committed to life");
if (bad.perfect || bad.clean || bad.fired[0]?.code !== "T4") {
  throw new Error(`Committed to life graded ${bad.verdict} perfect=${bad.perfect}`);
}
if (gradeItem(item, "A commitment to life").points !== 0) throw new Error("noun key should be clean");
if (gradeItem(item, "Commitment to Life").points !== 0) throw new Error("title noun should be clean");
if (gradeItem(item, "A pledge to life").points !== 0) throw new Error("synonym noun should not be a transfer error");

const congress = getMicro("1");
if (!congress) throw new Error("missing item 1");
const lower = gradeItem(congress, "Mexican congressman José Ramírez met with the secretary of state.");
if (!lower.fired.some((f) => f.category === "SP")) throw new Error("lowercase titles should be SP");
if (lower.fired.some((f) => f.category === "O")) throw new Error("nationality is present");

const fragment = gradeItem(congress, "Mexican");
if (!fragment.blocksAdvance || !fragment.fired.some((f) => f.code === "O8")) {
  throw new Error(`fragment should be major O, got ${fragment.verdict}`);
}
if (/good start/i.test(JSON.stringify(fragment))) throw new Error("Good start leaked");

const noPeriod = gradeItem(congress, "Mexican Congressman José Ramírez met with the Secretary of State");
if (!noPeriod.fired.some((f) => f.trapId === "builtin-terminal")) {
  throw new Error(`missing period not flagged: ${noPeriod.verdict}`);
}
if (noPeriod.blocksAdvance) throw new Error("missing period must not lock the next sentence");

const congressKey = assertReferenceClean(congress);
if (congressKey) throw new Error(congressKey);
if (gradeItem(congress, congress.english).points !== 0) throw new Error("congress reference should score 0");

const titleArticle = gradeItem(
  congress,
  "The Mexican Congressman José Ramírez met with the Secretary of State."
);
const titleArticleCodes = titleArticle.fired.map((f) => f.code);
if (!titleArticle.fired.some((f) => f.trapId === "1-title-article" && f.code === "U1" && f.weight === 1)) {
  throw new Error(`title-article should be U1, got ${titleArticleCodes.join("+") || "none"}`);
}
if (titleArticle.fired.some((f) => f.category === "A" || f.category === "O")) {
  throw new Error(`title-article false A/O: ${titleArticleCodes.join("+")}`);
}
if (titleArticle.points !== 1) throw new Error(`title-article points ${titleArticle.points}`);

const titleArticleBare = gradeItem(
  congress,
  "The Congressman José Ramírez met with the Secretary of State."
);
if (!titleArticleBare.fired.some((f) => f.trapId === "1-title-article" && f.code === "U1")) {
  throw new Error(`The Congressman José should be U1: ${titleArticleBare.verdict}`);
}
if (!titleArticleBare.fired.some((f) => f.trapId === "1-mexicano" && f.category === "O")) {
  throw new Error(`dropping mexicano should stay O: ${titleArticleBare.verdict}`);
}
if (titleArticleBare.fired.some((f) => f.category === "A")) {
  throw new Error(`The Congressman José false addition: ${titleArticleBare.verdict}`);
}

const droppedNationality = gradeItem(
  congress,
  "Congressman José Ramírez met with the Secretary of State."
);
if (!droppedNationality.fired.some((f) => f.trapId === "1-mexicano" && f.category === "O")) {
  throw new Error(`omitting Mexican should be O: ${droppedNationality.verdict}`);
}
if (droppedNationality.fired.some((f) => f.trapId === "1-title-article" || f.category === "A")) {
  throw new Error(`omitting Mexican false U/A: ${droppedNationality.verdict}`);
}

if (lower.fired.some((f) => f.trapId === "1-title-article")) {
  throw new Error("lowercase congressman must stay on the caps trap");
}
if (!lower.fired.some((f) => f.trapId === "1-congressman-caps")) {
  throw new Error("lowercase congressman caps trap did not fire");
}

const lowerArticle = gradeItem(
  congress,
  "the Mexican congressman José Ramírez met with the Secretary of State."
);
if (lowerArticle.fired.some((f) => f.trapId === "1-title-article")) {
  throw new Error("lowercase congressman with the must not be U1");
}
if (!lowerArticle.fired.some((f) => f.trapId === "1-congressman-caps" && f.category === "SP")) {
  throw new Error(`lowercase congressman with the should stay SP: ${lowerArticle.verdict}`);
}
if (lowerArticle.fired.some((f) => f.category === "O" || f.category === "A")) {
  throw new Error(`lowercase congressman false O/A: ${lowerArticle.verdict}`);
}

const quoteItem = getMicro("4");
if (!quoteItem) throw new Error("missing item 4");
const curly = gradeItem(
  quoteItem,
  "\u201cThe situation is critical,\u201d declared the president of the European Central Bank."
);
if (curly.points !== 0) throw new Error(`curly quotes scored ${curly.points}: ${curly.fired.map((f) => f.trapId).join(",")}`);

const senator = getMicro("3");
if (!senator) throw new Error("missing item 3");
const senatorKey = gradeItem(senator, senator.english);
if (!senatorKey.perfect || senatorKey.points !== 0) throw new Error("senator reference should be perfect");
const senatorAlt = senator.acceptables?.[0];
if (!senatorAlt) throw new Error("missing senator acceptable");
const senatorAcceptable = gradeItem(senator, senatorAlt);
if (!senatorAcceptable.perfect || senatorAcceptable.points !== 0) {
  throw new Error("senator acceptable should be perfect");
}

function assertSpellingNearMiss(label: string, grade: ReturnType<typeof gradeItem>, expected: string) {
  const marks = grade.fired.filter((mark) => mark.builtin && mark.category === "SP");
  if (grade.clean || grade.perfect || grade.points === 0) {
    throw new Error(`${label} scored ${grade.verdict} perfect=${grade.perfect} points=${grade.points}`);
  }
  if (marks.length !== 1) {
    throw new Error(`${label} expected one SP builtin, got ${grade.fired.map((mark) => mark.trapId + ":" + mark.code).join(",") || "none"}`);
  }
  const mark = marks[0];
  if (mark.weight !== chargeWeight("SP", 1) || mark.weight > 4) {
    throw new Error(`${label} weight ${mark.weight}`);
  }
  if (mark.code !== `SP${mark.weight}`) throw new Error(`${label} code ${mark.code}`);
  if ((mark.okExample || "").toLowerCase() !== expected) {
    throw new Error(`${label} okExample ${mark.okExample}`);
  }
  if (grade.blocksAdvance) throw new Error(`${label} must not lock the next sentence`);
}

assertSpellingNearMiss(
  "critized",
  gradeItem(senator, "The Democratic senator from the state of California critized the Republican proposal."),
  "criticized"
);
assertSpellingNearMiss(
  "critized in acceptable wording",
  gradeItem(senator, "The Democratic senator from California critized the Republican proposal."),
  "criticized"
);
assertSpellingNearMiss(
  "propasal",
  gradeItem(senator, "The Democratic senator from the state of California criticized the Republican propasal."),
  "proposal"
);

const spellingFixture = {
  english: "The government published the report.",
  traps: [],
};
if (gradeItem(spellingFixture, spellingFixture.english).points !== 0) {
  throw new Error("government reference should be clean");
}
assertSpellingNearMiss(
  "goverment",
  gradeItem(spellingFixture, "The goverment published the report."),
  "government"
);
const spelledAcceptable = {
  english: "The government published the report.",
  acceptables: ["The goverment published the report."],
  traps: [],
};
const allowedTypo = gradeItem(spelledAcceptable, "The goverment published the report.");
if (!allowedTypo.perfect || allowedTypo.points !== 0) {
  throw new Error("listed acceptable spelling must stay perfect");
}

const paraphrase = gradeItem(senator, "The Democratic senator from California attacked the Republican bill.");
if (paraphrase.points !== 0 || paraphrase.fired.some((mark) => mark.trapId.startsWith("builtin-spelling"))) {
  throw new Error(`paraphrase scored ${paraphrase.verdict}`);
}
const inflected = gradeItem(
  senator,
  "The Democratic senator from the state of California criticize the Republican proposal."
);
if (inflected.fired.some((mark) => mark.category === "SP")) {
  throw new Error(`inflection scored ${inflected.verdict}`);
}
const partyNoun = gradeItem(
  senator,
  "The Democrat senator from the state of California criticized the Republican proposal."
);
if (partyNoun.fired.some((mark) => mark.trapId.startsWith("builtin-spelling"))) {
  throw new Error(`Democrat scored ${partyNoun.verdict}`);
}
const lowerParty = gradeItem(
  senator,
  "The democratic senator from the state of California criticized the Republican proposal."
);
if (!lowerParty.fired.some((mark) => mark.trapId === "3-democratic")) {
  throw new Error("party-name cap trap did not fire");
}
if (lowerParty.fired.some((mark) => mark.trapId.startsWith("builtin-spelling"))) {
  throw new Error("capitalization was also marked as a typo");
}

if (chargeWeight("P", 8) !== 4) throw new Error("P cap failed");
if (chargeWeight("SP", 16) !== 4) throw new Error("SP cap failed");
if (chargeWeight("T", 8) !== 8) throw new Error("T should keep 8");

const passage = gradePassage(PASSAGE, PASSAGE.english);
if (passage.points !== 0) throw new Error(`passage key ${passage.points}`);

const committedPassage = PASSAGE.english.replace("a commitment to the lives", "Committed to the lives");
const drifted = gradePassage(PASSAGE, committedPassage);
if (!drifted.fired.some((f) => f.code === "T4" && f.lemma === "compromiso")) {
  throw new Error(`passage compromiso drift missed: ${drifted.fired.map((f) => f.code).join(",")}`);
}

console.log("Committed to life");
console.log(bad.fired.map(describeMark).join("\n"));
console.log(`points=${bad.points} verdict=${bad.verdict} perfect=${bad.perfect}`);
console.log("ok");
