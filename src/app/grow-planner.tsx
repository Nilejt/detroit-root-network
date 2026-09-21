"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import GrowCropForm, { type GrowCrop, type CropSize } from "./grow-crop-form";
import { colors, findSpot, MAX_PLOT_LENGTH_FT, MAX_PLOT_WIDTH_FT, newLayout, type CropLayer, type Layout } from "@/lib/grow-layout";

type Saved = { id: string; name: string; revision: number; document: Layout; archived_at?: string | null };
type Snapshot = { name: string; document: Layout };
type CropPanel = "closed" | "new" | "existing" | "edit";

/** A physical plot owns the visible workflow. Crop records remain independent
 * identities so historical harvests survive placement changes. All geometry writes
 * still use migration 010's permission-checked, versioned save function.
 */
export default function GrowPlanner({ db, farmId, crops, onDirty, onCropSaved, onHarvest }: {
  db: SupabaseClient; farmId: string; crops: GrowCrop[];
  onDirty: (dirty: boolean) => void;
  onCropSaved: (crop: GrowCrop) => void;
  onHarvest: (cropId: string) => void;
}) {
  const [saved, setSaved] = useState<Saved[]>([]);
  const [deleted, setDeleted] = useState<Saved[]>([]);
  const [id, setId] = useState("");
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<Snapshot>({ name: "", document: newLayout() });
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [entryDirty, setEntryDirty] = useState(false);
  const [status, setStatus] = useState("Loading your plots…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState<CropLayer | null>(null);
  const [cropPanel, setCropPanel] = useState<CropPanel>("closed");
  const [editCropId, setEditCropId] = useState("");
  const [history, setHistory] = useState<(Saved & { saved_at: string; is_archived?: boolean })[]>([]);
  const [help, setHelp] = useState(false);
  const entryRef = useRef<HTMLDivElement>(null);
  const layout = draft.document;
  const plotName = draft.name.trim() || "Untitled plot";
  const active = layout.layers.find(layer => layer.plotId === selected);
  const activeCrop = crops.find(crop => crop.id === selected);
  const hasUnsaved = dirty || entryDirty || pending !== null;
  const cropLabel = (cropId: string) => {
    const crop = crops.find(c => c.id === cropId);
    return crop ? `${crop.crop} · ${crop.name}` : "Crop unavailable";
  };

  const selectSaved = useCallback((row?: Saved) => {
    setId(row?.id ?? crypto.randomUUID()); setRevision(row?.revision ?? 0);
    setDraft(row ? { name: row.name, document: row.document } : { name: "", document: newLayout() });
    setDirty(false); setEntryDirty(false); setUndo([]); setSelected("");
    setHistory([]); setPending(null);
    setCropPanel("closed"); setSetupOpen(!row);
  }, []);

  const load = useCallback(async (preferredId?: string) => {
    const result = await db.from("grow_layouts").select("id,name,revision,document,archived_at").eq("farm_id", farmId).order("name");
    if (result.error) {
      setStatus("Could not load your plots. Check your connection or ask the Owner to check Grow access.");
      return;
    }
    const rows = (result.data ?? []) as Saved[];
    const activeRows = rows.filter(row => !row.archived_at);
    setDeleted(rows.filter(row => !!row.archived_at));
    setSaved(activeRows); selectSaved(activeRows.find(row => row.id === preferredId) ?? activeRows[0]); setReady(true);
    setStatus(activeRows.length ? "Your saved plot is ready." : "Start by naming your growing space, such as North bed.");
  }, [db, farmId, selectSaved]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Loads only the current farm's private plots.
    void load().catch(() => setStatus("Connection interrupted. Retry loading your plots."));
  }, [load]);
  useEffect(() => { onDirty(hasUnsaved); }, [hasUnsaved, onDirty]);
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  function change(next: Snapshot) {
    setUndo(items => [...items.slice(-29), draft]); setDraft(next); setDirty(true);
    setStatus("Plot changes are not saved yet.");
  }
  function changeLayout(next: Layout) { change({ ...draft, document: next }); }
  function discardOK() {
    return !hasUnsaved || window.confirm("Leave these unsaved plot changes? Crop details already saved will remain available to place later.");
  }
  function closeEntry() {
    if (pending && !window.confirm("Cancel this placement? The crop details stay saved and can be placed later.")) return false;
    setPending(null);
    if (entryDirty && !window.confirm("Discard the unsaved crop details?")) return false;
    setEntryDirty(false); setCropPanel("closed"); return true;
  }
  function openEntry(panel: CropPanel, cropId = "") {
    if (!closeEntry()) return;
    setEditCropId(cropId); setCropPanel(panel); setPending(null);
    requestAnimationFrame(() => {
      entryRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      entryRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>("input,select")?.focus({ preventScroll: true });
    });
  }
  function cropSaved(crop: GrowCrop, size?: CropSize) {
    onCropSaved(crop); setEntryDirty(false); setCropPanel("closed");
    if (size) addCropToPlot({ plotId: crop.id, x: 0, y: 0, ...size }, crop.crop);
    else setStatus(`${crop.crop} details saved.`);
  }
  function chooseCrop(cropId: string) {
    if (!closeEntry()) return;
    setSelected(cropId); setPending(null);
  }
  function addCropToPlot(layer: CropLayer, label: string) {
    const spot = findSpot(layout, layer);
    if (!spot) { setStatus("This plot has no room left for another crop. Remove a crop before adding one."); return; }
    const exists = layout.layers.some(c => c.plotId === spot.plotId);
    changeLayout({ ...layout, layers: exists ? layout.layers.map(c => c.plotId === spot.plotId ? spot : c) : [...layout.layers, spot] });
    setSelected(spot.plotId);
    setStatus(`${label} added to ${plotName}. Save the plot to keep it.`);
  }
  async function save() {
    if (busy || !draft.name.trim()) return;
    if (isDraft && !layout.plot_size) {
      setStatus("Record the plot width and length before saving this new plot.");
      setSetupOpen(true);
      return;
    }
    setBusy(true);
    try {
      const result = await db.rpc("drn_save_grow_layout", {
        target_farm: farmId, layout_id: id, expected_revision: revision,
        layout_name: draft.name.trim(), layout_document: layout,
      });
      if (result.error) {
        setStatus(result.error.code === "40001"
          ? "Someone saved a newer version. Your draft is still here. Use Saved versions & recovery to reload before making your changes again."
          : "Could not save this plot. Check your connection and farm access. Your changes are still here.");
        return;
      }
      const next = { id, name: draft.name.trim(), document: layout, revision: Number(result.data) };
      setSaved(items => [...items.filter(row => row.id !== id), next]);
      setRevision(next.revision); setDirty(false); setHistory([]); setSetupOpen(false);
      setStatus(`${next.name} saved with ${layout.layers.length} ${layout.layers.length === 1 ? "crop" : "crops"}.`);
    } catch {
      setStatus("The save response was interrupted. Your draft is still here. Reload the saved plot to check whether it reached the server.");
    } finally { setBusy(false); }
  }

  async function archivePlot(row: Saved, shouldDelete: boolean) {
    if (busy) return;
    const action = shouldDelete ? `Delete “${row.name}” from your active plots? Its crop details and harvest history will be kept, and you can restore this plot later.` : `Restore “${row.name}” and open it?`;
    if (!window.confirm(action + (hasUnsaved ? " Unsaved work in the current plot will be discarded." : ""))) return;
    setBusy(true);
    try {
      const result = await db.rpc("drn_archive_grow_layout", {
        target_farm: farmId, target_layout: row.id, expected_revision: row.revision, archive_plot: shouldDelete,
      });
      if (result.error) {
        setStatus(result.error.code === "40001" ? "This plot changed elsewhere. Reload the saved plot before deleting or restoring it." : "Could not change this plot. Your records are unchanged. Check your connection or ask the Owner to check the plot recovery setup.");
        return;
      }
      const updated = { ...row, revision: Number(result.data), archived_at: shouldDelete ? new Date().toISOString() : null };
      if (shouldDelete) {
        const remaining = saved.filter(item => item.id !== row.id);
        setSaved(remaining); setDeleted(items => [...items.filter(item => item.id !== row.id), updated]);
        selectSaved(remaining[0]);
        setStatus(`${row.name} deleted from active plots. Crop details and harvest history are kept. Restore it under Manage plots.`);
      } else {
        setDeleted(items => items.filter(item => item.id !== row.id));
        setSaved(items => [...items.filter(item => item.id !== row.id), updated]); selectSaved(updated);
        setStatus(`${row.name} restored and selected.`);
      }
    } catch { setStatus("The response was interrupted. Reload your plots to check whether the delete or restore completed before retrying."); }
    finally { setBusy(false); }
  }

  const isDraft = !saved.some(row => row.id === id);
  const needsDimensions = isDraft && !layout.plot_size;
  const unplaced = crops.filter(crop => !layout.layers.some(layer => layer.plotId === crop.id));
  const editingCrop = crops.find(crop => crop.id === editCropId);

  return <section className="panel grow-planner" aria-label="Plot planner">
    <div className="planner-heading">
      <div><span className="tag">Your private growing space</span><h2>Your plots & crops</h2>
        <p>A plot is the space. Crops are what you grow inside it.</p></div>
      <button className="quiet" onClick={() => setHelp(value => !value)} aria-expanded={help}>How this works</button>
    </div>
    {help && <aside className="planner-help">
      <ol><li><strong>Name your plot.</strong> Record its real width and length in feet.</li>
        <li><strong>Add a crop.</strong> Enter its dates and notes; it joins this plot’s crop list.</li>
        <li><strong>Save your plot.</strong> Select any crop to edit its details or record a harvest.</li></ol>
      <p>Visual plot layout is paused while a scaled planner is designed. Recorded dimensions and saved crop records are kept.</p>
    </aside>}
    <p className="planner-status" role="status" aria-live="polite">{status}</p>
    {!ready ? <button className="quiet" onClick={() => void load().catch(() => setStatus("Could not reload your plots."))}>Retry plots</button> : <fieldset disabled={busy} className="planner-workspace">
      <div className="planner-plot-picker">
        <label>Current plot
          <select aria-label="Current plot" value={id} onChange={event => {
            if (discardOK()) { selectSaved(saved.find(row => row.id === event.target.value)); setStatus("Selected plot loaded."); }
          }}>
            {isDraft && <option value={id}>{plotName} · not saved</option>}
            {saved.map(row => {
              const currentName = row.id === id ? plotName : row.name;
              const duplicate = saved.filter(other => other.name === row.name).length > 1;
              return <option key={row.id} value={row.id}>{currentName}{duplicate ? ` · ${row.id.slice(0, 6)}` : ""}{row.id === id && dirty ? " · unsaved changes" : ""}</option>;
            })}
          </select>
        </label>
        <button className="quiet" onClick={() => {
          if (discardOK()) { selectSaved(); setStatus("Name your new plot to get started."); }
        }}>+ Create another plot</button>
      </div>
      <div className="planner-context">
        <div><h3>{plotName}</h3><p>{layout.plot_size ? `${layout.plot_size.width_ft} × ${layout.plot_size.length_ft} ft` : "Dimensions not recorded"} · {layout.layers.length} crops on this plot</p></div>
        <span className="planner-save-state">{dirty || !revision ? "Not saved" : "Saved"}</span>
      </div>
      <div className="planner-step-heading">
        <span className="planner-step">1</span><h3>Plot name & dimensions</h3>
        <button className="quiet" aria-expanded={setupOpen} onClick={() => setSetupOpen(value => !value)}>{setupOpen ? "Hide plot settings" : "Edit plot settings"}</button>
      </div>
      {setupOpen && <div className="planner-settings">
        <div className="planner-form-grid">
          <label>Plot name<input value={draft.name} maxLength={120} placeholder="For example, North bed" onChange={event => change({ ...draft, name: event.target.value })} /></label>
        </div>
        <form key={`size-${id}`} onSubmit={event => {
          event.preventDefault(); const fields = new FormData(event.currentTarget);
          const width = Number(fields.get("width_ft")); const length = Number(fields.get("length_ft"));
          if (!Number.isInteger(width) || !Number.isInteger(length) || width < 1 || length < 1 || width > MAX_PLOT_WIDTH_FT || length > MAX_PLOT_LENGTH_FT) {
            setStatus(`Enter whole feet: width up to ${MAX_PLOT_WIDTH_FT} ft and length up to ${MAX_PLOT_LENGTH_FT} ft.`); return;
          }
          changeLayout({ ...layout, plot_size: { width_ft: width, length_ft: length } });
          setStatus(`Plot size recorded as ${width} × ${length} ft. Save the plot to keep it.`);
        }}>
          <div className="planner-form-grid">
            <label>Plot width (ft)<input name="width_ft" type="number" min="1" max={MAX_PLOT_WIDTH_FT} step="1" defaultValue={layout.plot_size?.width_ft ?? ""} required /></label>
            <label>Plot length (ft)<input name="length_ft" type="number" min="1" max={MAX_PLOT_LENGTH_FT} step="1" defaultValue={layout.plot_size?.length_ft ?? ""} required /></label>
          </div>
          <div className="planner-actions"><button className="quiet">Record plot dimensions</button></div>
          <p className="planner-caption">Dimensions are in feet, up to {MAX_PLOT_WIDTH_FT} ft wide and {MAX_PLOT_LENGTH_FT} ft long. Visual plot layout is paused while a scaled planner is designed; any layout you saved before is preserved untouched.</p>
        </form>
        <button className="primary" disabled={!draft.name.trim() || needsDimensions} onClick={() => { setSetupOpen(false); setStatus("Your plot is named and sized. Add your first crop or use an existing crop record."); }}>Continue to crops</button>
      </div>}

      <div className="planner-crop-workspace">
        <div className="planner-step-heading"><span className="planner-step">2</span><div><h3>Crops in {plotName}</h3><p>Add crops to this plot and keep their details current.</p></div></div>
        <div className="planner-actions">
          <button className="primary" disabled={!draft.name.trim() || needsDimensions || layout.layers.length >= 60 || !!pending} onClick={() => openEntry("new")}>+ Add a crop</button>
          <button className="quiet" disabled={!draft.name.trim() || needsDimensions || !unplaced.length || layout.layers.length >= 60 || !!pending} onClick={() => openEntry("existing")}>Use a saved crop</button>
        </div>
        {!draft.name.trim() && <p>Name the plot above to start adding crops.</p>}
        <div ref={entryRef} className="planner-entry">
          {(cropPanel === "new" || (cropPanel === "edit" && editingCrop)) && <GrowCropForm
            key={`${cropPanel}-${editCropId}`} db={db} farmId={farmId}
            crop={cropPanel === "edit" ? editingCrop : undefined} plotName={plotName}
            colorIndex={layout.layers.length}
            onDirty={() => setEntryDirty(true)} onSaved={cropSaved} onCancel={() => { closeEntry(); }}
          />}
          {cropPanel === "existing" && <form className="planner-crop-form" onChange={() => setEntryDirty(true)} onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget);
            const cropId = String(fields.get("crop"));
            setCropPanel("closed"); setEntryDirty(false);
            addCropToPlot({ plotId: cropId, x: 0, y: 0, width: 1, height: 1, color: String(fields.get("color")) }, cropLabel(cropId));
          }}>
            <h3>Place an existing crop in {plotName}</h3><p>These crop records are saved, but are not on this plot yet. This does not create a copy of the crop.</p>
            <label>Saved crop<select aria-label="Saved crop" name="crop" required defaultValue=""><option value="" disabled>Choose a crop</option>{unplaced.map(crop => <option key={crop.id} value={crop.id}>{cropLabel(crop.id)} · {crop.season}</option>)}</select></label>
            <div className="planner-form-grid">
              <label>Crop color<input name="color" type="color" defaultValue={colors[layout.layers.length % colors.length]} /></label>
            </div>
            <div className="planner-actions"><button className="primary">Add to this plot</button><button type="button" className="quiet" onClick={() => { closeEntry(); }}>Cancel</button></div>
          </form>}
        </div>

        <div className="planner-columns">
          <div className="planner-layers">
            <h4>Crops on this plot <span>({layout.layers.length})</span></h4>
            {!layout.layers.length && <div className="planner-empty"><p>Your plot is ready for crops.</p><p>Use <strong>Add a crop</strong> above. It will appear in this list.</p></div>}
            <div className="planner-layer-list">
              {layout.layers.map((layer, index) => <button className={`planner-layer ${selected === layer.plotId ? "is-selected" : ""}`}
                key={layer.plotId} aria-pressed={selected === layer.plotId} onClick={() => chooseCrop(layer.plotId)}>
                <span className="planner-layer-number" style={{ borderColor: layer.color }}>{index + 1}</span>
                <span><strong>{crops.find(crop => crop.id === layer.plotId)?.crop ?? "Crop"}</strong>
                  <small>{crops.find(crop => crop.id === layer.plotId)?.name}</small>
                  <small>{crops.find(crop => crop.id === layer.plotId)?.season}</small></span>
                <span className="planner-layer-action">{selected === layer.plotId ? "Selected" : "Select"}</span>
              </button>)}
            </div>
          </div>
        </div>
        {active && <section className="planner-selected" aria-label="Selected crop">
          <div className="planner-heading"><div><span className="planner-caption">Working with a crop in {plotName}</span>
            <h3>{activeCrop?.crop ?? "Selected crop"}</h3><p>Plant: {activeCrop?.planted_on ?? "Not set"} · Expected harvest: {activeCrop?.planned_harvest_on ?? "Not set"}</p></div>
            <button className="quiet" onClick={() => { setSelected(""); }}>Close crop controls</button>
          </div>
          <div className="planner-actions">
            <button className="primary" onClick={() => openEntry("edit", active.plotId)}>Edit crop details</button>
            <button className="quiet" onClick={() => onHarvest(active.plotId)}>Record harvest for this crop</button>
          </div>
          <details className="planner-more"><summary>Crop color and removal</summary>
            <label>Selected crop color<input type="color" value={active.color} onChange={event => changeLayout({ ...layout, layers: layout.layers.map(layer => layer.plotId === active.plotId ? { ...layer, color: event.target.value } : layer) })} /></label>
            <div className="planner-actions">
              <button className="quiet" onClick={() => { changeLayout({ ...layout, layers: layout.layers.filter(layer => layer.plotId !== active.plotId) }); setSelected(""); }}>Remove crop from this plot</button>
            </div><p className="planner-caption">Removing a crop from this plot keeps its saved details and harvest records.</p>
          </details>
        </section>}
      </div>
      <div className="planner-savebar">
        <div><strong>{plotName}</strong><span>{pending ? "Choose a crop position first" : entryDirty ? "Finish or cancel crop details first" : dirty || !revision ? "Plot changes are not saved" : "All plot changes saved"}</span></div>
        <div className="planner-actions">
          <button className="quiet" disabled={!undo.length || !!pending || entryDirty} onClick={() => {
            setDraft(undo.at(-1)!); setUndo(items => items.slice(0, -1)); setDirty(true); setSelected("");
          }}>Undo plot change</button>
          <button className="primary" disabled={!draft.name.trim() || needsDimensions || !!pending || entryDirty || (!dirty && revision > 0)} onClick={() => void save()}>{busy ? "Saving…" : revision ? "Save plot changes" : "Save this plot"}</button>
        </div>
      </div>
      <details className="planner-more">
        <summary>Manage plots · delete or restore</summary>
        <p>Delete removes a physical plot from the active list. Its saved crop details, harvests and layout history stay private and can be recovered.</p>
        {revision > 0 ? <button className="quiet planner-delete" onClick={() => void archivePlot(saved.find(row => row.id === id)!, true)}>Delete this plot</button> : <p>This new plot has not been saved yet.</p>}
        <h4>Deleted plots ({deleted.length})</h4>
        {!deleted.length && <p>No deleted plots.</p>}
        {deleted.map(row => <div className="planner-deleted-row" key={row.id}>
          <div><strong>{row.name}</strong><p>{row.document.layers.length} crops · deleted {new Date(row.archived_at!).toLocaleDateString()}</p></div>
          <button className="quiet" onClick={() => void archivePlot(row, false)}>Restore {row.name}</button>
        </div>)}
      </details>
      <details className="planner-more">
        <summary>Saved versions & recovery</summary><p>Crop details save separately. These versions preserve plot outlines and crop positions.</p>
        <div className="planner-actions">
          <button className="quiet" onClick={() => { if (discardOK()) void load(id).catch(() => setStatus("Could not reload. Your draft is still here.")); }}>Reload saved plot</button>
          <button className="quiet" disabled={!revision} onClick={async () => {
            try {
              const result = await db.from("grow_layout_revisions").select("name,revision,document,saved_at,is_archived").eq("farm_id", farmId).eq("layout_id", id).order("revision", { ascending: false }).limit(20);
              if (result.error) setStatus("Could not load saved versions.");
              else setHistory(result.data as (Saved & { saved_at: string; is_archived?: boolean })[]);
            } catch { setStatus("Could not load saved versions. Check your connection."); }
          }}>Show saved versions</button>
        </div>
        {history.map(row => <details className="planner-more" key={row.revision}>
          <summary>Version {row.revision}{row.is_archived ? " · deleted" : ""} · {row.name} · {new Date(row.saved_at).toLocaleString()}</summary>
          <p>{row.document.cells.length} square {row.document.unit} · {row.document.layers.length} crops</p>
          <button className="quiet" onClick={() => {
            if (!discardOK()) return;
            change({ name: row.name, document: row.document }); setEntryDirty(false); setCropPanel("closed"); setSelected(""); setPending(null);
          }}>Use this version as a draft</button>
        </details>)}
      </details>
    </fieldset>}
  </section>;
}
