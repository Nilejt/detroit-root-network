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
        <p>Detroit Root Network helps neighbors understand the urban farmers and community partners around them and gives urban farmers and community partners practical tools to keep that connection strong.</p>
        <Link className={styles.cta} href="/">Explore local food</Link>
      </MissionSection>
      <div className={styles.content}>
        <MissionSection id="environment" initial={published.environment}><p className={styles.eyebrow}>A CLEARER PICTURE</p><h2>Food access changes. Our understanding should, too.</h2>
          <p>A farm stand opens. A neighborhood shop closes. A grower changes their selling day. Knowing where food is available means keeping up with the people and places that supply it.</p>
          <p>A 2024 study compared 3,499 Detroit food outlets in 2013 with 2,884 in the same categories in 2023, which represents a loss of 615 places Detroiters once accessed for food. The study challenges broad “food desert” labels for Detroit as outlet counts alone do not tell a household whether food meets its needs. <a href="https://www.mdpi.com/2071-1050/16/16/7109">Read the Detroit food landscape study</a>.</p>
          <p>The City of Detroit reached a similar conclusion from a different direction. Its 2025 Community Health Assessment data briefs, built with input from more than 6,000 Detroiters, informed a Community Health Improvement Plan with four priorities: maternal and infant health, access to healthy food, access to healthcare, and reducing chronic conditions. <a href="https://detroitmi.gov/sites/detroitmi.localhost/files/2026-06/Detroit%20CHA%20Data%20Briefs%202025_With%20References.pdf">Read the Community Health Assessment data briefs</a> and the <a href="https://detroitmi.gov/departments/detroit-health-department/about-health-department/detroit-community-health-improvement-process">Community Health Improvement Process</a>.</p>
          <p>DRN focuses on one practical part of that picture: making local produce, selling details, and opportunities to participate easier to find and keep current.</p>
          <p>Read alongside the ten-year loss of food outlets, the City’s priorities point to the same work: equitable access, environmental justice, and community connection. Those are what we aim to become a better conduit for, for the people in Detroit.</p>



        </MissionSection>
        <MissionSection id="experiences" initial={published.experiences}><p className={styles.eyebrow}>THREE EXPERIENCES · ONE LOCAL NETWORK</p><h2>An accessible core. Room to grow.</h2><div className={styles.cards}>
          <article><span>01 / FREE CORE</span><h3>Customers Buy</h3><p>Discover local produce, selling locations, and farmer-posted volunteer opportunities. Make plans with a clearer view of what growers say is available.</p></article>
          <article><span>02 / FREE CORE</span><h3>Farmers Sell</h3><p>Keep a farm profile, selling schedule, and produce inventory current. Share volunteer needs. These core tools stay free of paywalls.</p></article>
          <article><span>03 / PLANNED</span><h3>Farmers Grow</h3><p>Plan plots, record harvests, and learn from past seasons. Optional paid value belongs here alone, in useful tools that earn their place in a farmer’s day.</p></article>
        </div><p>A farmer can grow, sell, or do both. Their tools should fit their work.</p></MissionSection>
        <MissionSection id="origin" initial={published.origin}><p className={styles.eyebrow}>BUILT FROM LISTENING</p><h2>Farmers named a need. Quinn brought the idea.</h2><p>As Quinn transitions from technology into urban agriculture full time, she is connecting her technical program management, UX research experience, years of community gardening, and time spent as a <a href="https://growmoore.my.canva.site/">Grow Moore Produce Cooperative</a> Farm Apprentice with needs farmers have shared with her directly. Detroit Root Network began with her idea. Nile translated that vision into this working product through project leadership, technical business analysis, and AI-assisted development.</p><p>We take inspiration from the growers we have connected with in the <a href="https://growmoore.my.canva.site/">Grow Moore Produce Cooperative</a> and as well as other growers in the city of Detroit. We are also inspired by the major community partners that support Detroit’s urban agriculture community including <a href="https://www.detroitagriculture.net/mission">Keep Growing Detroit</a>, where growers throughout the city have access to seeds and seedlings, tools, and educational programming to support their goals; <a href="https://easternmarket.org/who-we-are/">Eastern Market</a>, where growers and neighbors connect through food since 1891, and the <a href="https://detroitmi.gov/government/mayors-office/office-sustainability">City of Detroit’s Office of Sustainability</a>, which assists Detroit growers in their goals to help feed and beautify the city. DRN is an independent project, carrying that commitment to accessible connection into a digital tool.</p></MissionSection>
        <MissionSection id="impact" initial={published.impact}><p className={styles.eyebrow}>PUBLIC HEALTH & COMMUNITY IMPACT</p><h2>Put Detroit first. Build value we can show.</h2><p>We believe that when we put Detroit first, we all win. Our next step is to test that belief with farmers and neighbors: Can people find useful information? Are listings current? Can farmers keep them updated without added burden? Do volunteer connections turn into participation?</p><p>DRN is a beta, with Grow in planning. Better food access and stronger community connections are the outcomes we are working toward; we have not yet measured a change in food insecurity or health outcomes.</p></MissionSection>
      </div>
      <div className={styles.content}><p>Sources: <a href="https://www.mdpi.com/2071-1050/16/16/7109">Detroit food landscape study (2024)</a> · <a href="https://detroitmi.gov/sites/detroitmi.localhost/files/2026-06/Detroit%20CHA%20Data%20Briefs%202025_With%20References.pdf">Detroit Community Health Assessment data briefs (2025)</a> · <a href="https://detroitmi.gov/departments/detroit-health-department/about-health-department/detroit-community-health-improvement-process">Detroit Community Health Improvement Process</a> · <a href="https://www.detroitagriculture.net/mission">Keep Growing Detroit</a> · <a href="https://easternmarket.org/who-we-are/">Eastern Market</a> · <a href="https://detroitmi.gov/government/mayors-office/office-sustainability">City of Detroit Office of Sustainability</a></p></div>
      <div className={styles.bottom}>Detroit Root Network · Rooted here. Built together.</div>
    </main>
  );
}
