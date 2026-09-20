"use client";

import { FormEvent, useState } from "react";

const alertTypes = [
  ["new_farm", "New farm selling today"],
  ["stock_digest", "New items and sold-out updates"],
  ["markets", "Market dates and locations"],
  ["coming_soon", "Coming-soon harvest digest"],
] as const;

export default function AlertSignup() {
  const [preview, setPreview] = useState(false);

  function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(true);
  }

  return (
    <section className="alert-signup" aria-labelledby="alert-heading">
      <div>
        <p className="eyebrow">OPTIONAL ALERTS · DEMO</p>
        <h2 id="alert-heading">Know when Detroit-grown food changes</h2>
        <p>Choose a weekly digest instead of receiving a message for every single inventory edit.</p>
      </div>
      <form onSubmit={showPreview}>
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
      {preview && <div className="sms-preview" role="status"><b>DRN weekly roots:</b> 4 farms added 9 items, 3 items sold out, and 2 harvests are coming soon. Open your Detroit map to plan a visit. <span>Demo only—no message was sent.</span></div>}
    </section>
  );
}
