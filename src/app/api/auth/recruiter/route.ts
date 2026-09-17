import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { codeMatches, issueRecruiterSession, recruiterConfig, recruiterCookie, sessionSeconds } from "@/lib/recruiter-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function go(request: NextRequest, result = "") {
 const response = NextResponse.redirect(new URL(`/design-journey${result ? `?result=${result}` : ""}`,request.url),303);
 response.headers.set("Cache-Control","no-store");
 return response;
}
export async function POST(request: NextRequest) {
 const origin = process.env.APP_ORIGIN;
 if (!origin || request.headers.get("origin") !== origin) return new NextResponse("Request rejected",{status:403});
 try {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return go(request,"invalid");
  const reader=request.body?.getReader(); if (!reader) return go(request,"invalid");
  const chunks: Uint8Array[]=[]; let size=0;
  while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length;
   if(size>256){await reader.cancel(); return go(request,"invalid");} chunks.push(value); }
  const form=new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  if(form.get("action")==="logout") {
   const response=go(request); response.cookies.set(recruiterCookie,"",{path:"/design-journey",maxAge:0,httpOnly:true,sameSite:"lax",secure:origin.startsWith("https://")}); return response;
  }
  const config=recruiterConfig(); if(!config) return go(request,"unavailable");
  const code=form.get("code"); if(!code || !/^\d{5}$/.test(code)) return go(request,"invalid");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) return go(request,"unavailable");
  // Vercel overwrites this header. Non-Vercel deployments share one bucket.
  const candidate=process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : undefined;
  const ip=candidate && isIP(candidate) ? candidate : "shared";
  const bucket=createHmac("sha256",config.secret).update(ip).digest("hex");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("drn_recruiter_attempt",{client_bucket:bucket});
  if(error) return go(request,"unavailable");
  if(data!==true) return go(request,"limited");
  if(!codeMatches(code,config.code)) return go(request,"invalid");
  const response=go(request);
  response.cookies.set(recruiterCookie,issueRecruiterSession(config),{httpOnly:true,secure:origin.startsWith("https://"),sameSite:"lax",path:"/design-journey",maxAge:sessionSeconds});
  return response;
 } catch { return go(request,"unavailable"); }
}
