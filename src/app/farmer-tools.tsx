"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import GrowTools from "./grow-tools";

type Item = {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  price_cents: number | null;
  stock_status: string;
  expected_available_on?: string | null;
  publish_coming_soon?: boolean;
  show_expected_date?: boolean;
};
type Place = {
  id: string;
  location_name: string;
  address: string;
  city: string;
  state: string;
  selling_date?: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  is_self_service?: boolean;
};
type Help = {
  id: string;
  title: string;
  description: string | null;
  opportunity_date: string;
  volunteers_needed: number | null;
  is_open: boolean;
};
type Farm = {
  id: string;
  created_by?: string | null;
  name: string;
  blurb: string | null;
  region?: string | null;
  base_address?: string | null;
  test_tier: "T1" | "T2" | null;
  selling_locations: Place[];
  inventory_items: Item[];
  volunteer_opportunities: Help[];
};

const regions = [
  "Downtown",
  "Midtown",
  "North End/New Center",
  "West",
  "Southwest",
  "East",
];
const produce = [
  "Apples",
  "Arugula",
  "Asparagus",
  "Basil",
  "Beets",
  "Blackberries",
  "Blueberries",
  "Bok choy",
  "Broccoli",
  "Brussels sprouts",
  "Cabbage",
  "Cantaloupe",
  "Carrots",
  "Cauliflower",
  "Celery",
  "Chard",
  "Cherries",
  "Cherry tomatoes",
  "Cilantro",
  "Collard greens",
  "Corn",
  "Cucumbers",
  "Dill",
  "Eggplant",
  "Garlic",
  "Grapes",
  "Green beans",
  "Green onions",
  "Herbs",
  "Honey",
  "Jalapeños",
  "Kale",
  "Leeks",
  "Lettuce",
  "Mint",
  "Mushrooms",
  "Mustard greens",
  "Okra",
  "Onions",
  "Oregano",
  "Parsley",
  "Peaches",
  "Pears",
  "Peas",
  "Peppers",
  "Plums",
  "Potatoes",
  "Pumpkins",
  "Radishes",
  "Raspberries",
  "Rosemary",
  "Sage",
  "Salad mix",
  "Snap peas",
  "Spinach",
  "Strawberries",
  "Summer squash",
  "Sweet peppers",
  "Sweet potatoes",
  "Thyme",
  "Tomatillos",
  "Tomatoes",
  "Turnips",
  "Watermelon",
  "Winter squash",
  "Zucchini",
];
const quantities = [
  0.5,
  ...Array.from({ length: 100 }, (_, index) => index + 1),
];
const units = [
  "each",
  "bunch",
  "bundle",
  "pound",
  "pint",
  "quart",
  "bag",
  "basket",
  "dozen",
  "box",
];

export default function FarmerTools({
  db,
  user,
  farms,
  reload,
  setNotice,
  plannerDirty,
  onPlannerDirty,
}: {
  db: SupabaseClient | null;
  user: User;
  farms: Farm[];
  reload: () => Promise<void>;
  setNotice: (x: string) => void;
  plannerDirty: boolean;
  onPlannerDirty: (dirty: boolean) => void;
}) {
  const [role, setRole] = useState("farmer"),
    [allowed, setAllowed] = useState<string[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [editing, setEditing] = useState<Item | null>(null);
  const [mode, setMode] = useState<"sell" | "grow">("sell");
  useEffect(() => {
    if (!db) return;
    (async () => {
      const { data: p } = await db
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const next = p?.role ?? "farmer";
      setRole(next);
      const editable = farms.filter((farm) => farm.test_tier === "T1");
      if (["owner", "admin", "director_q"].includes(next))
        setAllowed(editable.map((farm) => farm.id));
      else {
        const { data: m } = await db
          .from("farm_members")
          .select("farm_id")
          .eq("user_id", user.id);
        const memberships = new Set((m ?? []).map((x) => x.farm_id));
        setAllowed(
          editable
            .filter((farm) => memberships.has(farm.id))
            .map((farm) => farm.id),
        );
      }
    })();
  }, [db, user.id, farms]);
  const choices = useMemo(
    () => farms.filter((f) => allowed.includes(f.id)),
    [farms, allowed],
  );
  const activeId = choices.some((f) => f.id === selectedId) ? selectedId : choices[0]?.id ?? "";
  const farm = choices.find((f) => f.id === activeId),
    location = farm?.selling_locations[0];
  async function saveFarm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !farm) return;
    const f = new FormData(e.currentTarget);
    const { error } = await db
      .from("farms")
      .update({
        name: f.get("name"),
        blurb: f.get("blurb"),
        region: f.get("region"),
        base_address: f.get("base_address"),
      })
      .eq("id", farm.id);
    setNotice(error?.message ?? "Farm profile updated.");
    if (!error) reload();
  }
  async function saveLocation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !farm) return;
    const f = new FormData(e.currentTarget),
      row = {
        farm_id: farm.id,
        location_name: f.get("location_name"),
        address: f.get("address"),
        city: "Detroit",
        state: "MI",
        selling_date: f.get("selling_date") || null,
        opens_at: f.get("opens_at") || null,
        closes_at: f.get("closes_at") || null,
        is_active: true,
        is_self_service: f.get("is_self_service") === "on",
        is_visible: farm.test_tier === "T1",
      };
    const q = location
      ? db.from("selling_locations").update(row).eq("id", location.id)
      : db.from("selling_locations").insert(row);
    const { error } = await q;
    setNotice(error?.message ?? "Selling location updated.");
    if (!error) reload();
  }
  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !farm) return;
    const f = new FormData(e.currentTarget),
      quantity = Number(f.get("quantity")),
      price = Math.round(Number(f.get("price")) * 100);
    const status = String(f.get("status"));
    const expectedAvailableOn = String(f.get("expected_available_on") ?? "");
    if (status === "coming_soon" && !expectedAvailableOn) {
      setNotice("Choose an expected availability date for coming-soon produce.");
      return;
    }
    const { error } = await db.from("inventory_items").insert({
      farm_id: farm.id,
      item_name: f.get("item_name"),
      quantity,
      unit: f.get("unit"),
      price_cents: price,
      stock_status: status === "coming_soon" ? "coming_soon" : quantity === 0 ? "sold_out" : "available",
      expected_available_on: expectedAvailableOn || null,
      publish_coming_soon: f.get("publish_coming_soon") === "on",
      show_expected_date: f.get("show_expected_date") === "on",
      is_visible: farm.test_tier === "T1",
    });
    setNotice(error?.message ?? "Produce added.");
    if (!error) {
      e.currentTarget.reset();
      await reload();
    }
  }
  async function saveItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !editing || !farm?.inventory_items.some((item) => item.id === editing.id)) return;
    const f = new FormData(e.currentTarget),
      quantity = Number(f.get("quantity"));
    const status = String(f.get("status"));
    const expectedAvailableOn = String(f.get("expected_available_on") ?? "");
    if (status === "coming_soon" && !expectedAvailableOn) {
      setNotice("Choose an expected availability date for coming-soon produce.");
      return;
    }
    const { error } = await db
      .from("inventory_items")
      .update({
        quantity,
        unit: f.get("unit"),
        price_cents: Math.round(Number(f.get("price")) * 100),
        stock_status: status === "coming_soon" ? "coming_soon" : quantity === 0 ? "sold_out" : status,
        expected_available_on: expectedAvailableOn || null,
        publish_coming_soon: f.get("publish_coming_soon") === "on",
        show_expected_date: f.get("show_expected_date") === "on",
      })
      .eq("id", editing.id);
    setNotice(error?.message ?? "Produce updated.");
    if (!error) {
      setEditing(null);
      reload();
    }
  }
  async function soldOut(item: Item) {
    if (!db) return;
    await db
      .from("inventory_items")
      .update({ quantity: 0, stock_status: "sold_out" })
      .eq("id", item.id);
    setNotice(`${item.item_name} marked sold out.`);
    reload();
  }
  async function removeItem(item: Item) {
    if (!db || !confirm(`Are you sure you want to delete ${item.item_name}?`))
      return;
    await db.from("inventory_items").delete().eq("id", item.id);
    setNotice(`${item.item_name} deleted.`);
    reload();
  }
  async function addHelp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !farm) return;
    const f = new FormData(e.currentTarget);
    const { error } = await db.from("volunteer_opportunities").insert({
      farm_id: farm.id,
      title: f.get("title"),
      description: f.get("description"),
      opportunity_date: f.get("date"),
      starts_at: f.get("starts_at") || null,
      ends_at: f.get("ends_at") || null,
      volunteers_needed: Number(f.get("needed")),
      is_open: true,
      is_visible: farm.test_tier === "T1",
    });
    setNotice(error?.message ?? "Volunteer opportunity posted.");
    if (!error) {
      e.currentTarget.reset();
      reload();
    }
  }
  async function removeHelp(id: string) {
    if (!db || !confirm("Delete this volunteer opportunity?")) return;
    await db.from("volunteer_opportunities").delete().eq("id", id);
    setNotice("Volunteer opportunity deleted.");
    reload();
  }
  async function addEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db || !farm) return;
    const fields = new FormData(e.currentTarget);
    const { error } = await db.from("community_events").insert({
      farm_id: farm.id,
      publisher_type: "farm",
      organization_name: farm.name,
      event_type: fields.get("event_type"),
      title: fields.get("event_title"),
      description: fields.get("event_description"),
      starts_at: `${fields.get("event_date")}T${fields.get("event_time")}:00`,
      address: fields.get("event_address"),
      is_free: fields.get("event_free") === "on",
      is_published: farm.test_tier === "T1",
    });
    setNotice(error?.message ?? "Community Board event posted.");
    if (!error) e.currentTarget.reset();
  }
  if (!farm)
    return (
      <div className="panel">
        <h2>No assigned farm yet</h2>
        <p>
          Your account is secure, but it has not been connected to a farm. An
          owner can assign access, or you can use Add New Vendor after the next
          onboarding step.
        </p>
      </div>
    );
  return (
    <div className="farmer-wrap" key={activeId}>
      <div className="workspacebar">
        <div>
          <span className="tag">{role.replaceAll("_", " ")}</span>
          <b>{user.email}</b>
        </div>
        {["owner", "admin", "director_q"].includes(role) ? (
          <label>
            Editable T1 farm
            <select
              value={activeId}
              onChange={(e) => {
                if (plannerDirty && !window.confirm("Discard unsaved Grow changes?")) return;
                onPlannerDirty(false);
                setSelectedId(e.target.value);
                setEditing(null);
              }}
            >
              {choices.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name} · T1
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <small>Farm I represent</small>
            <strong>{farm.name}</strong>
          </div>
        )}
        <button className="quiet" onClick={() => { if (plannerDirty && !window.confirm("Discard unsaved Grow changes?")) return; onPlannerDirty(false); void db?.auth.signOut(); }}>
          Sign out
        </button>
      </div>
      <div className="filters" aria-label="Farmer workspace">
        <button type="button" className={mode === "sell" ? "on" : ""} aria-pressed={mode === "sell"} onClick={() => { if (plannerDirty && !window.confirm("Discard unsaved Grow changes?")) return; onPlannerDirty(false); setMode("sell"); }}>Farmer Sell</button>
        <button type="button" className={mode === "grow" ? "on" : ""} aria-pressed={mode === "grow"} onClick={() => setMode("grow")}>Farmer Grow · Beta</button>
      </div>
      {mode === "grow" && <GrowTools key={farm.id} db={db} farmId={farm.id} onDirty={onPlannerDirty} />}
      <div className="farmer-wrap" hidden={mode !== "sell"}>
      <div className="opsgrid">
        <form className="panel form" onSubmit={saveFarm}>
          <h2>Farm profile</h2>
          <label>
            Farm name
            <input
              name="name"
              defaultValue={farm.name}
              required
              maxLength={120}
            />
          </label>
          <label>
            Card blurb
            <textarea
              name="blurb"
              defaultValue={farm.blurb ?? ""}
              maxLength={140}
            />
            <small>{farm.blurb?.length ?? 0}/140 currently</small>
          </label>
          <label>
            Region
            <select name="region" defaultValue={farm.region ?? ""}>
              <option value="">Choose region</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Base address
            <input name="base_address" defaultValue={farm.base_address ?? ""} />
          </label>
          <button className="primary">Save farm profile</button>
        </form>
        <form className="panel form" onSubmit={saveLocation}>
          <h2>Where we sell today</h2>
          <label>
            Market or pop-up name
            <input
              name="location_name"
              defaultValue={location?.location_name ?? ""}
              required
            />
          </label>
          <label>
            Street address
            <input
              name="address"
              defaultValue={location?.address ?? ""}
              required
            />
          </label>
          <label>
            Selling date
            <input
              type="date"
              name="selling_date"
              defaultValue={location?.selling_date ?? ""}
            />
          </label>
          <div className="fieldrow">
            <label>
              Opens
              <input
                type="time"
                name="opens_at"
                defaultValue={location?.opens_at?.slice(0, 5) ?? ""}
              />
            </label>
            <label>
              Closes
              <input
                type="time"
                name="closes_at"
                defaultValue={location?.closes_at?.slice(0, 5) ?? ""}
              />
            </label>
          </div>
          <label className="checkline"><input type="checkbox" name="is_self_service" defaultChecked={location?.is_self_service ?? false} />This location offers a self-service farm stand</label>
          <button className="primary">Update selling location</button>
        </form>
      </div>
      <section className="panel stock">
        <div className="row">
          <div>
            <h2>Available produce</h2>
            <p>One-tap updates keep customer information current.</p>
          </div>
          <span className="tag">{farm.test_tier}</span>
        </div>
        <div className="stocklist">
          {farm.inventory_items.map((i) => (
            <article key={i.id}>
              <div>
                <b>{i.item_name}</b>
                <small>
                  {i.quantity} {i.unit} ·{" "}
                  {i.price_cents == null
                    ? "No price"
                    : `$${(i.price_cents / 100).toFixed(2)}`}
                </small>
              </div>
              <div className="stockactions">
                <button className="sold" onClick={() => soldOut(i)}>
                  Sold Out
                </button>
                <button
                  className="circle edit"
                  onClick={() => setEditing(i)}
                  aria-label={`Edit ${i.item_name}`}
                >
                  ✎
                </button>
                <button
                  className="circle delete"
                  onClick={() => removeItem(i)}
                  aria-label={`Delete ${i.item_name}`}
                >
                  ⌫
                </button>
              </div>
            </article>
          ))}
        </div>
        {editing && farm.inventory_items.some((item) => item.id === editing.id) && (
          <form key={editing.id} className="inlineform" onSubmit={saveItem}>
            <b>Edit {editing.item_name}</b>
            <select
              name="quantity"
              defaultValue={editing.quantity}
              required
              aria-label="Quantity"
            >
              {quantities.map((quantity) => (
                <option key={quantity} value={quantity}>
                  {quantity}
                </option>
              ))}
            </select>
            <select
              name="unit"
              defaultValue={editing.unit}
              required
              aria-label="Unit"
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="price"
              min="0"
              step="0.01"
              defaultValue={(editing.price_cents ?? 0) / 100}
              required
              aria-label="Price"
            />
            <select
              name="status"
              defaultValue={editing.stock_status}
              aria-label="Stock status"
            >
              <option value="available">Available</option>
              <option value="low_stock">Low stock</option>
              <option value="sold_out">Sold out</option>
              <option value="coming_soon">Coming soon</option>
            </select>
            <input type="date" name="expected_available_on" defaultValue={editing.expected_available_on ?? ""} aria-label="Expected availability date" />
            <label className="checkline"><input type="checkbox" name="publish_coming_soon" defaultChecked={editing.publish_coming_soon ?? false} />Publish upcoming item</label>
            <label className="checkline"><input type="checkbox" name="show_expected_date" defaultChecked={editing.show_expected_date ?? false} />Show date</label>
            <button className="primary">Save</button>
            <button
              type="button"
              className="quiet"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </form>
        )}
        <form className="inlineform" onSubmit={addItem}>
          <b>Add produce</b>
          <input
            name="item_name"
            list="produce-list"
            placeholder="Search produce"
            required
          />
          <datalist id="produce-list">
            {produce.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <select
            name="quantity"
            defaultValue=""
            required
            aria-label="Quantity"
          >
            <option value="" disabled>
              Quantity
            </option>
            {quantities.map((quantity) => (
              <option key={quantity} value={quantity}>
                {quantity}
              </option>
            ))}
          </select>
          <select name="unit" defaultValue="" required aria-label="Unit">
            <option value="" disabled>
              Unit
            </option>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="price"
            min="0"
            step="0.01"
            placeholder="Price"
            required
          />
          <select name="status" defaultValue="available" aria-label="Stock status"><option value="available">Available</option><option value="coming_soon">Coming soon</option></select>
          <input type="date" name="expected_available_on" aria-label="Expected availability date" />
          <label className="checkline"><input type="checkbox" name="publish_coming_soon" />Publish upcoming item</label>
          <label className="checkline"><input type="checkbox" name="show_expected_date" />Show date</label>
          <button className="primary form-submit">Add produce</button>
        </form>
      </section>
      <section className="panel stock volunteer-panel">
        <h2>Volunteer opportunities</h2>
        <div className="stocklist">
          {farm.volunteer_opportunities.map((v) => (
            <article key={v.id}>
              <div>
                <b>{v.title}</b>
                <small>
                  {v.opportunity_date} · {v.volunteers_needed ?? "More"} needed
                </small>
              </div>
              <button
                className="circle delete"
                onClick={() => removeHelp(v.id)}
                aria-label={`Delete ${v.title}`}
              >
                ⌫
              </button>
            </article>
          ))}
        </div>
        <form className="inlineform volunteerform" onSubmit={addHelp}>
          <label className="volunteer-field volunteer-title">
            <span>Opportunity title</span>
            <input name="title" placeholder="Saturday harvest help" required />
          </label>
          <label className="volunteer-field volunteer-date">
            <span>Date</span>
            <input type="date" name="date" required />
          </label>
          <label className="volunteer-field volunteer-start">
            <span>Starts</span>
            <input type="time" name="starts_at" />
          </label>
          <label className="volunteer-field volunteer-end">
            <span>Ends</span>
            <input type="time" name="ends_at" />
          </label>
          <label className="volunteer-field volunteer-needed">
            <span>People needed</span>
            <input
              type="number"
              name="needed"
              min="1"
              placeholder="4"
              required
            />
          </label>
          <label className="help-description">
            <span>Type of help needed</span>
            <textarea
              name="description"
              placeholder="Describe the work, what volunteers should bring, and any accessibility details."
              maxLength={500}
              rows={4}
            />
            <small>Up to 500 characters</small>
          </label>
          <button className="primary form-submit volunteer-submit">
            Post opportunity
          </button>
        </form>
      </section>
      <section className="panel stock community-publisher">
        <h2>Community Board event</h2>
        <p>Verified farms can publish public market dates, harvest days, workshops, tours, food pickups, and learning experiences.</p>
        <form className="event-form" onSubmit={addEvent}>
          <label>Event type<select name="event_type" required defaultValue=""><option value="" disabled>Choose type</option><option>Farmers market</option><option>Farm learning</option><option>Volunteer opportunity</option><option>Food pickup</option><option>Workshop</option></select></label>
          <label>Event title<input name="event_title" required maxLength={120} /></label>
          <label className="event-description">Description<textarea name="event_description" required maxLength={600} rows={4} /></label>
          <label>Date<input type="date" name="event_date" required /></label>
          <label>Start time<input type="time" name="event_time" required /></label>
          <label>Address<input name="event_address" required maxLength={200} /></label>
          <label className="checkline"><input type="checkbox" name="event_free" />Free event</label>
          <button className="primary form-submit">Publish event</button>
        </form>
      </section>
      </div>
    </div>
  );
}
