import { getMicro, MICROS, PASSAGE } from "../lib/drills";
import { PRIVATE_FRIEND_MICROS } from "../lib/privateFriendMicros";
import { gradeItem, gradePassage, GradeResult } from "../lib/scoring";
import { DrillItem } from "../lib/types";

function fail(message: string): never {
  throw new Error(message);
}

function assertInvariant(label: string, grade: GradeResult): void {
  if (grade.perfect && (grade.fired.length !== 0 || grade.points !== 0)) {
    fail(`${label}: perfect with fired=${grade.fired.length} points=${grade.points}`);
  }
  if (grade.points > 0 && grade.perfect) {
    fail(`${label}: points ${grade.points} but perfect`);
  }
  if (grade.fired.some((mark) => mark.weight > 0) && (grade.perfect || grade.points === 0)) {
    fail(`${label}: weighted mark hid behind perfect/0 (${grade.fired.map((mark) => mark.code).join("+")})`);
  }
}

function expectFired(label: string, grade: GradeResult, trapId: string): void {
  if (!grade.fired.some((mark) => mark.trapId === trapId && mark.weight > 0)) {
    fail(`${label}: expected ${trapId}, got ${grade.fired.map((mark) => mark.trapId).join(",") || "none"}`);
  }
}

function expectAbsent(label: string, grade: GradeResult, trapId: string): void {
  if (grade.fired.some((mark) => mark.trapId === trapId)) {
    fail(`${label}: ${trapId} should not fire (${grade.verdict})`);
  }
}

const congress = getMicro("1");
if (!congress) fail("missing item 1");

const reference = gradeItem(congress, congress.english);
assertInvariant("congress reference", reference);
if (!reference.perfect || reference.points !== 0 || reference.fired.length !== 0) {
  fail(`congress reference ${reference.verdict} points=${reference.points} fired=${reference.fired.map((m) => m.trapId).join(",")}`);
}
if (!reference.avoided.some((row) => row.trapId === "1-meet-with")) {
  fail("congress reference should avoid the armed meet-with trap");
}
expectAbsent("congress reference", reference, "builtin-name-diacritics");

const stripped = "Mexican Congressman Jose Ramirez met with the Secretary of State.";
const strippedGrade = gradeItem(congress, stripped);
assertInvariant("Jose Ramirez met with", strippedGrade);
if (!strippedGrade.perfect || strippedGrade.points !== 0 || strippedGrade.fired.length !== 0) {
  fail(`consistent Jose Ramirez should be Perfect, got ${strippedGrade.verdict} ${strippedGrade.fired.map((m) => m.code).join("+")}`);
}
if (!strippedGrade.avoided.some((row) => row.trapId === "1-meet-with")) {
  fail("Jose Ramirez + met with should avoid meet-with");
}
expectAbsent("Jose Ramirez", strippedGrade, "builtin-name-diacritics");

const badLine = "The Mexican Congressman Jose Ramirez met the Secretary of State.";
const bad = gradeItem(congress, badLine);
assertInvariant("congress bad line", bad);
if (bad.perfect || bad.points === 0) fail(`bad line scored Perfect/0: ${bad.verdict}`);
expectFired("bad line", bad, "1-title-article");
expectFired("bad line", bad, "1-meet-with");
const title = bad.fired.find((mark) => mark.trapId === "1-title-article");
const meet = bad.fired.find((mark) => mark.trapId === "1-meet-with");
if (!title || title.category !== "U" || title.code !== "U1" || title.weight !== 1) {
  fail(`title-article should stay U1, got ${title?.code}`);
}
if (!meet || meet.category !== "U" || meet.code !== "U1" || meet.weight !== 1) {
  fail(`meet-with should be U1, got ${meet?.code}`);
}
expectAbsent("bad line", bad, "1-congressman-caps");
expectAbsent("bad line", bad, "1-mexicano");
expectAbsent("bad line", bad, "builtin-name-diacritics");
if (bad.points !== 2) fail(`bad line points ${bad.points} (${bad.verdict})`);

for (const line of ["The Mexican Congressman Jose Ramirez met Secretary of State.", "He met the Secretary yesterday."]) {
  const grade = gradeItem(congress, line);
  assertInvariant(line, grade);
  expectFired(line, grade, "1-meet-with");
  if (grade.perfect) fail(`${line} was Perfect`);
}

const metWith = gradeItem(congress, "Mexican Congressman José Ramírez met with the Secretary of State.");
expectAbsent("met with", metWith, "1-meet-with");
if (!metWith.perfect) fail(`reference form not perfect: ${metWith.verdict}`);

const lower = gradeItem(congress, "Mexican congressman José Ramírez met with the secretary of state.");
assertInvariant("lowercase congressman", lower);
expectFired("lowercase congressman", lower, "1-congressman-caps");
if (!lower.fired.some((mark) => mark.trapId === "1-congressman-caps" && mark.category === "SP")) {
  fail("lowercase congressman must stay SP");
}
expectAbsent("lowercase congressman", lower, "1-title-article");
expectAbsent("lowercase congressman", lower, "1-meet-with");
expectAbsent("lowercase congressman", lower, "1-mexicano");
if (lower.perfect || lower.points === 0) fail("lowercase congressman must not be Perfect");

const dropped = gradeItem(congress, "Congressman José Ramírez met with the Secretary of State.");
assertInvariant("dropped mexicano", dropped);
expectFired("dropped mexicano", dropped, "1-mexicano");
if (!dropped.fired.some((mark) => mark.trapId === "1-mexicano" && mark.category === "O")) {
  fail(`nationality drop must stay O: ${dropped.verdict}`);
}
expectAbsent("dropped mexicano", dropped, "1-title-article");
expectAbsent("dropped mexicano", dropped, "1-meet-with");
if (dropped.perfect || dropped.points === 0) fail("nationality drop must not be Perfect");

for (const mixed of [
  "Mexican Congressman José Ramirez met with the Secretary of State.",
  "Mexican Congressman Jose Ramírez met with the Secretary of State.",
]) {
  const grade = gradeItem(congress, mixed);
  assertInvariant(mixed, grade);
  expectFired(mixed, grade, "builtin-name-diacritics");
  const mark = grade.fired.find((row) => row.trapId === "builtin-name-diacritics");
  if (!mark || mark.category !== "SP" || mark.weight !== 2) fail(`${mixed} diacritics ${mark?.code}`);
  expectAbsent(mixed, grade, "1-meet-with");
  if (grade.perfect || grade.points === 0) fail(`${mixed} was Perfect/0`);
}

const shortCircuit: DrillItem = {
  ...congress,
  acceptables: [...(congress.acceptables ?? []), badLine],
};
const hidden = gradeItem(shortCircuit, badLine);
assertInvariant("acceptable must not hide marks", hidden);
if (hidden.perfect || hidden.points === 0) {
  fail("acceptable short-circuited past U1 title-article and meet-with");
}
expectFired("short-circuit", hidden, "1-title-article");
expectFired("short-circuit", hidden, "1-meet-with");

const splice = getMicro("p-splice");
if (!splice) fail("missing p-splice");
const spliceBad = gradeItem(splice, "It rained hard, they canceled the game.");
assertInvariant("comma splice", spliceBad);
expectFired("comma splice", spliceBad, "p-splice-hit");
if (spliceBad.perfect || spliceBad.points === 0) fail("comma splice was Perfect/0");
const spliceBecause = gradeItem(splice, "Because it rained hard, they canceled the game.");
assertInvariant("because-clause", spliceBecause);
if (!spliceBecause.perfect) fail(`Because-clause should stay Perfect: ${spliceBecause.verdict}`);

const pope = getMicro("7");
if (!pope) fail("missing item 7");
const popeMet = gradeItem(pope, "Pope Francis met the Italian Prime Minister at the Vatican.");
assertInvariant("pope met the", popeMet);
if (!popeMet.perfect || popeMet.fired.some((mark) => mark.trapId === "1-meet-with")) {
  fail(`item 7 met the must stay an acceptable Perfect: ${popeMet.verdict}`);
}

const compromiso = getMicro("pos-compromiso");
if (!compromiso) fail("missing compromiso");
const committed = gradeItem(compromiso, "Committed to life");
assertInvariant("Committed to life", committed);
expectFired("Committed to life", committed, "pos-compromiso-job");
if (committed.perfect || committed.points < 4 || !committed.fired.some((mark) => mark.code === "T4")) {
  fail(`compromiso soft-scored ${committed.verdict} points=${committed.points}`);
}

const decimal = getMicro("9");
if (!decimal) fail("missing item 9");
const comma = gradeItem(decimal, "IBM announced an investment of 50,3 million dollars for the first quarter.");
assertInvariant("50,3", comma);
expectFired("50,3", comma, "9-decimal");
if (comma.perfect || comma.points === 0 || !comma.fired.some((mark) => mark.category === "P" && mark.weight > 0)) {
  fail(`decimal soft-scored ${comma.verdict}`);
}

function privateBad(id: string, text: string, suffix: string) {
  const item = PRIVATE_FRIEND_MICROS.find((row) => row.id === id);
  if (!item) fail(`missing ${id}`);
  const grade = gradeItem(item, text);
  assertInvariant(id, grade);
  expectFired(id, grade, `${id}:${suffix}`);
  if (grade.perfect || grade.points === 0) fail(`${id} soft-scored Perfect/0`);
}

privateBad(
  "pmd-p01-01",
  "Hope, said Spinoza, is a state of mind that come from the fear that our illusion will fail.",
  "3"
);
privateBad("pmd-p02-04", "The external debt stood at 3.801 million dollars on December 31, 1984.", "1");
privateBad("pmd-p06-02", "In 1971 the United States set the rate at 35 ounces per dollar.", "1");
privateBad("pmd-p04-01", "Are you buying a department, or putting a hook on a car?", "1");
privateBad("pmd-p05-04", "Cuban Television needs the contest and the collaboration of every stakeholder.", "1");

const sanchez = PRIVATE_FRIEND_MICROS.find((row) => row.id === "pmd-p01-03");
if (!sanchez) fail("missing pmd-p01-03");
const peruKept = gradeItem(
  sanchez,
  "Perhaps the clearest example of an optimistic thinker is José Faustino Sánchez Carrión, who, at the dawn of independence, never tired of preaching that Peru should be a republic, because any other regime would take us back to some form of colonial rule."
);
assertInvariant("Sánchez + Peru", peruKept);
expectAbsent("Sánchez + Peru", peruKept, "builtin-name-diacritics");
if (peruKept.points !== 0) {
  fail(`accented Sánchez with English Peru scored ${peruKept.points}: ${peruKept.fired.map((m) => m.trapId).join(",")}`);
}

for (const item of MICROS) {
  for (const text of [item.english, ...(item.acceptables ?? [])]) {
    const grade = gradeItem(item, text);
    assertInvariant(`${item.id} key`, grade);
    if (!grade.perfect || grade.points !== 0 || grade.fired.length !== 0) {
      fail(`${item.id} key/acceptable not Perfect: ${grade.verdict} :: ${text}`);
    }
  }
}

const passage = gradePassage(PASSAGE, PASSAGE.english);
if (passage.verdict !== "Perfect" || passage.points !== 0 || passage.fired.length !== 0) {
  fail(`passage key ${passage.verdict} points=${passage.points}`);
}

console.log("grader goldens ok");
