import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { recruiterConfig, recruiterCookie, validRecruiterSession } from "@/lib/recruiter-access";
import content from "@/content/recruiter.json";
import styles from "./recruiter.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"Design Journey | Detroit Root Network",robots:{index:false,follow:false}};
const messages: Record<string,string> = {
 invalid:"That code was not accepted. Check the five digits and try again.",
 limited:"Too many attempts. Please wait 15 minutes before trying again.",
 unavailable:"Design Journey access is not available yet. Please contact the person who shared this page.",
};
export default async function RecruiterPage({searchParams}: {searchParams:Promise<{result?:string}>}) {
 const config=recruiterConfig();
 const allowed=validRecruiterSession((await cookies()).get(recruiterCookie)?.value,config);
 const {result}=await searchParams;
 if(!allowed) return <main className={styles.root}><div className={styles.gate}>
  <Link className={styles.back} href="/">Detroit Root Network</Link>
  <p className={styles.eyebrow}>THE STORY BEHIND DETROIT ROOT NETWORK</p>
  <h1>Design Journey</h1>
  <p>Explore the idea, product decisions, and technical work behind DRN. For recruiters, technical teams, and competition reviewers—enter the five-digit code shared with you to continue.</p>
  <form action="/api/auth/recruiter" method="post">
   <label htmlFor="recruiter-code">Access code</label>
   <input id="recruiter-code" name="code" type="password" inputMode="numeric" pattern="[0-9]{5}" minLength={5} maxLength={5} required autoComplete="off" disabled={!config} />
   <button disabled={!config}>Explore Design Journey <span aria-hidden="true">→</span></button>
  </form>
  <p role="status">{!config ? messages.unavailable : result ? messages[result] ?? "" : ""}</p>
  <small>This opens the project presentation only.</small>
 </div></main>;
 return <main className={styles.root}>
  <div className={styles.top}><Link href="/">DR / Detroit Root Network</Link><form action="/api/auth/recruiter" method="post"><input type="hidden" name="action" value="logout"/><button>Close walkthrough</button></form></div>
  <div className={styles.hero}>
   <div><p className={styles.eyebrow}>DESIGN JOURNEY · DETROIT ROOT NETWORK</p><h1>From local food information to a working community platform</h1><p>{content.summary}</p>
   <div className={styles.tags}><span>Deployed private beta</span><span>Product delivery</span><span>Technical business analysis</span></div></div>
   <aside className={styles.heroAside}><span>THE PROJECT AT A GLANCE</span><h2>Discover. Update. Coordinate.</h2><p>A connected workflow for finding local food, keeping stall information current, and organizing volunteer help.</p><a href="/" target="_blank" rel="noreferrer">Explore public discovery ↗</a><small>Editing tools require a separate authorized account.</small></aside>
  </div>
  <nav className={styles.nav} aria-label="Design Journey sections"><a href="#story">The story</a><a href="#stack">Architecture</a><a href="#delivery">Delivery</a><a href="#evidence">Evidence</a><a href="#next">Next steps</a></nav>
  <div className={styles.body}>
   <section id="story"><p className={styles.eyebrow}>01 / PURPOSE AND PEOPLE</p><h2>A Detroit problem with an operational answer</h2><p className={styles.lead}>{content.pitch}</p><div className={styles.people}>{content.people.map(p=><article key={p.name}><h3>{p.name}</h3><strong>{p.role}</strong><p>{p.contribution}</p></article>)}</div>
   <h3>What the product brings together</h3><div className={styles.grid}>{content.capabilities.map(c=><article key={c.title}><h3>{c.title}</h3><p>{c.body}</p></article>)}</div></section>
   <section id="stack"><p className={styles.eyebrow}>02 / SYSTEM DESIGN</p><h2>One application across a small, deliberate stack</h2><div className={styles.architecture} aria-label="Architecture flow"><div><b>Browser</b><span>React discovery and operations</span></div><span aria-hidden="true">↔</span><div><b>Vercel and Next.js</b><span>Pages and server authentication routes</span></div><span aria-hidden="true">↔</span><div><b>Supabase</b><span>Auth, PostgreSQL, RLS and triggers</span></div></div><p>Authorized browser data requests also go directly to Supabase using the public client and user session. Leaflet loads OpenStreetMap tiles for discovery.</p><div className={styles.tableWrap}><table><thead><tr><th>Layer</th><th>Technology</th><th>Responsibility</th></tr></thead><tbody>{content.stack.map(([a,b,c])=><tr key={a}><th scope="row">{a}</th><td data-label="Technology">{b}</td><td data-label="Responsibility">{c}</td></tr>)}</tbody></table></div>
   <h3>Follow the workflows</h3>{content.flows.map((f,i)=><details key={f.title} open={i===0}><summary>{f.title}</summary><ol>{f.steps.map(s=><li key={s}>{s}</li>)}</ol></details>)}</section>
   <section id="delivery"><p className={styles.eyebrow}>03 / DELIVERY AND JUDGMENT</p><h2>Configuration is part of the product work</h2><div className={styles.grid}>{content.configuration.map(([a,b])=><article key={a}><h3>{a}</h3><p>{b}</p></article>)}</div><h3>Decisions a technical team can evaluate</h3>{content.decisions.map(d=><details key={d.title}><summary>{d.title}</summary><p>{d.body}</p></details>)}</section>
   <section id="evidence"><p className={styles.eyebrow}>04 / EVIDENCE AND LIMITS</p><h2>What is demonstrated today</h2><div className={styles.evidence}>{content.evidence.map(([a,b])=><article key={a}><h3>{a}</h3><p>{b}</p></article>)}</div><p className={styles.takeaway}>{content.recruiterSummary}</p></section>
   <section id="next"><p className={styles.eyebrow}>05 / THE NEXT TEST</p><h2>Turn a working beta into measured community value</h2><ul>{content.next.map(n=><li key={n}>{n}</li>)}</ul><details><summary>A five-step competition demonstration</summary><ol>{content.demo.map(n=><li key={n}>{n}</li>)}</ol></details></section>
  </div><footer className={styles.footer}>Detroit Root Network · Design Journey · September 2026</footer>
 </main>;
}
