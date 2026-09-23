import { ASK_PRESETS, buildArmedTraps, codesIn, explainAskWhy, tutorSentences } from "../lib/askWhy";
import { getMicro } from "../lib/drills";
import { gradeItem } from "../lib/scoring";

function fail(message: string): never {
  throw new Error(message);
}

function sentencesOf(answer: string): string[] {
  return tutorSentences(answer);
}

const item = getMicro("pos-compromiso");
if (!item) fail("missing compromiso item");

const grade = gradeItem(item, "Committed to life");
const t4 = grade.fired.find((mark) => mark.code === "T4" && mark.lemma === "compromiso");
if (!t4) fail(`expected fired T4, got ${grade.fired.map((mark) => mark.code).join(",")}`);
if (grade.points !== 4) fail(`expected 4 points, got ${grade.points}`);

const armed = buildArmedTraps(item.traps, grade.fired);
const trap = armed.find((row) => row.trapId === t4.trapId);
if (!trap?.fired) fail("T4 missing from armed packet");

function ask(userQuestion: string) {
  return explainAskWhy({
    trap: trap!,
    source: item!.spanish,
    candidate: "Committed to life",
    reference: item!.english,
    armedTraps: armed,
    userQuestion,
    displayedPoints: grade.points,
  });
}

for (const preset of ASK_PRESETS) {
  const answer = ask(preset);
  const sentences = sentencesOf(answer);
  if (sentences.length < 4 || sentences.length > 8) {
    fail(`${preset} sentence count ${sentences.length}: ${answer}`);
  }
  if (!/noun/i.test(answer)) fail(`${preset} missed the noun job`);
  if (!/adjective or participle|part of speech/i.test(answer)) fail(`${preset} missed the POS change`);
  if (!/transfer/i.test(answer)) fail(`${preset} missed transfer`);
  if (!/not a style preference/i.test(answer)) fail(`${preset} did not rule out style preference`);
  if (!answer.includes("Committed to life")) fail(`${preset} missed the candidate`);
  if (!answer.includes("A commitment to life")) fail(`${preset} missed the clean fix`);
  if (!answer.includes("T4")) fail(`${preset} missed T4`);
  if (!/Standards pointer: printed ATA Into-English grading standards, error category Transfer \(T\)/.test(answer)) {
    fail(`${preset} missed the standards pointer`);
  }
  if (/\b(?:page|section|p\.)\s*\d+/i.test(answer)) fail(`${preset} invented a PDF locator`);
  if (!/does not change the 4 error points already shown/.test(answer)) fail(`${preset} restated the score wrong`);
  if (/certainly/i.test(answer)) fail(`${preset} used Certainly`);
  if (/\b(regrade|rescore|should be)\b/i.test(answer)) fail(`${preset} tried to rescore`);
  const stray = codesIn(answer).filter((code) => !armed.some((row) => row.code === code));
  if (stray.length) fail(`${preset} invented ${stray.join(",")}`);
  console.log(`\n--- ${preset} (${sentences.length}) ---\n${answer}`);
}

function assertGrounded(label: string, answer: string) {
  const sentences = sentencesOf(answer);
  if (sentences.length < 4 || sentences.length > 8) fail(`${label} sentence count ${sentences.length}: ${answer}`);
  if (/\b(?:page|section|p\.)\s*\d+/i.test(answer)) fail(`${label} invented a PDF locator:\n${answer}`);
  if (/certainly/i.test(answer)) fail(`${label} used Certainly`);
  if (/\b(regrade|rescore|should be)\b/i.test(answer)) fail(`${label} tried to rescore`);
  if (!/does not change the 4 error points already shown/.test(answer)) fail(`${label} changed the score story`);
  const stray = codesIn(answer).filter((code) => !armed.some((row) => row.code === code) && !codesIn(label).includes(code));
  if (stray.length) fail(`${label} invented ${stray.join(",")}`);
  console.log(`\n--- ${label} (${sentences.length}) ---\n${answer}`);
}

const compared = ask("But why is it Transfer and not Omission?");
assertGrounded("why Transfer not Omission", compared);
if (!/not Omission/.test(compared)) fail(`compare missed the contrast:\n${compared}`);
if (!/did not fire/.test(compared)) fail(`compare missed the quiet omission:\n${compared}`);
if (!/commitment, committed/.test(compared)) fail(`compare missed the armed omission rule:\n${compared}`);
if (!/Standards pointer: printed ATA Into-English grading standards, error category Transfer \(T\)/.test(compared)) {
  fail(`compare missed the standards pointer:\n${compared}`);
}
if (!/POS drift on noun heads/.test(compared)) fail(`compare missed the trap label:\n${compared}`);

const where = ask("Where do I find this reference point in the ATA Into English grading standards?");
assertGrounded("where in the standards", where);
if (!where.startsWith("Standards pointer:")) fail(`where answer did not lead with the pointer:\n${where}`);
if (!/error category Transfer \(T\)/.test(where)) fail(`where answer missed Transfer (T):\n${where}`);
if (!/no page number stored/.test(where)) fail(`where answer implied a page:\n${where}`);
if (!/Open that heading for T4/.test(where)) fail(`where answer missed the code heading:\n${where}`);

const quiet = ask("Why didn't the omission fire?");
if (!/did not fire/.test(quiet)) fail(`quiet answer missed the armed omission:\n${quiet}`);
if (!/commitment, committed, committing, pledge, dedication/.test(quiet)) fail(`quiet answer missed the armed spans:\n${quiet}`);
if (!quiet.includes("T4")) fail("quiet answer should point at the fired transfer");
if (/\b(U16|T8|SP8|G8)\b/.test(quiet)) fail(`quiet answer invented a code:\n${quiet}`);
if (sentencesOf(quiet).length > 8) fail(`quiet answer too long:\n${quiet}`);
console.log(`\n--- why didn't omission (${sentencesOf(quiet).length}) ---\n${quiet}`);

const unarmed = ask("Why didn't U16 fire?");
if (!/not on the armed list/.test(unarmed)) fail(`unarmed answer:\n${unarmed}`);
if (!unarmed.includes("U16")) fail("unarmed answer should name the asked code");
if (/collocation/i.test(unarmed)) fail("unarmed answer invented a usage explanation");
if (!/does not change the 4 error points/.test(unarmed)) fail("unarmed answer changed the score story");
if (sentencesOf(unarmed).length > 8) fail(`unarmed answer too long:\n${unarmed}`);
console.log(`\n--- unarmed (${sentencesOf(unarmed).length}) ---\n${unarmed}`);

const congress = getMicro("1");
if (!congress) fail("missing item 1");
const lower = gradeItem(congress, "Mexican congressman José Ramírez met with the secretary of state.");
const spelling = lower.fired.find((mark) => mark.category === "SP");
if (!spelling) fail("expected a spelling mark");
const spellingArmed = buildArmedTraps(congress.traps, lower.fired);
const spellingTrap = spellingArmed.find((row) => row.trapId === spelling.trapId);
if (!spellingTrap) fail("spelling trap missing");
const spellingAnswer = explainAskWhy({
  trap: spellingTrap,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Why this code?",
  displayedPoints: lower.points,
});
if (!/Spelling/.test(spellingAnswer)) fail(`spelling answer:\n${spellingAnswer}`);
if (/not a style preference/.test(spellingAnswer)) fail("spelling should not be framed as transfer");
if (sentencesOf(spellingAnswer).length > 8) fail(`spelling answer too long:\n${spellingAnswer}`);
const spellingStray = codesIn(spellingAnswer).filter((code) => !spellingArmed.some((row) => row.code === code));
if (spellingStray.length) fail(`spelling invented ${spellingStray.join(",")}`);
console.log(`\n--- spelling (${sentencesOf(spellingAnswer).length}) ---\n${spellingAnswer}`);

console.log("\nask-why ok");
