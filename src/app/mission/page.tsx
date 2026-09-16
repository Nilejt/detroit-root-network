import Link from "next/link";
import type { Metadata } from "next";
import styles from "./mission.module.css";
import MissionSection from "./mission-section";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Mission | Detroit Root Network",
  description: "Detroit first. Connecting neighbors to local food, supporting farmers, and keeping the core accessible.",
};

// Read only publicly approved copy with the public key, never a service key.
// Fresh server rendering avoids serving superseded text after Owner approval.
export default async function MissionPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const published: Record<string, { title: string | null; body: string | null; revision: number }> = {};
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await db.from("mission_sections").select("id,title,body,revision");
    for (const section of data ?? []) published[section.id] = section;
  }
  return (
    <main className={styles.root}>
      <div className={styles.top}><Link href="/">DR / Detroit Root Network</Link><Link href="/">Find food →</Link></div>
      <MissionSection id="hero" initial={published.hero} className={styles.hero}>
        <p className={styles.eyebrow}>OUR MISSION · DETROIT FIRST</p>
        <h1>Know your food.<br />Know your growers.<br />Grow our city.</h1>
        <p>Detroit Root Network helps neighbors understand the food around them and gives urban farmers practical tools to keep that connection strong.</p>
        <Link className={styles.cta} href="/">Explore local food</Link>
      </MissionSection>
      <div className={styles.content}>
        <MissionSection id="environment" initial={published.environment}><p className={styles.eyebrow}>A CLEARER PICTURE</p><h2>Food access changes. Our understanding should, too.</h2>
          <p>A farm stand opens. A neighborhood shop closes. A grower changes their selling day. Knowing where food is available means keeping up with the people and places that supply it.</p>
          <p>A 2024 study compared 3,499 Detroit food outlets in 2013 with 2,884 in the same categories in 2023. Its broader 2023 search also documented 1,305 non-operating outlets. These are different measures: a change in comparable outlet counts and a separate record of closures. The authors call for regular local assessment and greater attention to small neighborhood outlets. <a href="https://www.mdpi.com/2071-1050/16/16/7109">Read the Detroit food landscape study</a>.</p>
          <p>The study challenges broad food-desert labels for Detroit; outlet counts alone do not tell a household whether food meets its needs. DRN focuses on one practical part of that picture: making local produce, selling details, and opportunities to participate easier to find and keep current.</p>
        </MissionSection>
        <MissionSection id="experiences" initial={published.experiences}><p className={styles.eyebrow}>THREE EXPERIENCES · ONE LOCAL NETWORK</p><h2>An accessible core. Room to grow.</h2><div className={styles.cards}>
          <article><span>01 / FREE CORE</span><h3>Customer Find</h3><p>Discover local produce, selling locations, and farmer-posted volunteer opportunities. Make plans with a clearer view of what growers say is available.</p></article>
          <article><span>02 / FREE CORE</span><h3>Farmer Sell</h3><p>Keep a farm profile, selling schedule, and produce inventory current. Share volunteer needs. These core tools stay free of paywalls.</p></article>
          <article><span>03 / PLANNED</span><h3>Farmer Grow</h3><p>Plan plots, record harvests, and learn from past seasons. Optional paid value belongs here alone, in useful tools that earn their place in a farmer’s day.</p></article>
        </div><p>A farmer can grow, sell, or do both. Their tools should fit their work.</p></MissionSection>
        <MissionSection id="trust" initial={published.trust} className={styles.trust}><p className={styles.eyebrow}>TRUST THROUGH CLARITY</p><h2>A closer connection to the produce cycle.</h2><p>We want neighbors to know who is growing their food, what is available, and where to find it. Today, farmers can update their listings. As Grow develops, farmers will choose which seasonal insights to share, with estimates clearly separated from actual harvests and confirmed sale inventory.</p><p>Transparency supports informed choices. A local listing is not a food-safety certification. Private growing records stay private by default, and volunteer suggestions require opt-in and farmer approval before publication.</p></MissionSection>
        <MissionSection id="origin" initial={published.origin}><p className={styles.eyebrow}>BUILT FROM LISTENING</p><h2>Farmers named a need. Quinn brought the idea.</h2><p>As Quinn transitions from technology into urban agriculture full time, she is connecting her technical program management and UX research experience with needs farmers have shared with her directly. Detroit Root Network began with her idea. Nile translated that vision into this working product through project leadership, technical business analysis, and AI-assisted development.</p><p>We take inspiration from the community spirit of Eastern Market, formally designated in 1891: a place where growers and neighbors connect through food. DRN is an independent project, carrying that commitment to accessible connection into a digital tool. <a href="https://easternmarket.org/who-we-are/">Explore Eastern Market’s history and mission</a>.</p></MissionSection>
        <MissionSection id="impact" initial={published.impact}><p className={styles.eyebrow}>PUBLIC HEALTH & COMMUNITY IMPACT</p><h2>Put Detroit first. Build value we can show.</h2><p>We believe that when we put Detroit first, we all win. Our next step is to test that belief with farmers and neighbors: Can people find useful information? Are listings current? Can farmers keep them updated without added burden? Do volunteer connections turn into participation?</p><p>DRN is a beta, with Grow in planning. Better food access and stronger community connections are the outcomes we are working toward; we have not yet measured a change in food insecurity or health outcomes.</p></MissionSection>
      </div>
      <div className={styles.content}><p>Sources: <a href="https://www.mdpi.com/2071-1050/16/16/7109">Detroit food landscape study (2024)</a> · <a href="https://easternmarket.org/who-we-are/">Eastern Market history</a></p></div>
      <div className={styles.bottom}>Detroit Root Network · Rooted here. Built together.</div>
    </main>
  );
}
