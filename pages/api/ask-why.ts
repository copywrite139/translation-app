import type { NextApiRequest, NextApiResponse } from "next";
import { explainAskWhy, parseAskWhyRequest } from "../../lib/askWhy";

/**
 * Text-only tutor note for a trap that already fired.
 * The answer is composed from the armed packet. It does not rescore.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }
  const parsed = parseAskWhyRequest(req.body);
  if (parsed.ok === false) return res.status(400).json({ error: parsed.error });
  return res.status(200).json({ answer: explainAskWhy(parsed.value) });
}
