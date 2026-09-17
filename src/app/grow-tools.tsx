"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import GrowPlanner from "./grow-planner";
import type { GrowCrop } from "./grow-crop-form";

type Harvest = { id: string; plot_id: string; harvested_on: string; quantity: number; unit: string; notes: string };
type History = { id: string; record_type: string; previous_value: Record<string, unknown>; changed_at: string };

/** Grow access is enforced by ordinary Supabase identity and SQL. A workspace
 * switch never grants membership, Owner support access, or T2 write permission.
 */
export default function GrowTools({ db, farmId, onDirty }: {
  db: SupabaseClient | null; farmId: string; onDirty: (dirty: boolean) => void;
}) {
  const [access, setAccess] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [crops, setCrops] = useState<GrowCrop[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [harvest, setHarvest] = useState<Harvest | null>(null);
  const [harvestCrop, setHarvestCrop] = useState("");
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [plannerDirty, setPlannerDirty] = useState(false);
  const [harvestDirty, setHarvestDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const harvestRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    if (!db) { setAccess("unavailable"); return; }
    const permission = await db.rpc("drn_can_grow", { target_farm: farmId });
    if (permission.error) { setAccess("unavailable"); return; }
    if (!permission.data) { setAccess("denied"); setCrops([]); setHarvests([]); setHistory([]); return; }
    const [p, h, a] = await Promise.all([
      db.from("grow_plots").select("id,name,crop,season,planted_on,planned_harvest_on,soil_type,notes").eq("farm_id", farmId).order("season", { ascending: false }),
      db.from("grow_harvests").select("id,plot_id,harvested_on,quantity,unit,notes").eq("farm_id", farmId).order("harvested_on", { ascending: false }),
      db.from("grow_history").select("id,record_type,previous_value,changed_at").eq("farm_id", farmId).order("changed_at", { ascending: false }).limit(30),
    ]);
    if (p.error || h.error || a.error) { setAccess("unavailable"); return; }
    setCrops(p.data ?? []); setHarvests(h.data ?? []); setHistory(a.data ?? []); setAccess("ready");
  }, [db, farmId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes private farm records.
    void load().catch(() => setAccess("unavailable"));
  }, [load]);
  useEffect(() => { onDirty(plannerDirty || harvestDirty); }, [plannerDirty, harvestDirty, onDirty]);
  useEffect(() => {
    if (!harvestDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [harvestDirty]);

  async function refreshHistory() {
    if (!db) return;
    const result = await db.from("grow_history").select("id,record_type,previous_value,changed_at").eq("farm_id", farmId).order("changed_at", { ascending: false }).limit(30);
    if (!result.error) setHistory(result.data ?? []);
  }
  function cropSaved(crop: GrowCrop) {
    setCrops(previous => [...previous.filter(item => item.id !== crop.id), crop]);
    // Do not reload/unmount the planner after saving crop details: its layout may
    // still be a draft. History refresh is independent of the active workspace.
    void refreshHistory().catch(() => {});
  }
  function openHarvest(cropId: string, record: Harvest | null = null) {
    if (harvestDirty && !window.confirm("Discard the unsaved harvest entry?")) return;
    setHarvest(record); setHarvestCrop(cropId); setHarvestOpen(true); setHarvestDirty(false);
    setFormVersion(version => version + 1); setMessage("");
    requestAnimationFrame(() => {
      harvestRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      harvestRef.current?.querySelector<HTMLInputElement>('input[type="date"]')?.focus({ preventScroll: true });
    });
  }
  async function saveHarvest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!db || busy) return;
    const fields = new FormData(event.currentTarget);
    const row = { harvested_on: String(fields.get("harvested_on")), quantity: Number(fields.get("quantity")), unit: String(fields.get("unit")), notes: String(fields.get("notes") ?? "").trim() };
    setBusy(true); setMessage("");
    try {
      const columns = "id,plot_id,harvested_on,quantity,unit,notes";
      const result = harvest
        ? await db.from("grow_harvests").update(row).eq("id", harvest.id).eq("farm_id", farmId).select(columns).single()
        : await db.from("grow_harvests").insert({ ...row, farm_id: farmId, plot_id: harvestCrop }).select(columns).single();
      if (result.error || !result.data) { setMessage("Could not save this harvest. Check your entries and connection; your draft is still here."); return; }
      setHarvests(previous => [result.data as Harvest, ...previous.filter(item => item.id !== result.data.id)].sort((a, b) => b.harvested_on.localeCompare(a.harvested_on)));
      setHarvest(null); setHarvestDirty(false); setFormVersion(version => version + 1);
      setMessage("Harvest saved privately. Sale inventory is unchanged.");
      void refreshHistory().catch(() => {});
    } catch { setMessage("Connection interrupted. Check harvest history before retrying."); }
    finally { setBusy(false); }
  }

  if (access !== "ready") return <section className="panel"><h2>Farmer Grow · Beta</h2>
    <p>{access === "loading" ? "Loading your growing workspace…" : access === "denied" ? "Grow records are private to this farm’s members. Choose a farm you belong to, or ask the Owner to assign membership. Cross-farm selling access does not grant Grow access." : "Grow is unavailable. Check your connection or ask the Owner to check this farm’s setup."}</p>
    <button className="quiet" onClick={() => void load().catch(() => setAccess("unavailable"))}>Retry</button>
  </section>;

  return <div className="farmer-wrap">
    <section className="panel grow-intro"><h2>Farmer Grow · Beta</h2><p>Plan your space, grow your crops, and keep track of harvests.</p>
      <details className="grow-privacy"><summary>Your farm data is private · Owner beta support access</summary>
        <p>During beta, Nile, the product Owner, may have administrator access for testing and support. He will only inspect or change your real farm records when you ask him to look or fix something. Product testing otherwise uses designated test data. Temporary cross-farm Owner access will be disabled before production.</p>
      </details>
    </section>
    {db && <GrowPlanner db={db} farmId={farmId} crops={crops} onDirty={setPlannerDirty} onCropSaved={cropSaved} onHarvest={openHarvest} />}
    <section className="panel grow-harvest" ref={harvestRef} aria-label="Harvest records">
      <div className="planner-heading"><div><span className="tag">From your crops</span><h2>Harvests</h2><p>Select a crop in your plot to record its harvest, or choose a saved crop here.</p></div>
        <button className="quiet" disabled={!crops.length} onClick={() => openHarvest(crops[0]?.id ?? "")}>Record a harvest</button>
      </div>
      {!crops.length && <p>Your crops will be available here after you add them to the workspace above.</p>}
      {harvestOpen && <form key={`${harvest?.id ?? "new"}-${formVersion}`} className="form planner-crop-form" onChange={() => setHarvestDirty(true)} onSubmit={event => void saveHarvest(event)}>
        <fieldset disabled={busy}>
          <h3>{harvest ? "Correct a harvest" : `Record a harvest · ${crops.find(crop => crop.id === harvestCrop)?.crop ?? "Choose crop"}`}</h3>
          <label>Harvested crop<select aria-label="Harvested crop" value={harvestCrop} onChange={event => setHarvestCrop(event.target.value)} disabled={!!harvest} required>
            <option value="" disabled>Choose a crop</option>{crops.map(crop => <option key={crop.id} value={crop.id}>{crop.crop} · {crop.name} · {crop.season}</option>)}
          </select></label>
          <div className="planner-form-grid">
            <label>Harvest date<input name="harvested_on" type="date" defaultValue={harvest?.harvested_on} required /></label>
            <label>Quantity<input name="quantity" type="number" min="0.001" max="999999" step="0.001" defaultValue={harvest?.quantity} required /></label>
            <label>Unit<select name="unit" defaultValue={harvest?.unit ?? "lb"}>{["lb", "kg", "bunch", "each", "bag", "box"].map(unit => <option key={unit}>{unit}</option>)}</select></label>
          </div>
          <label>Harvest notes<textarea name="notes" maxLength={2000} defaultValue={harvest?.notes} /></label>
          <p role="status">{message}</p><div className="planner-actions">
            <button className="primary" disabled={!harvestCrop}>Save harvest</button>
            <button type="button" className="quiet" onClick={() => { if (harvestDirty && !window.confirm("Discard this unsaved harvest entry?")) return; setHarvestDirty(false); setHarvestOpen(false); }}>Close harvest form</button>
          </div>
        </fieldset>
      </form>}
      <details className="planner-more"><summary>Harvest history · {harvests.length} records</summary>
        {!harvests.length && <p>No harvests recorded yet.</p>}
        {harvests.map(record => <article className="block" key={record.id}>
          <h3>{crops.find(crop => crop.id === record.plot_id)?.crop ?? "Crop"} · {record.harvested_on}</h3><p>{record.quantity} {record.unit} · {record.notes}</p>
          <button className="quiet" onClick={() => openHarvest(record.plot_id, record)}>Correct this harvest</button>
        </article>)}
      </details>
    </section>
    <details className="panel"><summary>Saved crop records · {crops.length}</summary>
      <p>These are crop details, not additional physical plots. Use “Use a saved crop” in a plot to place one of these records. Expected harvest dates are your plans, not forecasts.</p>
      {crops.map(crop => <article className="block" key={crop.id}><h3>{crop.crop} · {crop.name} · {crop.season}</h3>
        <p>Planted: {crop.planted_on ?? "Not set"} · Expected harvest: {crop.planned_harvest_on ?? "Not set"}</p><p>{crop.soil_type} {crop.notes}</p>
        <button className="quiet" onClick={() => openHarvest(crop.id)}>Record harvest</button>
      </article>)}
    </details>
    <details className="panel"><summary>Crop & harvest correction history · latest 30</summary>
      {!history.length && <p>No corrections recorded.</p>}
      {history.map(record => <div className="block" key={record.id}><p>{record.changed_at} · {record.record_type === "grow_plots" ? "Crop details" : "Harvest"}</p>
        <p>Previous values: {Object.entries(record.previous_value).filter(([key]) => !["id", "farm_id", "created_at", "plot_id"].includes(key)).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value ?? "Not recorded"}`).join(" · ")}</p>
      </div>)}
    </details>
  </div>;
}
