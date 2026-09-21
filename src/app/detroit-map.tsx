"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression, Map } from "leaflet";

type MapFarm = {
  id: string;
  slug: string;
  name: string;
  test_tier: "T1" | "T2" | null;
  selling_locations: { address: string; city: string; state: string }[];
};
const coordinates: Record<string, [number, number]> = {
  "qs-stall": [42.3487, -83.0406],
  "oakland-avenue-farm": [42.397, -83.071],
  "keep-growing-detroit": [42.348, -83.0248],
  "north-end-test-grower": [42.3935, -83.0718],
  "southwest-harvest-test": [42.3218, -83.0842],
  "d-town-test": [42.3896, -83.254],
  "georgia-street-test": [42.3955, -82.9986],
  "midtown-market-test": [42.3519, -83.0664],
  "eastside-roots-test": [42.392, -82.951],
  "westside-produce-test": [42.4018, -83.2225],
  "brightmoor-growing-test": [42.409, -83.224],
  "corktown-harvest-test": [42.331, -83.075],
  "jefferson-chalmers-test": [42.366, -82.943],
  "northwest-greens-test": [42.424, -83.182],
  "riverbend-roots-test": [42.349, -82.974],
};

export default function DetroitMap<T extends MapFarm>({
  farms,
  numbers,
  filtered = false,
  onSelect,
}: {
  farms: T[];
  filtered?: boolean;
  // Shared numbering from the results list, so markers match the cards.
  numbers?: Record<string, number>;
  onSelect: (farm: T) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    let map: Map | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !host.current) return;
      // This view is frequently unmounted when switching workspaces; avoid
      // Leaflet animation callbacks retaining a removed map pane.
      map = L.map(host.current, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(
        [42.36, -83.09],
        11,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const bounds: LatLngExpression[] = [];
      farms.forEach((farm, index) => {
        const point = coordinates[farm.slug];
        if (!point) return;
        bounds.push(point);
        const marker = L.marker(point, {
          icon: L.divIcon({
            className: "farm-marker-wrap",
            html: `<span class="farm-marker"><i>${numbers?.[farm.id] ?? index + 1}</i></span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
          }),
        }).addTo(map!);
        // Farm names are user content; Leaflet string tooltips interpret HTML.
        const tooltip = document.createElement("span");
        tooltip.textContent = farm.name;
        marker.bindTooltip(
          tooltip,
          { direction: "top", offset: [0, -30] },
        );
        marker.on("click", () => onSelect(farm));
      });
      if (bounds.length > 1)
        map.fitBounds(L.latLngBounds(bounds), {
          padding: [28, 28],
          maxZoom: 12,
          animate: false,
        });
      resizeTimer = setTimeout(() => { if (!cancelled) map?.invalidateSize(); }, 0);
    });
    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [farms, numbers, onSelect]);
  return (
    <aside
      className="map-shell"
      aria-label={`Interactive Detroit map showing ${farms.length} ${filtered ? "matching " : ""}farm locations`}
    >
      <div className="mapkey">
        <b>{farms.length} {filtered ? "matching locations" : "locations shown"}</b>
        <span>Numbers match the cards · tap a marker for stall details</span>
      </div>
      <div ref={host} className="detroit-map" />
    </aside>
  );
}
