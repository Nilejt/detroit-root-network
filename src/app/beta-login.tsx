"use client";

import { FormEvent, useEffect, useState } from "react";

// TEMPORARY: remove this component before a larger demo.
export default function BetaLogin() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/auth/beta", { cache: "no-store" }).then((r) => r.json())
      .then((data) => setEnabled(data.enabled === true)).catch(() => setEnabled(false));
  }, []);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/beta", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: values.get("account"), code: values.get("code") }),
      });
      form.reset();
      if (response.ok) { window.location.reload(); return; }
      setMessage((await response.json()).message ?? "Unable to sign in.");
    } catch { form.reset(); setMessage("Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  }
  if (!enabled) return null;
  return <form className="panel login" onSubmit={signIn}>
    <h2>Platform owner beta access</h2>
    <p><strong>Temporary private beta only. Code login must be removed before a larger demo.</strong></p>
    <label>Account<select name="account"><option value="owner">Nile · Owner</option><option value="director_q">Quinn · Owner</option></select></label>
    <label>Private access code<input name="code" type="password" required minLength={64} maxLength={64} autoComplete="off" spellCheck={false} autoCapitalize="none" /></label>
    <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in with beta code"}</button>
    <p role="status">{message}</p>
  </form>;
}
