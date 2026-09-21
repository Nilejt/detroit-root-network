"use client";

import { type FormEvent, useState } from "react";

const farmAlertTypes = [
  ["selling_days", "When this location is selling"],
  ["new_items", "New produce added"],
  ["coming_soon", "Coming-soon harvests"],
  ["volunteer", "Volunteer opportunities"],
] as const;

/** Customers can follow a single location. Demo only: no message is sent and no
 * contact details are stored in this review build.
 */
export default function FarmAlertSignup({ farmName }: { farmName: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [frequency, setFrequency] = useState("weekly");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const chosen = fields.getAll("farm_alert_type");
    const contact = String(fields.get("contact") ?? "").trim();
    if (!chosen.length) { setError("Choose at least one kind of update."); return; }
    if (contact.length < 5 || contact.length > 120) { setError("Enter the mobile number or email where updates should go."); return; }
    setError(""); setDone(true);
  }

  return (
    <div className="block farm-alerts">
      <h3>Get alerts from this location</h3>
      <p>Follow {farmName} to hear when they are selling and what is fresh. You can choose only this location—no other locations are included.</p>
      <form className="farm-alert-form" onSubmit={submit}>
        <fieldset>
          <legend>Tell me about</legend>
          {farmAlertTypes.map(([value, label]) => (
            <label className="checkline" key={value}>
              <input type="checkbox" name="farm_alert_type" value={value} defaultChecked={value === "selling_days"} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="alert-scope">
          How often
          <select value={frequency} onChange={event => setFrequency(event.target.value)}>
            <option value="weekly">Weekly digest</option>
            <option value="instant">Instant digest as changes happen</option>
          </select>
        </label>
        <label>Mobile number or email<input name="contact" type="text" maxLength={120} placeholder="(313) 555-0123" autoComplete="off" /></label>
        <button className="primary">Follow this location</button>
        <p role="status">{error || (done ? `You would now receive ${frequency === "instant" ? "instant" : "weekly"} updates from ${farmName}. Demo only—nothing was sent or saved.` : "")}</p>
      </form>
    </div>
  );
}
