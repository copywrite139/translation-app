import { ASK_PRESETS, buildArmedTraps, codesIn, explainAskWhy, parseAskWhyRequest, tutorSentences } from "../lib/askWhy";
import { getMicro } from "../lib/drills";
import { IEGS_TOPICS, matchTrapToIegs } from "../lib/iegsIndex";
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

const CORE_PRESETS = ["Why this code?", "What was the Spanish job?", "What's a clean fix?"] as const;
if (!ASK_PRESETS.includes("Where in IEGS?") || !ASK_PRESETS.includes("What does IEGS say?")) {
  fail(`missing IEGS chips: ${ASK_PRESETS.join(" | ")}`);
}

for (const preset of CORE_PRESETS) {
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

const capsPage = IEGS_TOPICS.find((topic) => topic.id === "capitalization-titles");
const commasPage = IEGS_TOPICS.find((topic) => topic.id === "commas");
const serialPage = IEGS_TOPICS.find((topic) => topic.id === "special-contexts");
if (capsPage?.page !== 14) fail(`capitalization TOC page ${capsPage?.page}`);
if (commasPage?.page !== 16) fail(`commas TOC page ${commasPage?.page}`);
if (serialPage?.page !== 21) fail(`serial-comma TOC page ${serialPage?.page}`);
for (const topic of IEGS_TOPICS) {
  for (const excerpt of topic.excerpts || []) {
    const masked = excerpt.text.replace(/\bU\.S\./g, "US").replace(/\betc\./gi, "etc");
    const sentences = masked.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 2) fail(`${topic.id}/${excerpt.id} excerpt is ${sentences.length} sentences`);
    if (excerpt.text.length > 500) fail(`${topic.id}/${excerpt.id} excerpt is too long`);
  }
}

const titleCaps = spellingArmed.find((row) => row.pitfall === "Lowercase title before a name");
if (!titleCaps) fail("missing title-before-name trap");
const titleHit = matchTrapToIegs(titleCaps);
if (titleHit?.topic.page !== 4 || titleHit.topic.id !== "abbreviated-forms") {
  fail(`title-before-name mapped to ${titleHit?.topic.id} p.${titleHit?.topic.page}`);
}
const titleWhere = explainAskWhy({
  trap: titleCaps,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Where in IEGS?",
  displayedPoints: lower.points,
});
if (!titleWhere.startsWith("IEGS 2025 p.4 — Abbreviated forms and titles.")) {
  fail(`title where did not lead with p.4:\n${titleWhere}`);
}
if (!/Such titles are written in initial caps/.test(titleWhere)) fail(`title where missed the quote:\n${titleWhere}`);
if (!/error category Spelling \(SP\)/.test(titleWhere)) fail(`title where missed the category line:\n${titleWhere}`);
if (/no page number stored/.test(titleWhere)) fail(`title where hid the page:\n${titleWhere}`);
if (!new RegExp(`does not change the ${lower.points} error points`).test(titleWhere)) {
  fail(`title where changed the score story:\n${titleWhere}`);
}
if (sentencesOf(titleWhere).length > 8) fail(`title where too long (${sentencesOf(titleWhere).length}):\n${titleWhere}`);
if (/\b(regrade|rescore)\b/i.test(titleWhere)) fail(`title where tried to rescore:\n${titleWhere}`);
console.log(`\n--- title where (${sentencesOf(titleWhere).length}) ---\n${titleWhere}`);

const titleWhy = explainAskWhy({
  trap: titleCaps,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Why this code?",
  displayedPoints: lower.points,
});
if (!/Spelling/.test(titleWhy) || !titleWhy.includes(titleCaps.code)) fail(`title why missed the fired trap:\n${titleWhy}`);
if (!/IEGS 2025 p\.4 — Abbreviated forms and titles/.test(titleWhy)) fail(`title why missed the locator:\n${titleWhy}`);
if (!/congressman/i.test(titleWhy)) fail(`title why missed the fired wording:\n${titleWhy}`);
if (!new RegExp(`does not change the ${lower.points} error points`).test(titleWhy)) fail(`title why changed the score:\n${titleWhy}`);
if (sentencesOf(titleWhy).length > 8) fail(`title why too long:\n${titleWhy}`);
console.log(`\n--- title why (${sentencesOf(titleWhy).length}) ---\n${titleWhy}`);

const natureItem = getMicro("5");
if (!natureItem) fail("missing item 5");
const natureCandidate = "Dr. García, head of the cardiology department, published a study in nature magazine.";
const natureGrade = gradeItem(natureItem, natureCandidate);
const natureMark = natureGrade.fired.find((mark) => mark.pitfall === "Publication caps");
if (!natureMark) fail(`expected publication caps, got ${natureGrade.fired.map((mark) => mark.pitfall).join(",")}`);
const natureArmed = buildArmedTraps(natureItem.traps, natureGrade.fired);
const natureTrap = natureArmed.find((row) => row.trapId === natureMark.trapId);
if (!natureTrap) fail("publication trap missing");
const natureWhere = explainAskWhy({
  trap: natureTrap,
  source: natureItem.spanish,
  candidate: natureCandidate,
  reference: natureItem.english,
  armedTraps: natureArmed,
  userQuestion: "Where in IEGS?",
  displayedPoints: natureGrade.points,
});
if (!natureWhere.startsWith("IEGS 2025 p.14 — Capitalization in headings and titles of works.")) {
  fail(`publication where page:\n${natureWhere}`);
}
if (!/title-case system for book titles/.test(natureWhere)) fail(`publication where missed the quote:\n${natureWhere}`);
if (/no page number stored/.test(natureWhere)) fail(`publication where hid the page:\n${natureWhere}`);
const natureUnit = natureGrade.points === 1 ? "error point" : "error points";
if (!new RegExp(`does not change the ${natureGrade.points} ${natureUnit}`).test(natureWhere)) {
  fail(`publication where changed the score:\n${natureWhere}`);
}
if (sentencesOf(natureWhere).length > 8) fail(`publication where too long (${sentencesOf(natureWhere).length}):\n${natureWhere}`);
console.log(`\n--- publication where (${sentencesOf(natureWhere).length}) ---\n${natureWhere}`);

const serialAnswer = ask("What does IEGS say about the serial comma?");
if (!serialAnswer.includes("IEGS 2025 p.21 — Special contexts (serial comma, dates, proper names, places, quotations, parentheses).")) {
  fail(`serial answer missed p.21:\n${serialAnswer}`);
}
if (!/may be either used or omitted unless omission would result in ambiguity or confusion/.test(serialAnswer)) {
  fail(`serial answer missed the quote:\n${serialAnswer}`);
}
if (!/does not add a mark/.test(serialAnswer)) fail(`serial answer invented a mark:\n${serialAnswer}`);
if (!/does not change the 4 error points already shown/.test(serialAnswer)) fail(`serial answer changed the score:\n${serialAnswer}`);
if (/\b(regrade|rescore)\b/i.test(serialAnswer)) fail(`serial answer tried to rescore:\n${serialAnswer}`);
const serialCodes = codesIn(serialAnswer).filter((code) => !armed.some((row) => row.code === code));
if (serialCodes.length) fail(`serial answer invented ${serialCodes.join(",")}`);
if (sentencesOf(serialAnswer).length > 8) fail(`serial answer too long:\n${serialAnswer}`);
console.log(`\n--- serial comma (${sentencesOf(serialAnswer).length}) ---\n${serialAnswer}`);

const noPage = ask("What does IEGS say?");
if (/\b(?:page|section|p\.)\s*\d+/i.test(noPage)) fail(`transfer IEGS chip invented a page:\n${noPage}`);
if (!/no page number stored/.test(noPage)) fail(`transfer IEGS chip should keep the empty pointer:\n${noPage}`);
if (!/does not change the 4 error points/.test(noPage)) fail(`transfer IEGS chip changed the score:\n${noPage}`);
console.log(`\n--- what IEGS says on transfer (${sentencesOf(noPage).length}) ---\n${noPage}`);

const titleArticle = spellingArmed.find((row) => row.pitfall === "Title-article usage");
if (!titleArticle || titleArticle.fired) fail("title-article should be armed and quiet on lowercase congressman");
if (matchTrapToIegs(titleArticle)) fail("title-article usage has no stored IEGS page");
const titleArticleWhere = explainAskWhy({
  trap: titleArticle,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Where in IEGS?",
  displayedPoints: lower.points,
});
if (/\bp\.\d+/.test(titleArticleWhere)) fail(`title-article invented a page:\n${titleArticleWhere}`);
if (!/no page number stored/.test(titleArticleWhere)) fail(`title-article hid the empty pointer:\n${titleArticleWhere}`);
if (!new RegExp(`does not change the ${lower.points} error points`).test(titleArticleWhere)) {
  fail(`title-article where changed the score:\n${titleArticleWhere}`);
}

function acceptedAsk(body: unknown) {
  const parsed = parseAskWhyRequest(body);
  if (parsed.ok) return parsed.value;
  throw new Error((parsed as { error: string }).error);
}

const perfect = gradeItem(congress, congress.english);
if (!perfect.perfect || perfect.points !== 0 || perfect.fired.length !== 0) {
  fail(`congress key should be perfect with nothing missed, got ${perfect.points} ${perfect.verdict}`);
}
if (!perfect.avoided.length) fail("perfect grade should list caught traps");
const perfectArmed = buildArmedTraps(congress.traps, perfect.fired);
for (const row of perfect.avoided) {
  const quiet = perfectArmed.find((trap) => trap.trapId === row.trapId);
  if (!quiet || quiet.fired) fail(`${row.code} should be armed and quiet`);
  if (quiet.code !== row.code) fail(`${row.trapId} code ${quiet.code} != ${row.code}`);
  const answer = explainAskWhy(
    acceptedAsk({
      trap: quiet,
      source: congress.spanish,
      candidate: congress.english,
      reference: congress.english,
      armedTraps: perfectArmed,
      userQuestion: "Why this code?",
      displayedPoints: perfect.points,
    })
  );
  const sentences = sentencesOf(answer);
  if (sentences.length < 4 || sentences.length > 8) fail(`${row.code} caught sentence count ${sentences.length}: ${answer}`);
  if (!/was armed and did not fire/.test(answer)) fail(`${row.code} caught answer missed the quiet fact:\n${answer}`);
  if (!/Spanish job:/.test(answer)) fail(`${row.code} caught answer missed the Spanish job:\n${answer}`);
  if (!/What English allows:/.test(answer)) fail(`${row.code} caught answer missed what English allows:\n${answer}`);
  if (!/IEGS\/ATA:/.test(answer)) fail(`${row.code} caught answer missed the IEGS angle:\n${answer}`);
  if (!/One clean fix:/.test(answer)) fail(`${row.code} caught answer missed the clean example:\n${answer}`);
  if (!/does not change the 0 error points already shown/.test(answer)) fail(`${row.code} caught answer changed the score:\n${answer}`);
  if (/\b(regrade|rescore|should be)\b/i.test(answer)) fail(`${row.code} caught answer tried to rescore`);
  const stray = codesIn(answer).filter((code) => !perfectArmed.some((trap) => trap.code === code));
  if (stray.length) fail(`${row.code} caught answer invented ${stray.join(",")}`);
  const hit = matchTrapToIegs(quiet);
  if (hit) {
    if (!answer.includes(`IEGS 2025 p.${hit.topic.page} — ${hit.topic.title}`)) {
      fail(`${row.code} caught answer missed its locator:\n${answer}`);
    }
  } else if (/\bp\.\d+/.test(answer)) {
    fail(`${row.code} caught answer invented a page:\n${answer}`);
  }
  console.log(`\n--- caught ${row.code} (${sentences.length}) ---\n${answer}`);
}

const unknown = parseAskWhyRequest({
  trap: { ...perfectArmed[0], trapId: "not-a-trap", fired: false },
  source: congress.spanish,
  candidate: congress.english,
  armedTraps: perfectArmed,
  userQuestion: "Why this code?",
  displayedPoints: 0,
});
if (unknown.ok) fail("unknown quiet trap should be rejected");
else if (!/not on the armed list/.test((unknown as { error: string }).error)) {
  fail(`unknown quiet trap error: ${(unknown as { error: string }).error}`);
}

const lied = parseAskWhyRequest({
  trap: { ...perfectArmed[0], fired: true },
  source: congress.spanish,
  candidate: congress.english,
  armedTraps: perfectArmed,
  userQuestion: "Why this code?",
  displayedPoints: 0,
});
if (lied.ok) fail("a quiet trap marked fired should be rejected");

if (!lower.fired.length) fail("bad congress grade should miss a trap");
const missed = spellingArmed.find((trap) => trap.fired);
if (!missed) fail("bad grade armed packet should include a fired trap");
acceptedAsk({
  trap: missed,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Why this code?",
  displayedPoints: lower.points,
});
const stillCaught = spellingArmed.find((trap) => !trap.fired);
if (!stillCaught) fail("bad grade should still have a caught trap");
acceptedAsk({
  trap: stillCaught,
  source: congress.spanish,
  candidate: "Mexican congressman José Ramírez met with the secretary of state.",
  reference: congress.english,
  armedTraps: spellingArmed,
  userQuestion: "Why this code?",
  displayedPoints: lower.points,
});

console.log("\nask-why ok");
