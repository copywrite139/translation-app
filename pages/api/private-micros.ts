import type { NextApiRequest, NextApiResponse } from "next";
import {
  emailFromApi,
  privateCookie,
  privateMicrosFor,
} from "../../lib/privateFriendMicros";

/**
 * Gated friend-extract micros. Anonymous callers get an empty list.
 * Enable with PRIVATE_FRIEND_MICROS_EMAIL (comma-separated). The matching
 * address is posted here and stored in an httpOnly cookie.
 * PRIVATE_FRIEND_MICROS=1 includes the bank for every request on that server.
 * Do not set that flag on the public deployment.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "GET or POST only" });
  }

  const bodyEmail =
    req.method === "POST" && req.body && typeof req.body.email === "string" ? req.body.email : "";
  const presented = req.method === "POST" && bodyEmail.trim() ? bodyEmail : emailFromApi(req);
  const result = privateMicrosFor(process.env, presented);

  if (req.method === "POST") {
    if (result.access !== "open" || !bodyEmail.trim()) {
      return res.status(403).json({
        ok: false,
        access: result.access === "open" ? "email" : result.access,
        items: [],
        error: "This email is not enabled for the private bank.",
      });
    }
    const secure = req.headers["x-forwarded-proto"] === "https";
    res.setHeader("Set-Cookie", privateCookie(bodyEmail, secure));
  }

  return res.status(200).json({
    ok: result.access === "open",
    access: result.access,
    items: result.items,
  });
}
