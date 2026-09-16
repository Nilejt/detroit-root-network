"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import MissionEditor from "./mission-editor";

const sections = [["hero", "Mission introduction"], ["environment", "Food environment"], ["experiences", "Find, Sell and Grow"], ["trust", "Trust and transparency"], ["origin", "Project origin"], ["impact", "Community impact"]];

// Use public server-rendered text as the starting draft; never inject fetched
// HTML. The editor and database independently enforce operator permissions.
export default function MissionFeedback() {
  const [selected, setSelected] = useState("hero");
  const [allowed, setAllowed] = useState(false);
  const [copy, setCopy] = useState<Record<string, { title: string; body: string }> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return;
      const db = createBrowserClient(url, key);
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
      if (!["owner", "director_q"].includes(profile?.role)) return;
      if (controller.signal.aborted) return;
      setAllowed(true);
      const response = await fetch("/mission", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Mission unavailable");
      const document = new DOMParser().parseFromString(await response.text(), "text/html");
      const result: Record<string, { title: string; body: string }> = {};
      for (const [id] of sections) {
        const section = document.getElementById(id);
        if (!section) throw new Error("Section unavailable");
        const heading = section.querySelector("h1,h2")?.cloneNode(true) as HTMLElement | undefined;
        heading?.querySelectorAll("br").forEach(br => br.replaceWith(" "));
        result[id] = { title: heading?.textContent ?? "", body: Array.from(section.querySelectorAll("p,h3")).filter(el => !el.className.includes("eyebrow")).map(el => el.textContent).join("\n\n") };
      }
      if (!controller.signal.aborted) setCopy(result);
    }
    void load().catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  if (!allowed) return null;
  return <div className="panel form" style={{ marginTop: 24 }}>
    <h2>Mission page feedback</h2>
    <p>Choose a section to suggest wording and leave a comment. Only the Owner can approve publication. Submit your draft before switching sections.</p>
    <label>Mission section<select value={selected} onChange={e => setSelected(e.target.value)}>{sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {failed ? <p role="alert">Could not load mission text. Reload this page to try again.</p> : !copy ? <p>Loading mission text…</p> : <MissionEditor key={selected} id={selected}><h2>{copy[selected].title}</h2>{copy[selected].body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</MissionEditor>}
  </div>;
}
