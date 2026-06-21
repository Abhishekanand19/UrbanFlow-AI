// ─────────────────────────────────────────────────────────────────────────
// UrbanFlow AI — Map Intelligence Layer
// Generates simulated-but-consistent data for the live map systems:
// road congestion, traffic flow, incidents, CCTV, confidence breakdown,
// flood zones, citizen advisory, and the data stream panel.
//
// Kept separate from engine.ts (core forecast engine) so existing logic
// is untouched. This file only ADDS map intelligence on top of a
// ForecastResult + EventConfig.
// ─────────────────────────────────────────────────────────────────────────

import { ForecastResult, EventConfig, RoadGeometry, LOCATION_CENTERS } from "./engine";

export type CongestionLevel = "free" | "moderate" | "heavy" | "severe";

export const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  free: "#22c55e",
  moderate: "#eab308",
  heavy: "#f97316",
  severe: "#ef4444",
};

export interface RoadSegment {
  id: string;
  name: string;
  coords: [number, number][];
  congestion: CongestionLevel;
  speedKmh: number; // affects flow particle speed
}

export type IncidentType = "accident" | "event" | "police" | "closure" | "ambulance" | "diversion";

export interface IncidentMarker {
  id: string;
  type: IncidentType;
  name: string;
  lat: number;
  lon: number;
  detail: string;
  timestamp: string;
}

export interface CCTVCamera {
  id: string;
  name: string;
  lat: number;
  lon: number;
  vehicleDensity: "Low" | "Medium" | "High";
  crowdDensity: "Low" | "Medium" | "High";
  status: "Congested" | "Flowing" | "Blocked";
}

export interface ConfidenceBreakdown {
  historicalData: number;
  weather: number;
  roadCapacity: number;
  crowdEstimate: number;
  eventSimilarity: number;
}

export interface FloodZone {
  id: string;
  coords: [number, number][]; // polygon ring
  severity: "moderate" | "high";
}

export interface ImpactZonePolygon {
  id: string;
  coords: [number, number][]; // polygon ring, organic/irregular shape
}

export interface CitizenAdvisoryEntry {
  avoid: string;
  alternative: string;
  etaIncreaseMin: number;
}

export interface DataStreamFeed {
  name: string;
  status: "live" | "degraded";
  detail: string;
}

export interface MapIntelligence {
  roadSegments: RoadSegment[];
  incidents: IncidentMarker[];
  cameras: CCTVCamera[];
  confidence: ConfidenceBreakdown;
  floodZones: FloodZone[];
  impactZonePolygon: ImpactZonePolygon;
  advisory: CitizenAdvisoryEntry[];
  dataStreams: DataStreamFeed[];
}

// ─── Deterministic pseudo-random (so re-renders don't flicker data) ────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ─── Road congestion derivation ─────────────────────────────────────────────
// Roads closer to the epicenter / earlier in the animation stage list get
// higher congestion. We derive a level + speed per road segment.

function deriveCongestion(roadIndex: number, totalRoads: number, animationStage: number, rain: boolean): { level: CongestionLevel; speed: number } {
  // Proximity factor: roads with lower index are "closer" to epicenter in our data model
  const proximity = 1 - roadIndex / Math.max(1, totalRoads);
  const stageFactor = animationStage / 4;
  let score = proximity * 0.6 + stageFactor * 0.4;
  if (rain) score = Math.min(1, score + 0.15);

  let level: CongestionLevel;
  let speed: number;
  if (score > 0.75) { level = "severe"; speed = 8; }
  else if (score > 0.5) { level = "heavy"; speed = 18; }
  else if (score > 0.25) { level = "moderate"; speed = 32; }
  else { level = "free"; speed = 48; }

  return { level, speed };
}

export function buildRoadSegments(
  allRoads: RoadGeometry[],
  animationStage: number,
  rain: boolean
): RoadSegment[] {
  return allRoads.map((road, i) => {
    const { level, speed } = deriveCongestion(i, allRoads.length, animationStage, rain);
    return {
      id: `road-${i}`,
      name: road.name,
      coords: road.coords,
      congestion: level,
      speedKmh: speed,
    };
  });
}

// ─── Incident markers (Fixed UX Issue - Removed duplicate Event pins) ──────

const INCIDENT_TEMPLATES: Record<string, { type: IncidentType; detail: string }[]> = {
  procession: [
    { type: "police", detail: "12 officers stationed for crowd control" },
    { type: "diversion", detail: "Active diversion — vehicles rerouted via service road" },
  ],
  public_event: [
    { type: "police", detail: "8 officers on crowd management duty" },
  ],
  congestion: [
    { type: "police", detail: "16 officers deployed for stadium exit control" },
    { type: "closure", detail: "Lane closure for post-match crowd dispersal" },
  ],
  construction: [
    { type: "closure", detail: "Single-lane closure for construction work" },
    { type: "police", detail: "4 officers managing lane merge" },
  ],
  water_logging: [
    { type: "closure", detail: "Road closed — waterlogging exceeds 30cm" },
    { type: "ambulance", detail: "Ambulance on standby near low-lying stretch" },
    { type: "diversion", detail: "Traffic diverted to higher elevation route" },
  ],
  accident: [
    { type: "accident", detail: "Minor collision — 2 vehicles, lane partially blocked" },
    { type: "ambulance", detail: "Ambulance dispatched, ETA 4 min" },
    { type: "police", detail: "Traffic police on-site managing flow" },
  ],
  protest: [
    { type: "police", detail: "20 officers deployed for gathering control" },
    { type: "closure", detail: "Road closed to vehicular traffic" },
    { type: "diversion", detail: "Full diversion active on primary corridor" },
  ],
};

export function buildIncidents(config: EventConfig, forecast: ForecastResult): IncidentMarker[] {
  const templates = INCIDENT_TEMPLATES[config.eventType] || INCIDENT_TEMPLATES.procession;
  const center = LOCATION_CENTERS[config.location];
  const rand = seededRandom(hashStr(config.location + config.eventType));

  const markers: IncidentMarker[] = templates.map((t, i) => {
    const angle = rand() * Math.PI * 2;
    const dist = 0.006 + rand() * 0.014;
    return {
      id: `incident-${i}`,
      type: t.type,
      name: typeLabel(t.type),
      lat: center[1] + Math.sin(angle) * dist,
      lon: center[0] + Math.cos(angle) * dist,
      detail: t.detail,
      timestamp: relativeTime(i),
    };
  });

  // Add ambulance marker if fire/emergency units exist and not already present
  if (forecast.fireUnitsRequired > 0 && !markers.some(m => m.type === "ambulance")) {
    const angle = rand() * Math.PI * 2;
    markers.push({
      id: "incident-ambulance",
      type: "ambulance",
      name: "Ambulance",
      lat: center[1] + Math.sin(angle) * 0.01,
      lon: center[0] + Math.cos(angle) * 0.01,
      detail: "On standby for emergency corridor response",
      timestamp: relativeTime(markers.length),
    });
  }

  return markers;
}

function typeLabel(t: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    accident: "Accident",
    event: "Event Zone",
    police: "Police Deployment",
    closure: "Road Closure",
    ambulance: "Ambulance",
    diversion: "Active Diversion",
  };
  return labels[t];
}

function relativeTime(i: number): string {
  const mins = 2 + i * 3;
  return `${mins} min ago`;
}

// ─── CCTV cameras ────────────────────────────────────────────────────────

export function buildCameras(config: EventConfig, roadSegments: RoadSegment[]): CCTVCamera[] {
  const rand = seededRandom(hashStr(config.location + "cctv"));
  const count = Math.min(5, Math.max(3, roadSegments.length));
  const cameras: CCTVCamera[] = [];

  for (let i = 0; i < count; i++) {
    const road = roadSegments[i % roadSegments.length];
    const midIdx = Math.floor(road.coords.length / 2);
    const point = road.coords[midIdx] || road.coords[0];

    const densityFromCongestion = (lvl: CongestionLevel): "Low" | "Medium" | "High" => {
      if (lvl === "severe" || lvl === "heavy") return "High";
      if (lvl === "moderate") return "Medium";
      return "Low";
    };

    const statusFromCongestion = (lvl: CongestionLevel): CCTVCamera["status"] => {
      if (lvl === "severe") return "Blocked";
      if (lvl === "heavy" || lvl === "moderate") return "Congested";
      return "Flowing";
    };

    cameras.push({
      id: `cctv-${i}`,
      name: `CAM-${(101 + i)} · ${road.name}`,
      lat: point[1],
      lon: point[0],
      vehicleDensity: densityFromCongestion(road.congestion),
      crowdDensity: rand() > 0.5 ? densityFromCongestion(road.congestion) : "Low",
      status: statusFromCongestion(road.congestion),
    });
  }

  return cameras;
}

// ─── AI Confidence breakdown ─────────────────────────────────────────────
// Components always sum to the forecast's overall confidencePct

export function buildConfidenceBreakdown(forecast: ForecastResult, config: EventConfig): ConfidenceBreakdown {
  const total = forecast.confidencePct;

  // Base weights, adjusted slightly by context
  let weights = {
    historicalData: 28,
    weather: config.rainExpected ? 22 : 14,
    roadCapacity: 16,
    crowdEstimate: 23,
    eventSimilarity: 19,
  };

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const scale = total / weightSum;

  return {
    historicalData: Math.round(weights.historicalData * scale),
    weather: Math.round(weights.weather * scale),
    roadCapacity: Math.round(weights.roadCapacity * scale),
    crowdEstimate: Math.round(weights.crowdEstimate * scale),
    eventSimilarity: Math.round(weights.eventSimilarity * scale),
  };
}

// ─── Flood zones (only when rain expected) ───────────────────────────────

export function buildFloodZones(config: EventConfig, roadSegments: RoadSegment[]): FloodZone[] {
  if (!config.rainExpected) return [];

  const center = LOCATION_CENTERS[config.location];
  const rand = seededRandom(hashStr(config.location + "flood"));

  // Build 2 irregular polygon blobs near low-lying road segments
  const zones: FloodZone[] = [];
  const zoneCount = 2;

  for (let z = 0; z < zoneCount; z++) {
    const baseAngle = rand() * Math.PI * 2;
    const baseDist = 0.006 + rand() * 0.01;
    const cx = center[0] + Math.cos(baseAngle) * baseDist;
    const cy = center[1] + Math.sin(baseAngle) * baseDist;

    const points: [number, number][] = [];
    const vertexCount = 6;
    for (let v = 0; v < vertexCount; v++) {
      const angle = (v / vertexCount) * Math.PI * 2;
      const r = 0.0035 + rand() * 0.0025;
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.7]);
    }
    points.push(points[0]); // close ring

    zones.push({
      id: `flood-${z}`,
      coords: points,
      severity: z === 0 ? "high" : "moderate",
    });
  }

  return zones;
}

// ─── Impact zone polygon — organic, irregular, sized by actual forecast radius ──

export function buildImpactZonePolygon(config: EventConfig, forecast: ForecastResult): ImpactZonePolygon {
  const center = LOCATION_CENTERS[config.location];
  const rand = seededRandom(hashStr(config.location + config.eventType + "impactzone"));

  // Convert km radius to rough degrees (1 deg lat ~111km at this latitude)
  const baseRadiusDeg = (forecast.impactRadiusKm / 111) * 0.55;

  const points: [number, number][] = [];
  const vertexCount = 9;
  for (let v = 0; v < vertexCount; v++) {
    const angle = (v / vertexCount) * Math.PI * 2;
    // Irregular radius per vertex — organic, not a circle
    const r = baseRadiusDeg * (0.65 + rand() * 0.55);
    points.push([
      center[0] + Math.cos(angle) * r,
      center[1] + Math.sin(angle) * r * 0.85, // slight north-south compression for realism
    ]);
  }
  points.push(points[0]); // close ring

  return { id: "impact-zone-polygon", coords: points };
}

// ─── Citizen advisory ────────────────────────────────────────────────────

export function buildCitizenAdvisory(forecast: ForecastResult, config: EventConfig): CitizenAdvisoryEntry[] {
  const entries: CitizenAdvisoryEntry[] = [];

  if (forecast.blockedRoads[0] && forecast.diversionRouteRoads[0]) {
    entries.push({
      avoid: forecast.blockedRoads[0].name,
      alternative: forecast.diversionRouteRoads[0].name,
      etaIncreaseMin: Math.max(5, Math.round(forecast.expectedDelayMin * 0.4)),
    });
  }
  if (forecast.blockedRoads[1] && forecast.diversionRouteRoads[1]) {
    entries.push({
      avoid: forecast.blockedRoads[1].name,
      alternative: forecast.diversionRouteRoads[1].name,
      etaIncreaseMin: Math.max(4, Math.round(forecast.expectedDelayMin * 0.3)),
    });
  }
  if (entries.length === 0 && forecast.impactZoneRoads[0]) {
    entries.push({
      avoid: forecast.impactZoneRoads[0].name,
      alternative: forecast.preferredRoute,
      etaIncreaseMin: Math.max(5, Math.round(forecast.expectedDelayMin * 0.35)),
    });
  }

  return entries;
}

// ─── Data stream panel (simulated live feeds) ────────────────────────────

export function buildDataStreams(config: EventConfig): DataStreamFeed[] {
  return [
    { name: "Weather Feed", status: "live", detail: config.rainExpected ? "Rainfall detected — IMD radar" : "Clear conditions" },
    { name: "Event Feed", status: "live", detail: `${config.location} — monitoring active` },
    { name: "CCTV Network", status: "live", detail: "5 cameras reporting" },
    { name: "BMTC Feed", status: "live", detail: "Route telemetry synced" },
    { name: "Metro Feed", status: "live", detail: "Station footfall synced" },
    { name: "Traffic Sensors", status: config.rainExpected ? "degraded" : "live", detail: config.rainExpected ? "2 sensors offline (waterlogging)" : "All sensors nominal" },
  ];
}

// ─── Master builder ───────────────────────────────────────────────────────

export function buildMapIntelligence(
  config: EventConfig,
  forecast: ForecastResult,
  animationStage: number
): MapIntelligence {
  const roadSegments = buildRoadSegments(forecast.impactZoneRoads, animationStage, config.rainExpected);
  const incidents = buildIncidents(config, forecast);
  const cameras = buildCameras(config, roadSegments);
  const confidence = buildConfidenceBreakdown(forecast, config);
  const floodZones = buildFloodZones(config, roadSegments);
  const impactZonePolygon = buildImpactZonePolygon(config, forecast);
  const advisory = buildCitizenAdvisory(forecast, config);
  const dataStreams = buildDataStreams(config);

  return { roadSegments, incidents, cameras, confidence, floodZones, impactZonePolygon, advisory, dataStreams };
}