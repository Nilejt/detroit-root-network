"use client";

import { FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export default function PartnerTools({ db, user, setNotice }: { db: SupabaseClient; user: User; setNotice: (message: string) => void }) {
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const { error } = await db.from("community_events").insert({
      publisher_type: "partner",
      organization_name: fields.get("organization_name"),
      event_type: fields.get("event_type"),
      title: fields.get("title"),
      description: fields.get("description"),
      starts_at: `${fields.get("event_date")}T${fields.get("event_time")}:00`,
      address: fields.get("address"),
      registration_url: fields.get("registration_url") || null,
      is_free: fields.get("is_free") === "on",
      is_published: true,
      created_by: user.id,
    });
    setNotice(error?.message ?? "Verified partner event published.");
    if (!error) form.reset();
  }

  return <section className="shell partner-tools">
    <div className="intro"><div><p className="eyebrow">VERIFIED PUBLISHERS</p><h1>Community partner tools</h1><p>Publish a trusted health, food-access, or learning event to the read-only Community Board.</p></div></div>
    <form className="panel event-form" onSubmit={publish}>
      <label>Verified organization<input name="organization_name" required maxLength={120} /></label>
      <label>Event type<select name="event_type" required defaultValue=""><option value="" disabled>Choose type</option><option>Health screening</option><option>Free food pickup</option><option>Maternal and infant resource</option><option>Farmers market</option><option>Workshop</option></select></label>
      <label>Event title<input name="title" required maxLength={120} /></label>
      <label className="event-description">Description<textarea name="description" required maxLength={600} rows={5} /></label>
      <label>Date<input type="date" name="event_date" required /></label>
      <label>Start time<input type="time" name="event_time" required /></label>
      <label>Detroit address<input name="address" required maxLength={200} /></label>
      <label>Registration link (optional)<input type="url" name="registration_url" placeholder="https://" /></label>
      <label className="checkline"><input type="checkbox" name="is_free" />Free to attend</label>
      <button className="primary form-submit">Publish verified event</button>
    </form>
    <p className="privacy-note">Only verified partner accounts can publish. Detroiters can save interest, but cannot add public text or posts.</p>
  </section>;
}
