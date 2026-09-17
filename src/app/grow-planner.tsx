"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { colors, fits, footprint, GRID, newLayout, overlaps, rectangle, type CropLayer, type Layout } from "@/lib/grow-layout";

type Crop = { id: string; name: string; crop: string; season: number; planted_on: string | null; planned_harvest_on: string | null };
type Saved = { id: string; name: string; revision: number; document: Layout };
type Snapshot = { name: string; document: Layout };

/** One physical plot per layout, with dated crop-plan references. Nothing here
 * publishes inventory. Writes use the atomic, permission-checked SQL RPC only.
 */
export default function GrowPlanner({ db, farmId, crops, onDirty }: {
  db: SupabaseClient; farmId: string; crops: Crop[]; onDirty: (dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState<Saved[]>([]);
  const [id, setId] = useState("");
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<Snapshot>({ name: "New physical plot", document: newLayout() });
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("Loading layouts…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"select" | "shape" | "move" | "place">("select");
  const [selected, setSelected] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [chooser, setChooser] = useState<string[]>([]);
  const [pending, setPending] = useState<CropLayer | null>(null);
  const [history, setHistory] = useState<(Saved & { saved_at: string })[]>([]);
  const [help, setHelp] = useState(true);
  const layout = draft.document;
  const label = (cropId: string) => { const c = crops.find(c => c.id === cropId); return c ? `${c.name} · ${c.crop} · ${c.season}` : "Crop plan unavailable"; };
  const selectSaved = useCallback((row?: Saved) => {
    setId(row?.id ?? crypto.randomUUID()); setRevision(row?.revision ?? 0);
    setDraft(row ? { name: row.name, document: row.document } : { name: "New physical plot", document: newLayout() });
    setDirty(false); onDirty(false); setUndo([]); setSelected(""); setHidden([]); setHistory([]); setMode("select"); setPending(null); setChooser([]);
  }, [onDirty]);
  const load = useCallback(async (preferredId?: string) => {
    const result = await db.from("grow_layouts").select("id,name,revision,document").eq("farm_id", farmId).order("name");
    if (result.error) { setReady(false); setStatus("Layouts are unavailable. Migration 010 must be installed and Grow access enabled. Existing crop and harvest records remain below."); return; }
    const rows = (result.data ?? []) as Saved[]; setSaved(rows); selectSaved(rows.find(row => row.id === preferredId) ?? rows[0]); setReady(true); setStatus(rows.length ? "Saved layout loaded." : "Start a physical plot, then place your saved crop plans.");
  }, [db, farmId, selectSaved]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load this farm's private workspace.
    void load().catch(() => setStatus("Connection interrupted. Retry loading layouts."));
  }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: Snapshot) { setUndo(u => [...u.slice(-29), draft]); setDraft(next); setDirty(true); onDirty(true); setStatus("Unsaved layout changes."); }
  function changeLayout(next: Layout) { change({ ...draft, document: next }); }
  function discardOK() { return !dirty || window.confirm("Discard unsaved plot layout changes?"); }
  function place(layer: CropLayer) {
    if (!fits(layout, layer)) { setStatus("This crop must fit entirely inside the physical plot. Add plot cells or choose a smaller footprint."); return; }
    const collision = overlaps(layout, layer);
    if (collision.length && !window.confirm(`This overlaps ${collision.map(c => label(c.plotId)).join(", ")}. Keep intentional overlap? Dates and crop compatibility are not evaluated.`)) return;
    changeLayout({ ...layout, layers: [...layout.layers.filter(c => c.plotId !== layer.plotId), layer] });
    setSelected(layer.plotId); setMode("select"); setPending(null); setChooser([]);
  }
  function tap(cell: number) {
    const here = layout.layers.filter(layer => footprint(layer).includes(cell));
    if (mode === "shape") {
      if (layout.cells.includes(cell) && here.length) { setStatus("Move or remove the crop layer before removing its plot cell."); return; }
      if (layout.cells.length === 1 && layout.cells.includes(cell)) { setStatus("Keep at least one plot cell."); return; }
      changeLayout({ ...layout, cells: layout.cells.includes(cell) ? layout.cells.filter(c => c !== cell) : [...layout.cells, cell] }); return;
    }
    const moving = mode === "place" ? pending : mode === "move" ? layout.layers.find(c => c.plotId === selected) : null;
    if (moving) { place({ ...moving, x: cell % GRID, y: Math.floor(cell / GRID) }); return; }
    const visible = here.filter(c => !hidden.includes(c.plotId));
    setChooser(visible.length > 1 ? visible.map(c => c.plotId) : []);
    if (visible.length === 1) setSelected(visible[0].plotId);
  }
  async function save() {
    if (busy) return; setBusy(true);
    try {
      const result = await db.rpc("drn_save_grow_layout", { target_farm: farmId, layout_id: id, expected_revision: revision, layout_name: draft.name.trim(), layout_document: layout });
      if (result.error) { setStatus(result.error.code === "40001" ? "Someone saved a newer revision. Your draft is still here. Review it, then use Reload saved layout before making your changes again." : "Could not save. Check the plot name, farm access and connection. Your draft is still here."); return; }
      const next = { id, name: draft.name.trim(), document: layout, revision: Number(result.data) };
      setSaved(rows => [...rows.filter(r => r.id !== id), next]); setRevision(next.revision); setDirty(false); onDirty(false); setHistory([]); setStatus(`Saved privately · revision ${next.revision}.`);
    } catch { setStatus("Save response interrupted. Your draft is still here. Reload saved layout to check whether the save reached the server before retrying."); }
    finally { setBusy(false); }
  }
  const active = layout.layers.find(c => c.plotId === selected);
  // Cells retain 48px targets; larger plots scroll instead of shrinking on phones.
  const columns = Math.min(GRID, Math.max(6, ...layout.cells.map(c => c % GRID + 2)));
  const rows = Math.min(GRID, Math.max(6, ...layout.cells.map(c => Math.floor(c / GRID) + 2)));
  return <section className="panel grow-planner" aria-label="Plot planner">
    <div className="planner-heading"><div><span className="tag">Farmer Grow · Working beta</span><h2>Plot planner</h2><p>Shape your space. Place your crops. Keep a record.</p></div><button className="quiet" onClick={() => setHelp(h => !h)}>{help ? "Close walkthrough" : "How to use"}</button></div>
    {help && <aside className="planner-help"><strong>Your first plot, in five steps</strong><ol><li>Create a physical plot and choose feet or meters.</li><li>Set a rectangle, then use Edit boundary to add or remove single cells.</li><li>Save a crop plan in the form below, including dates and optional soil notes.</li><li>Choose that plan here, set its footprint, then tap its top-left destination. Select overlapping crops by name.</li><li>Save layout. Use Director Q → Plot planner to share feedback.</li></ol><p>Each square is 1 × 1 of the selected unit, not one plant. This is your planning sketch, not a surveyed boundary or a crop-spacing recommendation. Overlapping crops are allowed after confirmation.</p></aside>}
    <p role="status" aria-live="polite">{status}</p>
    {!ready ? <button className="quiet" onClick={() => void load().catch(() => setStatus("Could not reload. Check your connection."))}>Retry layouts</button> : <fieldset disabled={busy} className="planner-workspace">
      <div className="planner-toolbar"><label>Physical plot<select value={saved.some(s => s.id === id) ? id : ""} onChange={e => { if (discardOK()) selectSaved(saved.find(s => s.id === e.target.value)); }}><option value="">New physical plot</option>{saved.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="quiet" onClick={() => { if (discardOK()) selectSaved(); }}>New plot</button><label>Plot name<input maxLength={120} value={draft.name} onChange={e => change({ ...draft, name: e.target.value })} /></label><label>Cell unit<select value={layout.unit} disabled={revision > 0 || layout.layers.length > 0} onChange={e => changeLayout({ ...layout, unit: e.target.value as "ft" | "m" })}><option value="ft">1 × 1 foot</option><option value="m">1 × 1 meter</option></select></label></div>
      <p>{layout.cells.length} square {layout.unit === "ft" ? "feet" : "meters"} · {layout.layers.length} crop layers · {dirty ? "Unsaved changes" : revision ? `Saved revision ${revision}` : "New — not saved"}. Units lock after saving. All crop dates are shown together.</p>
      <form className="planner-toolbar" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const cells = rectangle(Number(f.get("width")), Number(f.get("height"))); const next = { ...layout, cells }; if (!layout.layers.every(c => fits(next, c))) { setStatus("The rectangle would exclude a crop. Move or remove that layer first."); return; } changeLayout(next); }}><label>Plot width<input name="width" type="number" min="1" max="12" defaultValue="4" required /></label><label>Plot length<input name="height" type="number" min="1" max="12" defaultValue="4" required /></label><button className="quiet">Apply rectangle</button></form>
      <div className="planner-toolbar">{([['select','Select crop'],['shape','Edit boundary'],['move','Move selected crop']] as const).map(([m,text]) => <button key={m} className={mode === m ? "primary" : "quiet"} aria-pressed={mode === m} disabled={m === "move" && !active} onClick={() => { setMode(m); setPending(null); }}>{text}</button>)}<button className="quiet" disabled={!undo.length} onClick={() => { const last = undo.at(-1)!; setDraft(last); setUndo(u => u.slice(0, -1)); setDirty(true); onDirty(true); setMode("select"); setPending(null); }}>Undo</button></div>
      <p>{mode === "shape" ? "Tap a square to add or remove plot boundary." : mode === "move" || mode === "place" ? "Tap the new top-left square for this crop." : "Tap a crop to select it. Scroll the grid to reach the rest of a large plot."}</p>
      <div className="planner-columns"><div><div className="planner-scroll" tabIndex={0} aria-label="Scrollable plot layout"><div className="planner-grid" style={{ gridTemplateColumns: `repeat(${columns}, 48px)` }}>{Array.from({ length: rows * columns }, (_, index) => {
        const cell = Math.floor(index / columns) * GRID + index % columns;
        const layers = layout.layers.filter(c => footprint(c).includes(cell) && !hidden.includes(c.plotId));
        const chosen = layers.find(c => c.plotId === selected) ?? layers.at(-1);
        return <button type="button" key={cell} className={`planner-cell ${layout.cells.includes(cell) ? "inside" : ""} ${layers.some(c => c.plotId === selected) ? "selected" : ""}`} style={chosen ? { backgroundColor: chosen.color + "55", borderColor: chosen.color } : undefined} aria-label={`Column ${cell % GRID + 1}, row ${Math.floor(cell / GRID) + 1}: ${layers.length ? layers.map(c => label(c.plotId)).join("; ") : layout.cells.includes(cell) ? "empty plot cell" : "outside plot"}`} onClick={() => tap(cell)}>{layers.length > 1 ? layers.length : chosen ? layout.layers.findIndex(c => c.plotId === chosen.plotId) + 1 : layout.cells.includes(cell) ? "·" : "+"}</button>;
      })}</div></div>{chooser.length > 1 && <div className="planner-help"><strong>Choose the crop at this square</strong>{chooser.map(c => <button className="quiet" key={c} onClick={() => { setSelected(c); setChooser([]); }}>{label(c)}</button>)}</div>}</div>
      <div className="planner-layers"><h3>Crop layers</h3>{!layout.layers.length && <p>No crops placed yet. Save a crop plan below, then add it here.</p>}{layout.layers.map((layer, index) => <div className="block" key={layer.plotId}><button className={selected === layer.plotId ? "primary" : "quiet"} onClick={() => { setSelected(layer.plotId); setMode("select"); }}>{index + 1}. {label(layer.plotId)}</button><p>{crops.find(c => c.id === layer.plotId)?.planted_on ?? "Plant date not set"} → {crops.find(c => c.id === layer.plotId)?.planned_harvest_on ?? "Harvest date not set"}</p><button className="quiet" aria-pressed={hidden.includes(layer.plotId)} onClick={() => setHidden(h => h.includes(layer.plotId) ? h.filter(v => v !== layer.plotId) : [...h, layer.plotId])}>{hidden.includes(layer.plotId) ? "Show" : "Hide"} layer {index + 1}</button></div>)}
      {active && <div className="planner-help"><strong>Selected: {label(active.plotId)}</strong><label>Layer color<input type="color" value={active.color} onChange={e => changeLayout({ ...layout, layers: layout.layers.map(c => c.plotId === active.plotId ? { ...c, color: e.target.value } : c) })} /></label><div className="planner-toolbar">{([[-1,0,"Left"],[0,-1,"Up"],[0,1,"Down"],[1,0,"Right"]] as const).map(([dx,dy,name]) => <button className="quiet" key={name} onClick={() => place({ ...active, x: active.x + dx, y: active.y + dy })}>{name}</button>)}</div><button className="quiet" onClick={() => { changeLayout({ ...layout, layers: layout.layers.filter(c => c.plotId !== active.plotId) }); setSelected(""); }}>Remove from layout</button><p>Removing a layer keeps its crop plan and harvest records.</p></div>}</div></div>
      <form className="planner-add" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setPending({ plotId: String(f.get("crop")), x: 0, y: 0, width: Number(f.get("width")), height: Number(f.get("height")), color: String(f.get("color")) }); setMode("place"); setStatus("Choose the crop’s top-left square on the grid. It is not placed until you tap."); }}><h3>Add a crop layer</h3><label>Saved crop plan<select name="crop" required defaultValue=""><option value="" disabled>Choose a crop plan</option>{crops.filter(c => !layout.layers.some(l => l.plotId === c.id)).map(c => <option key={c.id} value={c.id}>{label(c.id)}</option>)}</select></label><div className="planner-toolbar"><label>Crop footprint width<input name="width" type="number" min="1" max="12" defaultValue="1" required /></label><label>Crop footprint length<input name="height" type="number" min="1" max="12" defaultValue="1" required /></label><label>Crop color<input type="color" name="color" key={layout.layers.length} defaultValue={colors[layout.layers.length % colors.length]} /></label></div><button className="quiet" disabled={layout.layers.length >= 60 || !crops.some(c => !layout.layers.some(l => l.plotId === c.id))}>Choose placement</button><p>Footprint is measured in {layout.unit === "ft" ? "feet" : "meters"}. Crop dates, soil and notes are edited in the crop plan below.</p></form>
      <div className="planner-toolbar"><button className="primary" disabled={!draft.name.trim() || (!dirty && revision > 0)} onClick={() => void save()}>{busy ? "Saving…" : "Save layout"}</button><button className="quiet" onClick={() => { if (discardOK()) void load(id).catch(() => setStatus("Could not reload. Your draft is still here.")); }}>Reload saved layout</button><button className="quiet" disabled={!revision} onClick={async () => { const r = await db.from("grow_layout_revisions").select("name,revision,document,saved_at").eq("farm_id", farmId).eq("layout_id", id).order("revision", { ascending: false }).limit(20); if (r.error) setStatus("Could not load revision history."); else setHistory(r.data as (Saved & { saved_at: string })[]); }}>View saved revisions</button></div>
      {history.map(row => <details className="block" key={row.revision}><summary>Revision {row.revision} · {row.name} · {new Date(row.saved_at).toLocaleString()}</summary><p>{row.document.cells.length} square {row.document.unit} · {row.document.layers.length} crop layers</p><button className="quiet" onClick={() => { change({ name: row.name, document: row.document }); setMode("select"); setPending(null); }}>Use as draft</button><p>Saving this draft creates a new revision. Previous revisions remain available.</p></details>)}
    </fieldset>}
  </section>;
}
