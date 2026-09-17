"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import GrowPlanner from "./grow-planner";
import type { SupabaseClient } from "@supabase/supabase-js";

type Plot = { id: string; name: string; crop: string; season: number; planted_on: string | null; planned_harvest_on: string | null; soil_type: string; notes: string };
type Harvest = { id: string; plot_id: string; harvested_on: string; quantity: number; unit: string; notes: string };
type History = { id: string; record_type: string; previous_value: Record<string, unknown>; changed_at: string };

/** Grow is deliberately separate from sale inventory and public listings.
 * Membership, the temporary Owner support exception, and T1 restrictions are
 * enforced by SQL, never by the mode switch. See migration 009 and its runbook.
 */
export default function GrowTools({ db, farmId, onDirty }: { db: SupabaseClient | null; farmId: string; onDirty: (dirty: boolean) => void }) {
  const [access, setAccess] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [plots, setPlots] = useState<Plot[]>([]), [harvests, setHarvests] = useState<Harvest[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [plot, setPlot] = useState<Plot | null>(null), [harvest, setHarvest] = useState<Harvest | null>(null);
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const load = useCallback(async () => {
    if (!db) { setAccess("unavailable"); return; }
    const permission = await db.rpc("drn_can_grow", { target_farm: farmId });
    if (permission.error) { setAccess("unavailable"); return; }
    if (!permission.data) { setAccess("denied"); setPlots([]); setHarvests([]); setHistory([]); return; }
    const [p,h,a] = await Promise.all([
      db.from("grow_plots").select("id,name,crop,season,planted_on,planned_harvest_on,soil_type,notes").eq("farm_id",farmId).order("season",{ascending:false}),
      db.from("grow_harvests").select("id,plot_id,harvested_on,quantity,unit,notes").eq("farm_id",farmId).order("harvested_on",{ascending:false}),
      db.from("grow_history").select("id,record_type,previous_value,changed_at").eq("farm_id",farmId).order("changed_at",{ascending:false}).limit(30),
    ]);
    if(p.error||h.error||a.error){setAccess("unavailable");return;}
    setPlots(p.data??[]);setHarvests(h.data??[]);setHistory(a.data??[]);setAccess("ready");
  },[db,farmId]);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes private database records.
    void load().catch(()=>setAccess("unavailable"));
  },[load]);
  async function save(event: FormEvent<HTMLFormElement>,kind:"plot"|"harvest") {
    event.preventDefault();if(!db||busy)return;setBusy(true);setMessage("");
    const f=new FormData(event.currentTarget);
    const text=(key:string)=>String(f.get(key)??"").trim();
    try {
      const row=kind==="plot"?{name:text("name"),crop:text("crop"),season:Number(f.get("season")),planted_on:text("planted_on")||null,planned_harvest_on:text("planned_harvest_on")||null,soil_type:text("soil_type"),notes:text("notes")}:{harvested_on:text("harvested_on"),quantity:Number(f.get("quantity")),unit:text("unit"),notes:text("notes")};
      const table=kind==="plot"?"grow_plots":"grow_harvests",editing=kind==="plot"?plot:harvest;
      const result=editing?await db.from(table).update(row).eq("id",editing.id).eq("farm_id",farmId).select("id").single():await db.from(table).insert({...row,farm_id:farmId,...(kind==="harvest"?{plot_id:text("plot_id")}: {})}).select("id").single();
      if(result.error){setMessage("Could not save. Check your entries and farm access. Your draft is still here.");return;}
      setPlot(null);setHarvest(null);setFormVersion(v=>v+1);await load();setMessage("Saved privately. Sale inventory and public listings are unchanged.");
    }catch{setMessage("Connection interrupted. Check saved records before retrying.");}finally{setBusy(false);}
  }
  if(access!=="ready")return <section className="panel"><h2>Farmer Grow · Beta</h2><p>{access==="loading"?"Loading your growing workspace…":access==="denied"?"Grow records are private to this farm’s members. Choose a farm you belong to, or ask the Owner to assign membership. Cross-farm selling access does not grant Grow access.":"Grow is not available yet. Apply migration 008, then reload; if it is already installed, check your connection."}</p><button className="quiet" onClick={()=>void load().catch(()=>setAccess("unavailable"))}>Retry</button></section>;
  return <div className="farmer-wrap"><section className="panel"><h2>Farmer Grow · Beta</h2><p>Plan a plot. Record a harvest. Learn from your own records.</p><span className="tag">Private farm workspace</span><aside className="grow-privacy" aria-label="Beta data access notice"><strong>Your farm data during beta</strong><p>Your growing records are not public. During beta, Nile, the product Owner, may have administrator access for testing and support. He will only inspect or change your real farm records when you ask him to look or fix something. Product testing otherwise uses designated test data. Temporary cross-farm Owner access will be disabled before production.</p></aside><p>Harvest dates are your plans, not forecasts. Forecasting and multi-year planning are coming later.</p><p role="status">{message}</p></section>
    {db && <GrowPlanner db={db} farmId={farmId} crops={plots} onDirty={onDirty} />}
    <div className="opsgrid"><form key={`plot-${plot?.id??"new"}-${formVersion}`} className="panel form" onSubmit={e=>void save(e,"plot")}><h2>{plot?"Edit crop plan":"Plan a crop"}</h2>
      <label>Crop plan name<input name="name" defaultValue={plot?.name} maxLength={120} required /></label><label>Crop<input name="crop" defaultValue={plot?.crop} maxLength={120} required /></label>
      <label>Season year<input name="season" type="number" min="2000" max="2200" defaultValue={plot?.season??new Date().getFullYear()} required /></label>
      <label>Planting date<input name="planted_on" type="date" defaultValue={plot?.planted_on??""} /></label><label>Planned harvest date<input name="planned_harvest_on" type="date" defaultValue={plot?.planned_harvest_on??""} /></label>
      <details><summary>Optional soil and notes</summary><label>Soil type<input name="soil_type" defaultValue={plot?.soil_type} maxLength={200} /></label><label>Growing notes<textarea name="notes" defaultValue={plot?.notes} maxLength={2000}/></label></details>
      <button className="primary" disabled={busy}>Save crop plan</button>{plot&&<button type="button" className="quiet" onClick={()=>setPlot(null)}>Cancel plot edit</button>}
    </form><form key={`harvest-${harvest?.id??"new"}-${formVersion}`} className="panel form" onSubmit={e=>void save(e,"harvest")}><h2>{harvest?"Correct harvest record":"Record a harvest"}</h2>
      <label>Plot<select name="plot_id" defaultValue={harvest?.plot_id??plots[0]?.id} disabled={!!harvest||!plots.length} required>{plots.map(p=><option key={p.id} value={p.id}>{p.name} · {p.crop} · {p.season}</option>)}</select></label>
      <label>Harvest date<input name="harvested_on" type="date" defaultValue={harvest?.harvested_on} required /></label><label>Quantity<input name="quantity" type="number" min="0.001" max="999999" step="0.001" defaultValue={harvest?.quantity} required /></label><label>Unit<select name="unit" defaultValue={harvest?.unit??"lb"}>{["lb","kg","bunch","each","bag","box"].map(u=><option key={u}>{u}</option>)}</select></label><label>Harvest notes<textarea name="notes" maxLength={2000} defaultValue={harvest?.notes}/></label>
      <button className="primary" disabled={busy||!plots.length}>Save harvest</button>{!plots.length&&<p>Save your first plot before recording a harvest.</p>}{harvest&&<button type="button" className="quiet" onClick={()=>setHarvest(null)}>Cancel correction</button>}
    </form></div>
    <section className="panel"><h2>Your crop plans</h2>{!plots.length&&<p>No plot plans yet.</p>}{plots.map(p=><article className="block" key={p.id}><h3>{p.name} · {p.crop} · {p.season}</h3><p>Planted: {p.planted_on??"Not recorded"} · Planned harvest: {p.planned_harvest_on??"Not set"}</p><p>{p.soil_type} {p.notes}</p><button className="quiet" onClick={()=>setPlot(p)}>Edit {p.name}</button></article>)}</section>
    <section className="panel"><h2>Harvest history</h2>{!harvests.length&&<p>No harvests recorded yet.</p>}{harvests.map(h=><article className="block" key={h.id}><h3>{plots.find(p=>p.id===h.plot_id)?.name??"Plot"} · {h.harvested_on}</h3><p>{h.quantity} {h.unit} · {h.notes}</p><button className="quiet" onClick={()=>setHarvest(h)}>Correct record</button></article>)}</section>
    <details className="panel"><summary>Correction history · latest 30 changes</summary>{!history.length&&<p>No corrections recorded.</p>}{history.map(h=><div className="block" key={h.id}><p>{h.changed_at} · {h.record_type==="grow_plots"?"Plot plan":"Harvest"}</p><p>Previous values: {Object.entries(h.previous_value).filter(([key])=>!["id","farm_id","created_at","plot_id"].includes(key)).map(([key,value])=>`${key.replaceAll("_"," ")}: ${value??"Not recorded"}`).join(" · ")}</p></div>)}</details>
  </div>;
}
