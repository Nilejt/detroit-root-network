"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./mission.module.css";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = url && key ? createBrowserClient(url, key) : null;
type Published = { title: string | null; body: string | null; revision: number };
type Suggestion = { id: string; title: string; body: string; comment: string; status: string; base_revision: number; created_at: string };

/** Plain-text overrides are deliberately escaped by React, never interpreted as
 * HTML. RLS protects drafts; the Owner-only RPC controls publication atomically.
 * Bundled editorial content remains readable if the migration is not installed.
 */
export default function MissionEditor({ id, children, className, initial = null }: { id: string; children: ReactNode; className?: string; initial?: Published | null }) {
  const content = useRef<HTMLDivElement>(null);
  const [published, setPublished] = useState<Published | null>(initial);
  const [role, setRole] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!db) return;
    const { data: section, error } = await db.from("mission_sections").select("title,body,revision").eq("id", id).single();
    setReady(!error);
    if (!error) setPublished(section);
    const { data: { user } } = await db.auth.getUser();
    let nextRole = "";
    if (user) {
      const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
      nextRole = profile?.role ?? "";
    }
    setRole(nextRole);
    if (["owner", "director_q"].includes(nextRole)) {
      const { data } = await db.from("mission_suggestions").select("id,title,body,comment,status,base_revision,created_at").eq("section_id", id).order("created_at", { ascending: false });
      setSuggestions(data ?? []);
    } else { setSuggestions([]); setEditing(false); }
  }, [id]);
  useEffect(() => {
    // Async reads synchronize external identity/content; no client role grants access.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const subscription = db?.auth.onAuthStateChange(() => { setTimeout(() => void load(), 0); });
    return () => subscription?.data.subscription.unsubscribe();
  }, [load]);
  function begin() {
    const heading = content.current?.querySelector<HTMLElement>("h1,h2");
    setTitle(published?.title ?? heading?.innerText.replaceAll("\n", " ") ?? "");
    setBody(published?.body ?? Array.from(content.current?.querySelectorAll("p:not([data-mission-label]),h3") ?? [])
      .filter(el => !el.className.includes("eyebrow")).map(el => el.textContent).join("\n\n"));
    setBase(published?.revision ?? 0);
    setComment(""); setEditing(true); setMessage("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!db || busy) return;
    setBusy(true);
    try {
      const { error } = await db.from("mission_suggestions").insert({ section_id: id, base_revision: base, title: title.trim(), body: body.trim(), comment: comment.trim() });
      if (error) { setMessage("Could not save. Your draft is still here. Check your sign-in; if this section changed, copy your draft and start a fresh suggestion."); return; }
      setEditing(false); setMessage("Suggestion saved privately for Owner review."); await load();
    } catch { setMessage("Connection interrupted. Your draft is still here; check the review list before retrying."); }
    finally { setBusy(false); }
  }
  async function review(suggestion: Suggestion, approve: boolean) {
    if (!db || busy) return;
    setBusy(true);
    try {
      const { error } = await db.rpc("review_mission_suggestion", { suggestion_id: suggestion.id, approve });
      setMessage(error ? "Review was not saved. Refresh and check whether the section changed or your session expired." : approve ? "Approved and published. Visitors will see the updated section on their next page load." : "Suggestion rejected; published text is unchanged.");
      setConfirmId(null); await load();
    } catch { setMessage("Connection interrupted. Reload to check whether the review was saved before retrying."); }
    finally { setBusy(false); }
  }
  const operator = ["owner", "director_q"].includes(role);
  if (!operator) return null;
  return <section className={className} id={id}>
    <div ref={content}>{published?.title && published.body ? <>{id === "hero" ? <h1>{published.title}</h1> : <h2>{published.title}</h2>}{published.body.split(/\n\s*\n/).map((p, i) => <p key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</p>)}</> : children}</div>
    {operator && <div className={styles.editor}>
      <p>Private editorial workspace · {role === "owner" ? "Owner" : "Admin"}</p>
      {!ready ? <p>Mission editing is unavailable. Apply migration 007 and reload.</p> : <>
        <button type="button" onClick={begin} disabled={busy || editing}>Suggest an edit</button>
        {editing && <form onSubmit={submit}>
          <label>Suggested heading<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required /></label>
          <label>Suggested section text<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={12000} rows={10} required /></label>
          <p>Plain text. An approved edit replaces this section’s heading and body, including any cards. Source references remain below the page.</p>
          <label>Comment / reason for change<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} required /></label>
          <button disabled={busy}>Submit for Owner review</button> <button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
        </form>}
        {suggestions.map(s => <details key={s.id}><summary>{s.status} · {new Date(s.created_at).toLocaleDateString()} · {s.title}</summary>
          <h3>{s.title}</h3><p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p><p><strong>Comment:</strong> {s.comment}</p>
          {s.base_revision !== published?.revision && s.status === "pending" && <p>This suggestion is based on older wording. Submit a fresh suggestion before approving.</p>}
          {role === "owner" && s.status === "pending" && <>
            <button disabled={busy || s.base_revision !== published?.revision} onClick={() => setConfirmId(s.id)}>Review publication</button> <button disabled={busy} onClick={() => void review(s, false)}>Reject</button>
            {confirmId === s.id && <div><p>Publish the wording shown above in place of this section? Check factual claims and sources before approving.</p><button disabled={busy} onClick={() => void review(s, true)}>Approve and publish</button> <button onClick={() => setConfirmId(null)}>Keep reviewing</button></div>}
          </>}
        </details>)}
      </>}
      <p role="status">{message}</p>
    </div>}
  </section>;
}
