import { getMicro, PASSAGE } from "../lib/drills";
import { gradeItem, gradePassage, chargeWeight, describeMark } from "../lib/scoring";

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
