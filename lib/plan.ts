import { ErrorCat } from "./types";

export type PlanBlock = {
  id: string;
  minutes: number;
  title: string;
  detail: string;
  href: string;
};

export type DayPlan = {
  kind: string;
  blocks: PlanBlock[];
};

const EXAM = new Date(2026, 9, 28);

export function daysUntilExam(now: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(EXAM.getFullYear(), EXAM.getMonth(), EXAM.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function todayPlan(now: Date, weakest: ErrorCat): DayPlan {
  const day = now.getDay();
  if (day === 3) {
    return {
      kind: "Wednesday — O and P only",
      blocks: [
        {
          id: "A",
          minutes: 40,
          title: "O-bank",
          detail: "Omissions: intensifiers, polarity, headings, list items, parentheticals, names, numbers, dates.",
          href: "/practice?bank=O&minutes=40&count=8",
        },
        {
          id: "B",
          minutes: 40,
          title: "P-bank",
          detail: "Punctuation: comma splices, American quotes, the raya, decimals, thousands, serial commas, paragraphing.",
          href: "/practice?bank=P&minutes=40&count=8",
        },
        {
          id: "C",
          minutes: 30,
          title: "Heavier of O and P",
          detail: `Seeded from the ledger. Right now that is ${weakest}.`,
          href: "/practice?bank=weak&minutes=30&count=6",
        },
        {
          id: "D",
          minutes: 10,
          title: "Ledger review",
          detail: "Read today's marks. No new passage on a proofing day.",
          href: "/#ledger",
        },
      ],
    };
  }
  if (day === 0) {
    return {
      kind: "Sunday — titles, caps, and POS",
      blocks: [
        {
          id: "A",
          minutes: 30,
          title: "Titles and caps",
          detail: "Congressman, Secretary, Pope, Article, Treaty, COVID-19, Vietnam War.",
          href: "/practice?bank=titles&minutes=30&count=8",
        },
        {
          id: "B",
          minutes: 40,
          title: "POS and transfer",
          detail: "Noun heads, including compromiso, plus register and false friends.",
          href: "/practice?bank=POS&minutes=40&count=8",
        },
        {
          id: "C",
          minutes: 30,
          title: "POS from the ledger",
          detail: "Same bank, hottest traps first.",
          href: "/practice?bank=POS&minutes=30&count=6",
        },
        {
          id: "D",
          minutes: 20,
          title: "Ledger review",
          detail: "Check that POS-drift fires are falling.",
          href: "/#ledger",
        },
      ],
    };
  }
  return {
    kind: "Standard day — 2 hours",
    blocks: [
      {
        id: "A",
        minutes: 20,
        title: "Warm-up from the weakest category",
        detail: `The ledger currently seeds ${weakest}. Empty ledger starts with O, then P.`,
        href: "/practice?bank=weak&minutes=20&count=8",
      },
      {
        id: "B",
        minutes: 70,
        title: "Timed passage",
        detail: "One sitting, or split the same passage into two 35-minute halves.",
        href: "/passage?minutes=70",
      },
      {
        id: "C",
        minutes: 20,
        title: "Locked proof",
        detail: "Cover the source, then walk the checklist. The last part of a 90-minute sitting locks here on its own.",
        href: "/passage?minutes=90&proof=1",
      },
      {
        id: "D",
        minutes: 10,
        title: "Three micros on today's traps",
        detail: "Picks items that share today's pitfalls, lemmas, and categories.",
        href: "/practice?bank=today&minutes=10&count=3",
      },
    ],
  };
}

export const WEEKLY_NOTE =
  "Week shape: five 90-minute passages, Wednesday on the O and P banks only, Sunday on titles and POS only. Target is a 14-day passage average moving toward 17 or under, with O and P counts falling week over week, and no POS-drift fires in the last 20 POS items before exam week.";
