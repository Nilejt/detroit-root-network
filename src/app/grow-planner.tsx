"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import GrowCropForm, { type GrowCrop, type CropSize } from "./grow-crop-form";
import { colors, fits, footprint, GRID, newLayout, overlaps, rectangle, type CropLayer, type Layout } from "@/lib/grow-layout";

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
  const [mode, setMode] = useState<"select" | "shape" | "move" | "place">("select");
  const [selected, setSelected] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [chooser, setChooser] = useState<string[]>([]);
  const [pending, setPending] = useState<CropLayer | null>(null);
  const [cropPanel, setCropPanel] = useState<CropPanel>("closed");
  const [editCropId, setEditCropId] = useState("");
  const [history, setHistory] = useState<(Saved & { saved_at: string; is_archived?: boolean })[]>([]);
  const [help, setHelp] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
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
    setDirty(false); setEntryDirty(false); setUndo([]); setSelected(""); setHidden([]);
    setHistory([]); setMode("select"); setPending(null); setChooser([]);
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

  function focusGrid() {
    requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      gridRef.current?.focus({ preventScroll: true });
    });
  }
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
    setEditCropId(cropId); setCropPanel(panel); setMode("select"); setPending(null); setChooser([]);
    requestAnimationFrame(() => {
      entryRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      entryRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>("input,select")?.focus({ preventScroll: true });
    });
  }
  function cropSaved(crop: GrowCrop, size?: CropSize) {
    onCropSaved(crop); setEntryDirty(false); setCropPanel("closed");
    if (size) {
      setSelected("");
      setPending({ plotId: crop.id, x: 0, y: 0, ...size }); setMode("place");
      setStatus(`${crop.crop} details saved. Choose its top-left square on ${plotName}, then save the plot.`);
      focusGrid();
    } else setStatus(`${crop.crop} details saved. Its position is unchanged.`);
  }
  function chooseCrop(cropId: string) {
    if (!closeEntry()) return;
    setSelected(cropId); setMode("select"); setPending(null); setChooser([]);
    setHidden(values => values.filter(value => value !== cropId));
  }
  function place(layer: CropLayer) {
    if (!fits(layout, layer)) {
      setStatus("That crop does not fit there. Choose a position inside the plot, or change its size."); return;
    }
    const collision = overlaps(layout, layer);
    if (collision.length && !window.confirm(`This overlaps ${collision.map(c => cropLabel(c.plotId)).join(", ")}. Keep this intentional overlap? Dates and crop compatibility are not evaluated.`)) return;
    // Replace in place so layer numbers remain stable when crops move.
    const exists = layout.layers.some(c => c.plotId === layer.plotId);
    changeLayout({ ...layout, layers: exists ? layout.layers.map(c => c.plotId === layer.plotId ? layer : c) : [...layout.layers, layer] });
    setSelected(layer.plotId); setMode("select"); setPending(null); setChooser([]);
    setHidden(values => values.filter(value => value !== layer.plotId));
    setStatus(`${cropLabel(layer.plotId)} is on ${plotName}. Save plot changes to keep this position.`);
  }
  function tap(cell: number) {
    const here = layout.layers.filter(layer => footprint(layer).includes(cell));
    if (mode === "shape") {
      if (layout.cells.includes(cell) && here.length) { setStatus("Move the crop off this square before removing the square."); return; }
      if (layout.cells.length === 1 && layout.cells.includes(cell)) { setStatus("Keep at least one square in your plot."); return; }
      changeLayout({ ...layout, cells: layout.cells.includes(cell) ? layout.cells.filter(c => c !== cell) : [...layout.cells, cell] }); return;
    }
    const moving = mode === "place" ? pending : mode === "move" ? active : null;
    if (moving) { place({ ...moving, x: cell % GRID, y: Math.floor(cell / GRID) }); return; }
    const visible = here.filter(c => !hidden.includes(c.plotId));
    if (visible.length > 1) setChooser(visible.map(c => c.plotId));
    else if (visible.length === 1) chooseCrop(visible[0].plotId);
    else setChooser([]);
  }
  async function save() {
    if (busy || !draft.name.trim()) return;
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

  // Setup can expose extra cells; normal crop work focuses on the actual plot.
  const columns = Math.min(GRID, Math.max(2, ...layout.cells.map(c => c % GRID + (mode === "shape" ? 2 : 1))));
  const rows = Math.min(GRID, Math.max(2, ...layout.cells.map(c => Math.floor(c / GRID) + (mode === "shape" ? 2 : 1))));
  const plotWidth = Math.max(...layout.cells.map(c => c % GRID + 1));
  const plotLength = Math.max(...layout.cells.map(c => Math.floor(c / GRID) + 1));
  const isDraft = !saved.some(row => row.id === id);
  const unplaced = crops.filter(crop => !layout.layers.some(layer => layer.plotId === crop.id));
  const editingCrop = crops.find(crop => crop.id === editCropId);
  const cropInteraction = mode === "place" || mode === "move";

  return <section className="panel grow-planner" aria-label="Plot planner">
    <div className="planner-heading">
      <div><span className="tag">Your private growing space</span><h2>Your plots & crops</h2>
        <p>A plot is the space. Crops are what you grow inside it.</p></div>
      <button className="quiet" onClick={() => setHelp(value => !value)} aria-expanded={help}>How this works</button>
    </div>
    {help && <aside className="planner-help">
      <ol><li><strong>Name your plot.</strong> Choose its size and shape.</li>
        <li><strong>Add a crop here.</strong> Enter dates and size, then tap its position on the plot.</li>
        <li><strong>Save your plot.</strong> Select any crop to move it, edit its details, or record a harvest.</li></ol>
      <p>Crops may overlap. Tap a shared square to choose by name. Your plot is a planning sketch, not a surveyed boundary or spacing recommendation.</p>
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
        <div><h3>{plotName}</h3><p>{layout.cells.length} square {layout.unit === "ft" ? "feet" : "meters"} · {layout.layers.length} crops on this plot</p></div>
        <span className="planner-save-state">{dirty || !revision ? "Not saved" : "Saved"}</span>
      </div>
      <div className="planner-step-heading">
        <span className="planner-step">1</span><h3>Plot size & shape</h3>
        <button className="quiet" aria-expanded={setupOpen} onClick={() => setSetupOpen(value => !value)}>{setupOpen ? "Hide plot settings" : "Edit plot settings"}</button>
      </div>
      {setupOpen && <div className="planner-settings">
        <div className="planner-form-grid">
          <label>Plot name<input value={draft.name} maxLength={120} placeholder="For example, North bed" onChange={event => change({ ...draft, name: event.target.value })} /></label>
          <label>Measure in<select value={layout.unit} disabled={revision > 0 || layout.layers.length > 0} onChange={event => changeLayout({ ...layout, unit: event.target.value as "ft" | "m" })}>
            <option value="ft">Feet · each square is 1 × 1 ft</option><option value="m">Meters · each square is 1 × 1 m</option>
          </select></label>
        </div>
        <form key={`rectangle-${id}-${plotWidth}-${plotLength}`} onSubmit={event => {
          event.preventDefault(); const fields = new FormData(event.currentTarget);
          const next = { ...layout, cells: rectangle(Number(fields.get("width")), Number(fields.get("height"))) };
          if (!layout.layers.every(layer => fits(next, layer))) { setStatus("This size would cut off a crop. Move or resize that crop first."); return; }
          changeLayout(next); setStatus("Plot size updated. Continue to crops, then save your plot.");
        }}>
          <div className="planner-form-grid">
            <label>Plot width ({layout.unit})<input name="width" type="number" min="1" max="12" defaultValue={plotWidth} required /></label>
            <label>Plot length ({layout.unit})<input name="height" type="number" min="1" max="12" defaultValue={plotLength} required /></label>
          </div>
          <div className="planner-actions"><button className="quiet">Update rectangular outline</button>
            <button type="button" className="quiet" onClick={() => { if (!closeEntry()) return; setMode("shape"); setPending(null); focusGrid(); }}>Add or remove individual squares</button></div>
          <p className="planner-caption">Changing the rectangle replaces its outline. Saved plots keep their original measurement unit.</p>
        </form>
        <button className="primary" disabled={!draft.name.trim()} onClick={() => { setSetupOpen(false); setStatus("Your plot is named. Add your first crop or use an existing crop record."); }}>Continue to crops</button>
      </div>}

      <div className="planner-crop-workspace">
        <div className="planner-step-heading"><span className="planner-step">2</span><div><h3>Crops in {plotName}</h3><p>Add crops and arrange them on this same plot.</p></div></div>
        <div className="planner-actions">
          <button className="primary" disabled={!draft.name.trim() || layout.layers.length >= 60 || !!pending} onClick={() => openEntry("new")}>+ Add a crop</button>
          <button className="quiet" disabled={!draft.name.trim() || !unplaced.length || layout.layers.length >= 60 || !!pending} onClick={() => openEntry("existing")}>Use a saved crop</button>
        </div>
        {!draft.name.trim() && <p>Name the plot above to start adding crops.</p>}
        <div ref={entryRef} className="planner-entry">
          {(cropPanel === "new" || (cropPanel === "edit" && editingCrop)) && <GrowCropForm
            key={`${cropPanel}-${editCropId}`} db={db} farmId={farmId}
            crop={cropPanel === "edit" ? editingCrop : undefined} plotName={plotName}
            unit={layout.unit} colorIndex={layout.layers.length}
            onDirty={() => setEntryDirty(true)} onSaved={cropSaved} onCancel={() => { closeEntry(); }}
          />}
          {cropPanel === "existing" && <form className="planner-crop-form" onChange={() => setEntryDirty(true)} onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget);
            setSelected("");
            setPending({ plotId: String(fields.get("crop")), x: 0, y: 0, width: Number(fields.get("width")), height: Number(fields.get("height")), color: String(fields.get("color")) });
            setCropPanel("closed"); setEntryDirty(false); setMode("place");
            setStatus(`Choose this crop’s top-left square in ${plotName}.`); focusGrid();
          }}>
            <h3>Place an existing crop in {plotName}</h3><p>These crop records are saved, but are not on this plot yet. This does not create a copy of the crop.</p>
            <label>Saved crop<select aria-label="Saved crop" name="crop" required defaultValue=""><option value="" disabled>Choose a crop</option>{unplaced.map(crop => <option key={crop.id} value={crop.id}>{cropLabel(crop.id)} · {crop.season}</option>)}</select></label>
            <div className="planner-form-grid">
              <label>Crop width ({layout.unit})<input name="width" type="number" min="1" max="12" defaultValue="1" required /></label>
              <label>Crop length ({layout.unit})<input name="height" type="number" min="1" max="12" defaultValue="1" required /></label>
              <label>Crop color<input name="color" type="color" defaultValue={colors[layout.layers.length % colors.length]} /></label>
            </div>
            <div className="planner-actions"><button className="primary">Choose position on plot</button><button type="button" className="quiet" onClick={() => { closeEntry(); }}>Cancel</button></div>
          </form>}
        </div>

        <div className={`planner-mode ${mode !== "select" ? "is-editing" : ""}`}>
          <div><strong>{mode === "shape" ? "Editing the plot outline" : cropInteraction ? `${mode === "move" ? "Moving" : "Placing"} ${cropLabel((pending ?? active)!.plotId)}` : "Your plot layout"}</strong>
            <p>{mode === "shape" ? "Tap an empty square to add it. Tap an unused plot square to remove it." : cropInteraction ? "Tap the top-left square where this crop should start." : "Tap a crop on the grid or select its name in the list. Numbers connect the two."}</p></div>
          {mode !== "select" && <button className="quiet" onClick={() => {
            setMode("select"); setPending(null);
            setStatus(mode === "place" ? "Placement canceled. The saved crop is available under Use a saved crop." : "Finished arranging. Save your plot to keep changes.");
          }}>{mode === "shape" ? "Done editing outline" : "Cancel placement"}</button>}
        </div>
        <div className="planner-columns">
          <div className="planner-canvas">
            <div ref={gridRef} className="planner-scroll" tabIndex={0} aria-label={`Layout of ${plotName}`}>
              <div className="planner-grid" style={{ gridTemplateColumns: `repeat(${columns}, 48px)` }}>
                {Array.from({ length: rows * columns }, (_, index) => {
                  const cell = Math.floor(index / columns) * GRID + index % columns;
                  const layers = layout.layers.filter(layer => footprint(layer).includes(cell) && !hidden.includes(layer.plotId));
                  const chosen = layers.find(layer => layer.plotId === selected) ?? layers.at(-1);
                  return <button type="button" key={cell}
                    className={`planner-cell ${layout.cells.includes(cell) ? "inside" : ""} ${layers.some(layer => layer.plotId === selected) ? "selected" : ""}`}
                    style={chosen ? { backgroundColor: chosen.color + "55", borderColor: chosen.color } : undefined}
                    aria-label={`Column ${cell % GRID + 1}, row ${Math.floor(cell / GRID) + 1}: ${layers.length ? layers.map(layer => cropLabel(layer.plotId)).join("; ") : layout.cells.includes(cell) ? "empty plot square" : "outside plot"}`}
                    onClick={() => tap(cell)}>
                    {chosen ? layers.map(layer => layout.layers.findIndex(c => c.plotId === layer.plotId) + 1).join("/") : layout.cells.includes(cell) ? "·" : "+"}
                  </button>;
                })}
              </div>
            </div>
            <p className="planner-caption">Each square = 1 × 1 {layout.unit === "ft" ? "foot" : "meter"}. Swipe across larger plots. All planting dates are shown together.</p>
            {chooser.length > 1 && <div className="planner-overlap" role="group" aria-label="Overlapping crops">
              <strong>Which crop do you want to work with?</strong>
              {chooser.map(cropId => <button className="quiet" key={cropId} onClick={() => chooseCrop(cropId)}>{cropLabel(cropId)}</button>)}
            </div>}
          </div>
          <div className="planner-layers">
            <h4>Crops on this plot <span>({layout.layers.length})</span></h4>
            {!layout.layers.length && <div className="planner-empty"><p>Your plot is ready for crops.</p><p>Use <strong>Add a crop</strong> above. The crop will appear here and on the grid once you place it.</p></div>}
            <div className="planner-layer-list">
              {layout.layers.map((layer, index) => <button className={`planner-layer ${selected === layer.plotId ? "is-selected" : ""}`}
                key={layer.plotId} aria-pressed={selected === layer.plotId} onClick={() => chooseCrop(layer.plotId)}>
                <span className="planner-layer-number" style={{ borderColor: layer.color }}>{index + 1}</span>
                <span><strong>{crops.find(crop => crop.id === layer.plotId)?.crop ?? "Crop"}</strong>
                  <small>{crops.find(crop => crop.id === layer.plotId)?.name}</small>
                  <small>{layer.width} × {layer.height} {layout.unit}{hidden.includes(layer.plotId) ? " · hidden on grid" : ""}</small></span>
                <span className="planner-layer-action">{selected === layer.plotId ? "Selected" : "Select"}</span>
              </button>)}
            </div>
          </div>
        </div>
        {active && <section className="planner-selected" aria-label="Selected crop">
          <div className="planner-heading"><div><span className="planner-caption">Working with crop {layout.layers.findIndex(layer => layer.plotId === active.plotId) + 1} in {plotName}</span>
            <h3>{activeCrop?.crop ?? "Selected crop"}</h3><p>Plant: {activeCrop?.planted_on ?? "Not set"} · Expected harvest: {activeCrop?.planned_harvest_on ?? "Not set"}</p></div>
            <button className="quiet" onClick={() => { setSelected(""); setMode("select"); }}>Close crop controls</button>
          </div>
          <div className="planner-actions">
            <button className="primary" onClick={() => { if (!closeEntry()) return; setMode("move"); setPending(null); focusGrid(); }}>Move this crop</button>
            <button className="quiet" onClick={() => openEntry("edit", active.plotId)}>Edit crop details</button>
            <button className="quiet" onClick={() => onHarvest(active.plotId)}>Record harvest for this crop</button>
          </div>
          <details className="planner-more"><summary>Resize, color and other crop controls</summary>
            <form key={`${active.plotId}-${active.width}-${active.height}`} onSubmit={event => {
              event.preventDefault(); const fields = new FormData(event.currentTarget);
              place({ ...active, width: Number(fields.get("width")), height: Number(fields.get("height")) });
            }}>
              <div className="planner-form-grid">
                <label>Selected crop width ({layout.unit})<input name="width" type="number" min="1" max="12" defaultValue={active.width} required /></label>
                <label>Selected crop length ({layout.unit})<input name="height" type="number" min="1" max="12" defaultValue={active.height} required /></label>
              </div><button className="quiet">Update crop size</button>
            </form>
            <label>Selected crop color<input type="color" value={active.color} onChange={event => changeLayout({ ...layout, layers: layout.layers.map(layer => layer.plotId === active.plotId ? { ...layer, color: event.target.value } : layer) })} /></label>
            <div className="planner-actions" aria-label="Move one square">
              {([[-1, 0, "Left"], [0, -1, "Up"], [0, 1, "Down"], [1, 0, "Right"]] as const).map(([dx, dy, name]) => <button className="quiet" key={name} onClick={() => place({ ...active, x: active.x + dx, y: active.y + dy })}>{name} one square</button>)}
            </div>
            <div className="planner-actions">
              <button className="quiet" onClick={() => setHidden(values => values.includes(active.plotId) ? values.filter(value => value !== active.plotId) : [...values, active.plotId])}>{hidden.includes(active.plotId) ? "Show" : "Hide"} this crop on grid</button>
              <button className="quiet" onClick={() => { changeLayout({ ...layout, layers: layout.layers.filter(layer => layer.plotId !== active.plotId) }); setSelected(""); setMode("select"); }}>Remove crop from this plot</button>
            </div><p className="planner-caption">Removing a crop from the layout keeps its saved details and harvest records.</p>
          </details>
        </section>}
      </div>
      <div className="planner-savebar">
        <div><strong>{plotName}</strong><span>{pending ? "Choose a crop position first" : entryDirty ? "Finish or cancel crop details first" : dirty || !revision ? "Plot changes are not saved" : "All plot changes saved"}</span></div>
        <div className="planner-actions">
          <button className="quiet" disabled={!undo.length || !!pending || entryDirty} onClick={() => {
            setDraft(undo.at(-1)!); setUndo(items => items.slice(0, -1)); setDirty(true); setSelected(""); setMode("select"); setChooser([]);
          }}>Undo plot change</button>
          <button className="primary" disabled={!draft.name.trim() || !!pending || entryDirty || (!dirty && revision > 0)} onClick={() => void save()}>{busy ? "Saving…" : revision ? "Save plot changes" : "Save this plot"}</button>
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
            change({ name: row.name, document: row.document }); setEntryDirty(false); setCropPanel("closed"); setSelected(""); setMode("select"); setPending(null);
          }}>Use this version as a draft</button>
        </details>)}
      </details>
    </fieldset>}
  </section>;
}
