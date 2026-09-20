"use client";

import { useEffect, useState } from "react";

export type CommunityEvent = {
  id: string;
  title: string;
  event_type: string;
  organization_name: string;
  publisher_type: "farm" | "health_partner" | "community_space";
  description: string;
  starts_at: string;
  address: string;
  registration_url?: string;
  is_free: boolean;
};

const demoEvents: CommunityEvent[] = [
  { id: "event-1", title: "Fresh Food and Blood Pressure Workshop", event_type: "Workshop", organization_name: "Detroit Community Health Partner · Demo", publisher_type: "health_partner", description: "A verified-partner demonstration covering practical lower-sodium shopping and fresh produce.", starts_at: "2026-10-03T11:00:00-04:00", address: "North End, Detroit", is_free: true },
  { id: "event-2", title: "Saturday Harvest and Farm Tour", event_type: "Farm learning", organization_name: "Q's Stall", publisher_type: "farm", description: "Meet the grower, see the harvest workflow, and learn what is coming next.", starts_at: "2026-10-10T10:00:00-04:00", address: "Eastern Market, Detroit", is_free: true },
  { id: "event-3", title: "Maternal and Family Nutrition Resource Day", event_type: "Maternal and infant health", organization_name: "Growing Families Network · Demo", publisher_type: "health_partner", description: "A verified-partner demonstration with general nutrition resources and local program connections.", starts_at: "2026-10-17T12:00:00-04:00", address: "East Detroit", is_free: true },
  { id: "event-4", title: "Free Produce Pickup", event_type: "Food pickup", organization_name: "Neighborhood Food Collaborative · Demo", publisher_type: "community_space", description: "Reserve a free seasonal produce box while supplies last.", starts_at: "2026-10-22T16:00:00-04:00", address: "Southwest Detroit", is_free: true },
];

function browserKey() {
  const existing = localStorage.getItem("drn-anonymous-browser");
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem("drn-anonymous-browser", created);
  return created;
}

export default function CommunityBoard({ events = demoEvents }: { events?: CommunityEvent[] }) {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    browserKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage is unavailable during server rendering; hydrate the anonymous demo state after mount.
    setSaved(JSON.parse(localStorage.getItem("drn-community-interest") ?? "[]"));
  }, []);
  const toggle = (id: string) => {
    const next = saved.includes(id) ? saved.filter((value) => value !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem("drn-community-interest", JSON.stringify(next));
  };
  return <section className="shell community-board">
    <div className="intro"><div><p className="eyebrow">VERIFIED COMMUNITY POSTINGS</p><h1>Community Board</h1><p>Save trusted farm events, volunteer opportunities, screenings, food pickups, and learning experiences. Detroiters can mark interest, but public posting is limited to verified publishers.</p></div></div>
    <div className="community-grid">
      {events.map(event => <article className="community-card" key={event.id}>
        <div className="row"><span className="tag">{event.publisher_type === "farm" ? "Verified farm" : "Verified partner"}</span><span>{event.is_free ? "Free" : "Registration required"}</span></div>
        <p className="eyebrow">{event.event_type}</p><h2>{event.title}</h2><b>{event.organization_name}</b><p>{event.description}</p>
        <p><strong>{new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</strong><br />{event.address}</p>
        <div className="event-actions"><button className={saved.includes(event.id) ? "primary" : "quiet"} onClick={() => toggle(event.id)}>{saved.includes(event.id) ? "Interest saved" : "Save interest"}</button>{event.registration_url && <a className="primary" href={event.registration_url}>Register ↗</a>}</div>
      </article>)}
    </div>
    <p className="privacy-note">Interest is stored to this browser for the demonstration. One active selection is retained per event and browser. It is an expressed-interest signal—not a verified unique-person count.</p>
  </section>;
}
