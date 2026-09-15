import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY: REMOVE this route and the beta form before a larger demo.
const reply = (status: number, message: string) => NextResponse.json(
  { message }, { status, headers: { "Cache-Control": "no-store" } },
);
const digest = (value: string) => createHash("sha256").update(value).digest();

export async function GET() {
  return NextResponse.json({ enabled: process.env.ENABLE_BETA_CODE_LOGIN === "true" },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_BETA_CODE_LOGIN !== "true") return reply(404, "Beta login is disabled.");
  // APP_ORIGIN is explicitly configured, never taken from forwarded headers.
  const origin = process.env.APP_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin) return reply(403, "Request rejected.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON required.");
  try {
    // Bound streamed input too; Content-Length can be missing or forged.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "Invalid request.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024) { await reader.cancel(); return reply(413, "Request too large."); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply(400, "Invalid request."); }
    if (!body || typeof body.code !== "string" || !["owner", "director_q"].includes(body.account))
      return reply(400, "Invalid request.");

    const ownerCode = process.env.BETA_OWNER_CODE;
    const qCode = process.env.BETA_DIRECTOR_Q_CODE;
    // Require independent 256-bit random hex secrets; no short PINs or defaults.
    if (!ownerCode || !qCode || !/^[a-f0-9]{64}$/.test(ownerCode) ||
        !/^[a-f0-9]{64}$/.test(qCode) || ownerCode === qCode)
      return reply(503, "Beta login is unavailable.");
    const expected = body.account === "owner" ? ownerCode : qCode;
    if (!timingSafeEqual(digest(body.code), digest(expected))) return reply(401, "Invalid access code.");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const id = body.account === "owner" ? process.env.BETA_OWNER_USER_ID : process.env.BETA_DIRECTOR_Q_USER_ID;
    const email = body.account === "owner" ? "nilejt@gmail.com" : "qhamilton@gmail.com";
    if (!url || !key || !secret || !id) return reply(503, "Beta login is unavailable.");
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    // Only existing, confirmed identities with pre-provisioned roles may sign in.
    // No role assignments or application writes use the service role here.
    const { data: identity, error: identityError } = await admin.auth.admin.getUserById(id);
    if (identityError || identity.user?.email?.toLowerCase() !== email || !identity.user.email_confirmed_at)
      return reply(503, "Beta login is unavailable.");
    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", id).single();
    if (profileError || profile?.role !== body.account) return reply(503, "Beta login is unavailable.");
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || link.user.id !== id) return reply(503, "Beta login is unavailable.");
    const response = reply(200, "Signed in.");
    const db = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, { ...options, sameSite: "lax", secure: origin.startsWith("https://") })),
    } });
    const { data, error } = await db.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
    if (error || data.user?.id !== id || !data.session) return reply(503, "Beta login is unavailable.");
    return response;
  } catch {
    // Do not log request bodies, access codes, generated links, tokens, or SDK errors.
    return reply(503, "Beta login is unavailable.");
  }
}
