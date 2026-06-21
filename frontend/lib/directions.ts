// ─────────────────────────────────────────────────────────────────────────
// UrbanFlow AI — Mapbox Directions Integration
//
// Converts our hand-placed road "waypoint" coordinates into real
// road-following geometry via the Mapbox Directions API. The user never
// sees or enters coordinates — they only pick an Event Location, and this
// module resolves that location to start/end points internally, then asks
// Mapbox for the actual street-level route between them.
//
// IMPORTANT — Reliability for live demo:
// If the Directions API call fails (no token, rate limit, offline, CORS),
// we fall back to the original straight-line road geometry from engine.ts.
// This means a judge's wifi dropping out never breaks the demo — it just
// silently degrades to straight segments instead of crashing.
// ─────────────────────────────────────────────────────────────────────────

import { RoadGeometry } from "./engine";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox/driving";

// In-memory cache so repeated predicts for the same road don't re-fetch
const routeCache = new Map<string, [number, number][]>();

function cacheKey(coords: [number, number][]): string {
  return coords.map(c => c.join(",")).join("|");
}

/**
 * Fetch real road-following geometry for a sequence of waypoints.
 * Falls back to the original straight-line coords on any failure.
 */
export async function fetchRoadGeometry(
  waypoints: [number, number][]
): Promise<[number, number][]> {
  if (!MAPBOX_TOKEN || waypoints.length < 2) {
    return waypoints;
  }

  const key = cacheKey(waypoints);
  if (routeCache.has(key)) {
    return routeCache.get(key)!;
  }

  try {
    const coordsParam = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
    const url = `${DIRECTIONS_BASE}/${coordsParam}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Directions API ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;

    if (!route || route.length < 2) throw new Error("Empty route geometry");

    routeCache.set(key, route);
    return route;
  } catch (err) {
    // Silent fallback — straight-line geometry keeps the demo running
    console.warn("Directions API fallback for route:", err);
    routeCache.set(key, waypoints);
    return waypoints;
  }
}

/**
 * Resolve a full set of RoadGeometry entries to real road-following paths.
 * Runs requests in parallel, each with independent fallback.
 */
export async function resolveRoadsToRealGeometry(
  roads: RoadGeometry[]
): Promise<RoadGeometry[]> {
  if (!MAPBOX_TOKEN) return roads;

  const resolved = await Promise.all(
    roads.map(async (road) => {
      // Only call Directions for roads with at least 2 distinct points
      if (road.coords.length < 2) return road;
      const realCoords = await fetchRoadGeometry(road.coords);
      return { ...road, coords: realCoords };
    })
  );

  return resolved;
}

/**
 * Resolve a single road (used for emergency/VIP corridors which are
 * computed dynamically rather than coming from the static road list).
 */
export async function resolveSingleRoad(road: RoadGeometry): Promise<RoadGeometry> {
  if (!MAPBOX_TOKEN || road.coords.length < 2) return road;
  const realCoords = await fetchRoadGeometry(road.coords);
  return { ...road, coords: realCoords };
}

export function isDirectionsAvailable(): boolean {
  return !!MAPBOX_TOKEN;
}
