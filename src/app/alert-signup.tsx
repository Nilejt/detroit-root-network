"use client";

import { FormEvent, useState } from "react";

const alertTypes = [
  ["new_farm", "New farm selling today"],
  ["stock_digest", "New items and sold-out updates"],
  ["markets", "Market dates and locations"],
  ["coming_soon", "Coming-soon harvest digest"],
  ["volunteer", "Volunteer opportunities"],
] as const;

export default function AlertSignup({
  farms = [],
}: {
  // Every listed location a shopper can follow directly from this form.
  // Demo note: this preview only has the sample locations loaded, but in
  // production this list is every validated urban agriculture outlet and
  // community resource hub in the directory - not one tier or subset.
  farms?: { id: string; name: string }[];
}) {
  const [preview, setPreview] = useState(false);
  const [scope, setScope] = useState("all");
  const [frequency, setFrequency] = useState("weekly");

  function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(true);
  }

  const farmName = farms.find(farm => farm.id === scope)?.name;

  return (
    <section className="alert-signup" aria-labelledby="alert-heading">
      <div>
        <p className="eyebrow">OPTIONAL ALERTS · DEMO</p>
        <h2 id="alert-heading">Know When Detroit-grown food changes</h2>
        <p>Choose a weekly or instant digest to subscribe to.</p>
      </div>
      <form onSubmit={showPreview}>
        <label className="alert-scope">
          Alerts about
          <select value={scope} onChange={event => setScope(event.target.value)}>
            <option value="all">All Detroit farms, stalls and resource hubs</option>
            {[...farms].sort((a, b) => a.name.localeCompare(b.name)).map(farm => (
              <option key={farm.id} value={farm.id}>Just {farm.name}</option>
            ))}
          </select>
          <small>
            Demo shows the sample locations only. At launch, every validated urban
            agriculture outlet and community resource hub we list can be followed here.
          </small>
        </label>
        <label className="alert-scope">
          How often
          <select value={frequency} onChange={event => setFrequency(event.target.value)}>
            <option value="weekly">Weekly digest</option>
            <option value="instant">Instant digest as changes happen</option>
          </select>
        </label>
        <fieldset>
          <legend>Send me</legend>
          {alertTypes.map(([value, label]) => (
            <label className="checkline" key={value}>
              <input type="checkbox" name="alert_type" value={value} defaultChecked={value === "stock_digest"} />
              {label}
            </label>
          ))}
        </fieldset>
        <label>Mobile number for the mock preview<input type="tel" inputMode="tel" placeholder="(313) 555-0123" /></label>
        <button className="primary">Preview SMS alert</button>
      </form>
      {preview && (
        <div className="sms-preview" role="status">
          {farmName ? (
            <><b>DRN {frequency === "instant" ? "instant" : "weekly"} roots · {farmName}:</b> new items were added, one item sold out, and a harvest is coming soon at {farmName}. Open your Detroit map to plan a visit.</>
          ) : (
            <><b>DRN {frequency === "instant" ? "instant" : "weekly"} roots:</b> 4 farms added 9 items, 3 items sold out, and 2 harvests are coming soon. Open your Detroit map to plan a visit.</>
          )}
          {" "}
          <span>Demo only—no message was sent.</span>
        </div>
      )}
    </section>
  );
}
