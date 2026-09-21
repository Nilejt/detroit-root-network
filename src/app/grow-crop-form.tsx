"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { colors } from "@/lib/grow-layout";

export type GrowCrop = {
  id: string; name: string; crop: string; season: number;
  planted_on: string | null; planned_harvest_on: string | null;
  soil_type: string; notes: string;
};
export type CropSize = { width: number; height: number; color: string };

/** Crop details retain the existing grow_plots identity and harvest relationships.
 * A stable insert ID lets an interrupted response be retried without a duplicate.
 * Placement is a separate versioned layout save; the UI names both save boundaries.
 */
export default function GrowCropForm({ db, farmId, crop, plotName, colorIndex, onDirty, onSaved, onCancel }: {
  db: SupabaseClient; farmId: string; crop?: GrowCrop; plotName: string;
  colorIndex: number;
  onDirty: () => void;
  onSaved: (crop: GrowCrop, size?: CropSize) => void;
  onCancel: () => void;
}) {
  const [insertId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [plantDate, setPlantDate] = useState(crop?.planted_on ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const text = (key: string) => String(fields.get(key) ?? "").trim();
    const row = {
      name: text("name") || `${text("crop")} · ${text("season")}`.slice(0, 120),
      crop: text("crop"), season: Number(fields.get("season")),
      planted_on: text("planted_on") || null,
      planned_harvest_on: text("planned_harvest_on") || null,
      soil_type: text("soil_type"), notes: text("notes"),
    };
    setBusy(true); setMessage("");
    try {
      const columns = "id,name,crop,season,planted_on,planned_harvest_on,soil_type,notes";
      let result = crop
        ? await db.from("grow_plots").update(row).eq("id", crop.id).eq("farm_id", farmId).select(columns).single()
        : await db.from("grow_plots").insert({ ...row, id: insertId, farm_id: farmId }).select(columns).single();
      // Recover only our own attempted insertion through ordinary RLS, applying
      // the current draft if the farmer changed fields before retrying.
      if (!crop && result.error?.code === "23505") {
        result = await db.from("grow_plots").update(row).eq("id", insertId).eq("farm_id", farmId).select(columns).single();
      }
      if (result.error || !result.data) {
        setMessage("Could not save crop details. Check the dates and your connection. Your entries are still here.");
        return;
      }
      onSaved(result.data as GrowCrop, crop ? undefined : {
        width: 1, height: 1, color: text("color") || colors[colorIndex % colors.length]!,
      });
    } catch {
      setMessage("The save response was interrupted. Retry here to recover this crop without creating another copy.");
    } finally { setBusy(false); }
  }

  return <form className="planner-crop-form" onSubmit={event => void submit(event)} onChange={onDirty}>
    <fieldset disabled={busy}>
      <h3>{crop ? `Edit ${crop.crop}` : `Add a crop to ${plotName}`}</h3>
      <p>{crop ? "These dates and notes belong to this crop, wherever it appears in a layout." : "Enter what you’re growing. Visual plot planning is paused while it is redesigned, so this crop is simply added to the plot."}</p>
      <div className="planner-form-grid">
        <label>Crop type<input name="crop" defaultValue={crop?.crop} placeholder="For example, carrots" maxLength={120} required /></label>
        <label>Season year<input name="season" type="number" min="2000" max="2200" defaultValue={crop?.season ?? new Date().getFullYear()} required /></label>
        <label>Planting date<input name="planted_on" type="date" value={plantDate} onChange={e => setPlantDate(e.target.value)} /></label>
        <label>Expected harvest date<input name="planned_harvest_on" type="date" min={plantDate || undefined} defaultValue={crop?.planned_harvest_on ?? ""} /></label>
      </div>
      {!crop && <div className="planner-field-group">
        <label>Crop color<input name="color" type="color" defaultValue={colors[colorIndex % colors.length]} /></label>
      </div>}
      <details className="planner-more">
        <summary>Optional label, soil and notes</summary>
        <label>Short label<input name="name" defaultValue={crop?.name} placeholder="For example, early carrots" maxLength={120} /></label>
        <label>Soil type<input name="soil_type" defaultValue={crop?.soil_type} maxLength={200} /></label>
        <label>Growing notes<textarea name="notes" defaultValue={crop?.notes} maxLength={2000} /></label>
      </details>
      <p role="status">{message}</p>
      {!crop && <p className="planner-caption">This saves the crop details first. Save the plot to keep it on this plot’s crop list.</p>}
      <div className="planner-actions">
        <button className="primary">{busy ? "Saving…" : crop ? "Save crop details" : "Save crop & add to plot"}</button>
        <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
  </form>;
}
