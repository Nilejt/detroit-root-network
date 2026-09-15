import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const hash = (text: string) => createHash("sha256").update(text).digest();
export const recruiterCookie = "drn_recruiter_session";
export const sessionSeconds = 4 * 60 * 60;
export function recruiterConfig() {
  const code = process.env.RECRUITER_ACCESS_CODE;
  const secret = process.env.RECRUITER_SESSION_SECRET;
  if (process.env.ENABLE_RECRUITER_PAGE !== "true" || !code || !/^\d{5}$/.test(code) || !secret || !/^[a-f0-9]{64}$/.test(secret)) return null;
  return { code, secret };
}
export function codeMatches(input: string, expected: string) { return timingSafeEqual(hash(input), hash(expected)); }
function signature(payload: string, config: { code: string; secret: string }) {
  return createHmac("sha256", config.secret).update(`${config.code}:${payload}`).digest("hex");
}
export function issueRecruiterSession(config: { code: string; secret: string }, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + sessionSeconds}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload, config)}`;
}
export function validRecruiterSession(token: string | undefined, config: { code: string; secret: string } | null, now = Date.now()) {
  if (!token || !config || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, signed] = token.split(".");
  const remaining = Number(expires) - Math.floor(now / 1000);
  return remaining > 0 && remaining <= sessionSeconds && codeMatches(signed, signature(`${expires}.${nonce}`, config));
}
