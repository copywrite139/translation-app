import fs from "fs";
import path from "path";
import handler from "../pages/api/private-micros";
import { corePractice, MICROS, selectMicros } from "../lib/drills";
import {
  allowPrivateFriendMicros,
  PRIVATE_FRIEND_MICROS,
  privateMicrosFor,
} from "../lib/privateFriendMicros";
import { gradeItem } from "../lib/scoring";

const root = path.join(__dirname, "..");

function fail(message: string): never {
  throw new Error(message);
}

if (MICROS.some((item) => item.id.startsWith("pmd-") || item.gated)) {
  fail("private micros leaked into MICROS");
}
if (corePractice().some((item) => item.id.startsWith("pmd-"))) fail("private micros leaked into the 15");
if (selectMicros({ bank: "private", count: 8, heat: {} }).length !== 0) {
  fail("selectMicros served the private bank from the public pool");
}
if (PRIVATE_FRIEND_MICROS.length !== 32) fail(`expected 32 private micros, got ${PRIVATE_FRIEND_MICROS.length}`);

const shapes = new Set(PRIVATE_FRIEND_MICROS.map((item) => item.microShape));
if (!shapes.has("sentence") || !shapes.has("short-paragraph")) fail(`shapes ${[...shapes].join(",")}`);

for (const item of PRIVATE_FRIEND_MICROS) {
  if (item.mode !== "micro") fail(`${item.id} mode ${item.mode}`);
  if (item.english !== "") fail(`${item.id} english was filled in`);
  if (!item.coachHint || item.coachHint.length > 400) fail(`${item.id} coach hint missing or too long`);
  if (!item.gated) fail(`${item.id} not gated`);
  if (item.traps.length !== item.errors_to_catch.length) fail(`${item.id} trap drift`);
  if (item.traps.map((trap) => trap.label).join("|") !== item.errors_to_catch.join("|")) {
    fail(`${item.id} labels drifted`);
  }
  const gradedHint = gradeItem(item, item.coachHint, { mode: "micro" });
  if (gradedHint.perfect) fail(`${item.id} hint was treated as an exact key`);
  const fragment = gradeItem(item, "Hello", { mode: "micro" });
  if (fragment.perfect || fragment.fired.some((mark) => mark.trapId === "builtin-major-o")) {
    fail(`${item.id} fragment used the public exact-key omission path`);
  }
}

const GOOD: Record<string, string> = {
  "pmd-p01-01":
    "Hope, the Jewish-Portuguese-Dutch philosopher Baruch Spinoza used to say, is one of those fickle states of mind that comes from the feeling that something good is going to happen. Hope then alternates with the fear that our expectations will not be fulfilled.",
  "pmd-p01-02":
    "The optimist lives in the expectation that his hope will become reality. The pessimist feels that the disaster, both feared and longed for, is about to overtake him.",
  "pmd-p01-03":
    "Perhaps the clearest example of an optimistic thinker is José Faustino Sánchez Carrión, who, at the dawn of independence, never tired of preaching that Peru should be a republic, because any other regime would take us back to some form of colonial rule.",
  "pmd-p01-04":
    "The idea took hold in collective mentalities that Peru was an unredeemed country waiting for salvation at the hands of some exceptional caudillo.",
  "pmd-p01-05":
    "Nevertheless, the new Peru has not made its own the sense of powerlessness and low self-esteem that so marked our country in the past. A healthy realism still exists among the people, leading them to feel that the fight against corruption and for democracy is the only way forward.",
  "pmd-p02-01":
    "Buenos Aires, La Voz\n\nThe Defense Ministry is reviewing military pay\n\nThe possibility of granting a real improvement in military personnel pay is being studied by the Ministry of Defense, which is considering a proposal for a 15 percent increase above the wage guideline approved by the government, according to what emerged yesterday from reliable sources, who noted that a decision on the matter is still pending.",
  "pmd-p02-02":
    "Another subject under constant review by the team led by Minister Raúl Borrás is the forces' budget situation within the severe across-the-board limit on public spending imposed by the government.",
  "pmd-p02-03":
    "Although it has not emerged that the other two services are considering similar submissions, it is known that the Army calculates that with the funds available for the year only 20 percent of necessary expenses would be covered.",
  "pmd-p02-04":
    "Likewise, a Ministry of Defense report made it known yesterday that the external debt … stood at 3,801 million dollars as of last December 31.",
  "pmd-p02-05":
    'The paper also maintains that the allocated budget, if the military restructuring planned for this very year is not carried out, means the Armed Forces "are suffering degradation in training and a loss of equipment capital." "This budget level allows barely a minimum operation for a limited time," the minister added, and he warned that "if the allocation of funds is repeated without changing the structure, the degradation would continue, causing damage of growing significance to defense capability."',
  "pmd-p02-06":
    "He then stated that the planned budget amounts to 3 percent of GDP, compared with 2.7 percent the previous year.",
  "pmd-p03-01":
    "Sweet potato flour, a nutritional alternative for people on special diets\n\nThe sweet potato contains large amounts of fiber, carbohydrates, and starch and a low glycemic index, that is, it releases sugar slowly into the bloodstream, which stabilizes glucose.",
  "pmd-p03-02":
    "Students in the Nutrition degree at the National Polytechnic Institute (IPN) created a flour of sweet potato, chia, and blueberries, which has a high content of vitamins, minerals, fiber, omega-3, and antioxidants.",
  "pmd-p03-03":
    "This flour could be used to make baked goods that affect the health of people who are gluten intolerant (with celiac disease) and people with diabetes, who have many restrictions in their diet.",
  "pmd-p03-04":
    "The creators of the flour, Tania Yatziry Morales Flores and Adrián Olvera Campos, stressed that it is beneficial for people with obesity and overweight and dyslipidemias (with a high level of cholesterol in the blood) and even for pregnant women.",
  "pmd-p03-05":
    "Students at the Interdisciplinary Health Center (CICS), Milpa Alta unit, explained that an important feature of the sweet potato is that it contains large amounts of fiber, carbohydrates, and starch, and that it has a low glycemic index, that is, it slowly releases the sugar glucose into the bloodstream and helps stabilize glucose levels in people living with diabetes, in addition to being rich in vitamin B6.",
  "pmd-p03-06":
    "Chia is an important source of omega-3, fiber, and amino acids such as glutamic acid, arginine, leucine, valine, and serine (essential components of proteins), as well as flavonoids (antioxidants). Blueberries add fiber to the product, antioxidants, and inhibit the formation of bad cholesterol, or LDL.",
  "pmd-p03-07":
    "The flour, which also has a significant amount of calcium, phosphorus, magnesium, and potassium, has so far been used to make pancakes at the CICS Milpa Alta pilot plants, but the polytechnic students said one of their aims is to bring the flour to market and diversify its use in making cookies, cupcakes, and cakes.",
  "pmd-p04-01":
    "Are you thinking about buying a house or an apartment, financing your studies, or maybe putting a down payment on a car? Carrying out each of these actions means a great deal of responsibility, because it means taking on a commitment with a financial institution, under a contract that sets payment of a specific amount at certain intervals and with an interest percentage, where if any point is breached, your personal finances are at risk.",
  "pmd-p04-02":
    "According to the National Survey of Financial Inclusion (ENIF), 'Main National and Regional Findings 2018,' 22% of the surveyed population applied for credit to buy a home, 9% chose a personal loan, and only 4% did so to get a car.",
  "pmd-p04-03":
    "Although the same study states that the figures for applying for a loan have increased in the last three years, it is not something to be taken lightly, because mishandling funds can turn into unnecessary debt. To avoid this, Alejandro Saracho, an expert in personal finance and author of the bestseller 'Reconfiguración Financiera,' addresses specific points on what is good and bad for those about to take on a financial commitment.",
  "pmd-p04-04":
    "Whether it is a mortgage, a business loan, an auto loan, or another kind, the main thing is to have a budget so you know how much you can pay each month and how often you would make payments so you do not generate interest. The free Monthly Budget app for Android and iOS will help you organize your personal finances better so that when you acquire a financial product or service you can meet your goals without putting your capital at risk.",
  "pmd-p04-05":
    "Finally, Alejandro Saracho recommends that when you apply for a loan, you think about the useful life of what you are going to buy, that is, that it should be longer than the time you will be paying for it, since nobody wants to pay for something they are no longer using.",
  "pmd-p05-01":
    "Humor on TV: a definitive takeoff?\nby Wilfredo Cancio Isla\n\nI return to the serious problem of humor on Cuban television. And it is to disagree with some conformist opinions that already believe the successive stumbles of our humor programming are fully solved and even speak of a notable improvement in recent months. I do not deny that there have been some encouraging flashes since that fraternal polemic that led to a mass debate on the subject at the UNEAC Tertulia, but not everything deserves complacency.",
  "pmd-p05-02":
    "New programs have appeared with fresh attempts and, although recent comedies do not yet represent the exquisite—necessary—level to which we aspire, it is no less true that they have the merit of breaking with the rigidity of old formulas and the spatial pigeonholing (humor out on the street at last!) that governed television humor production.",
  "pmd-p05-03":
    "Humor, satire, and irony—forms of the comic—must be destined in our socialist society to sharpen criteria and push aside unsuitable conduct and habits. Marx spoke of bidding the past farewell cheerfully and transforming the present. But it is not a matter of creating laughable types with tempestuous manners and unusual behavior.",
  "pmd-p05-04":
    "To solve these difficulties, Cuban Television needs the participation and collaboration of every possible stakeholder. Talents must be found that can reflect the proverbial humorous wealth and the satirical charge of our people.",
  "pmd-p06-01":
    "For several years the Mexican Congress has been concerned with reintroducing the silver coin into monetary circulation. The legislative process will go down in history as one of the most unusual and worthy of study, because Mexico is the only country in the world where Congress dares to question the central bank about paper money, political money that has no intrinsic value and is created by decree.",
  "pmd-p06-02":
    "Since 1971, when the United States broke the commitment to back its dollar with gold at a rate of one ounce per 35 dollars, the whole world has been drowning ever more in a sea of paper worth nothing.",
  "pmd-p06-03":
    "Fiat money reigns as the sole medium of exchange and as the ideological imposition of a dogmatism that nobody dares to question.",
  "pmd-p06-04":
    "But only in the Mexican Congress is the advisability of introducing a coin with intrinsic value being studied, an honest coin that does not depend on dollar reserves or on the authorities' discretionary power, a coin that is private property, not mere debt receipts.",
  "pmd-p06-05":
    "He specified that the aim is not to replace fiduciary currency in circulation, because the silver coin will enter in parallel and in a complementary way, and he added that the project is feasible not only for silver-producing countries, since those that are not can buy it on the market.",
};

for (const item of PRIVATE_FRIEND_MICROS) {
  const text = GOOD[item.id];
  if (!text) fail(`missing good rendering for ${item.id}`);
  const grade = gradeItem(item, text, { mode: "micro" });
  if (grade.points !== 0 || grade.perfect) {
    fail(
      `${item.id} good rendering scored ${grade.points} perfect=${grade.perfect} ${grade.fired
        .map((mark) => `${mark.trapId} ${mark.label}`)
        .join(" | ")}`
    );
  }
}

function expectFire(id: string, text: string, suffix: string) {
  const item = PRIVATE_FRIEND_MICROS.find((row) => row.id === id);
  if (!item) fail(`missing ${id}`);
  const grade = gradeItem(item, text, { mode: "micro" });
  if (!grade.fired.some((mark) => mark.trapId === `${id}:${suffix}`)) {
    fail(`${id} expected :${suffix} got ${grade.fired.map((mark) => mark.trapId).join(",") || "nothing"}`);
  }
}

expectFire(
  "pmd-p01-01",
  "Hope, said Spinoza, is a state of mind that come from the fear that our illusion will fail.",
  "3"
);
expectFire(
  "pmd-p02-04",
  "The external debt stood at 3.801 million dollars on December 31, 1984.",
  "1"
);
expectFire("pmd-p06-02", "In 1971 the United States set the rate at 35 ounces per dollar.", "1");
expectFire("pmd-p04-01", "Are you buying a department, or putting a hook on a car?", "1");
expectFire(
  "pmd-p03-02",
  "Students at the National Polytechnic Institute (IPN) used sweet potato, chia, and cranberries, plus omega-3.",
  "2"
);
expectFire("pmd-p05-04", "Cuban Television needs the contest and the collaboration of every stakeholder.", "1");
expectFire("pmd-p02-01", "Defense analyzes pay. It transcended from secure sources. Buenos Aires, La Voz. 15 percent. Ministry of Defense. wage guideline.", "3");

if (
  !allowPrivateFriendMicros({
    devInclude: false,
    allowEmails: [" Ed@Example.com "],
    presentedEmail: "ed@example.com",
  })
) {
  fail("allowlist should match case-insensitively");
}
if (
  allowPrivateFriendMicros({
    devInclude: false,
    allowEmails: ["ed@example.com"],
    presentedEmail: "other@example.com",
  })
) {
  fail("wrong email was allowed");
}
if (allowPrivateFriendMicros({ devInclude: false, allowEmails: ["ed@example.com"], presentedEmail: "" })) {
  fail("blank email was allowed");
}
if (!allowPrivateFriendMicros({ devInclude: true, allowEmails: [], presentedEmail: "" })) {
  fail("dev include should open the server");
}
if (allowPrivateFriendMicros({ devInclude: false, allowEmails: [], presentedEmail: "ed@example.com" })) {
  fail("email without an allowlist was allowed");
}

const savedFlag = process.env.PRIVATE_FRIEND_MICROS;
const savedEmails = process.env.PRIVATE_FRIEND_MICROS_EMAIL;
try {
  delete process.env.PRIVATE_FRIEND_MICROS;
  delete process.env.PRIVATE_FRIEND_MICROS_EMAIL;
  const closed = privateMicrosFor(process.env, "");
  if (closed.access !== "off" || closed.items.length !== 0) fail("unset env returned items");

  process.env.PRIVATE_FRIEND_MICROS_EMAIL = "ed.goodson@example.com";
  const locked = privateMicrosFor(process.env, "");
  if (locked.access !== "email" || locked.items.length !== 0) fail("allowlist without a match returned items");
  const opened = privateMicrosFor(process.env, "Ed.Goodson@example.com");
  if (opened.access !== "open" || opened.items.length !== 32) fail("matching email did not open the bank");

  delete process.env.PRIVATE_FRIEND_MICROS_EMAIL;
  process.env.PRIVATE_FRIEND_MICROS = "1";
  const dev = privateMicrosFor(process.env, "");
  if (dev.access !== "open" || dev.items.length !== 32) fail("dev flag did not include the bank");
} finally {
  if (savedFlag === undefined) delete process.env.PRIVATE_FRIEND_MICROS;
  else process.env.PRIVATE_FRIEND_MICROS = savedFlag;
  if (savedEmails === undefined) delete process.env.PRIVATE_FRIEND_MICROS_EMAIL;
  else process.env.PRIVATE_FRIEND_MICROS_EMAIL = savedEmails;
}

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: { access?: string; items?: unknown[]; error?: string };
  setHeader: (name: string, value: string) => void;
  status: (code: number) => MockRes;
  json: (body: MockRes["body"]) => MockRes;
};

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

async function call(opts: {
  method: string;
  email?: string;
  cookie?: string;
  header?: string;
}) {
  const res = mockRes();
  await handler(
    {
      method: opts.method,
      body: opts.email ? { email: opts.email } : {},
      headers: {
        ...(opts.header ? { "x-private-friend-micros-email": opts.header } : {}),
      },
      cookies: opts.cookie ? { private_friend_micros_email: opts.cookie } : {},
    } as never,
    res as never
  );
  return res;
}

async function checkApi() {
  delete process.env.PRIVATE_FRIEND_MICROS;
  delete process.env.PRIVATE_FRIEND_MICROS_EMAIL;
  const anon = await call({ method: "GET" });
  if (anon.statusCode !== 200 || anon.body.access !== "off" || (anon.body.items || []).length !== 0) {
    fail("anonymous GET was not empty");
  }

  process.env.PRIVATE_FRIEND_MICROS_EMAIL = "ed.goodson@example.com";
  const denied = await call({ method: "POST", email: "nope@example.com" });
  if (denied.statusCode !== 403 || (denied.body.items || []).length !== 0) fail("wrong POST returned items");
  const posted = await call({ method: "POST", email: "Ed.Goodson@example.com" });
  if (posted.statusCode !== 200 || (posted.body.items || []).length !== 32) fail("matching POST did not return the bank");
  if (!String(posted.headers["Set-Cookie"] || "").includes("private_friend_micros_email=")) {
    fail("matching POST did not set the cookie");
  }
  const cooked = await call({ method: "GET", cookie: "ed.goodson@example.com" });
  if ((cooked.body.items || []).length !== 32) fail("cookie GET did not return the bank");
  const headed = await call({ method: "GET", header: "ed.goodson@example.com" });
  if ((headed.body.items || []).length !== 32) fail("header GET did not return the bank");
  const stillLocked = await call({ method: "GET" });
  if ((stillLocked.body.items || []).length !== 0) fail("GET without a credential returned items");
}

const clientFiles = [
  "pages/practice.tsx",
  "pages/index.tsx",
  "pages/passage.tsx",
  "lib/drills.ts",
  "pages/api/ask-why.ts",
];
const needles = ["Baruch Spinoza", "ed-friend-micro-drills", "privateFriendMicros", "enganche", "camote"];
for (const file of clientFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const needle of needles) {
    if (text.includes(needle)) fail(`${file} contains ${needle}`);
  }
}
if (!fs.existsSync(path.join(root, "data/private/ed-friend-micro-drills.json"))) {
  fail("private json missing");
}

checkApi()
  .then(() => {
    console.log(`private micros ok: ${PRIVATE_FRIEND_MICROS.length} gated items`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
