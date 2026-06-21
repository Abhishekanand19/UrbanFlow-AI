// ─────────────────────────────────────────────────────────────────────────
// UrbanFlow AI — Core Decision Engine
// All forecast, staffing, and routing logic lives here.
// VIP and Rain toggles flow through every calculation in this file.
// ─────────────────────────────────────────────────────────────────────────

export interface EventConfig {
  eventType: string;
  location: string;
  crowd: string;
  duration: string;
  vipPresence: boolean;
  rainExpected: boolean;
}

export interface JunctionImpact {
  name: string;
  lat: number;
  lon: number;
}

export interface DeploymentZone {
  name: string;
  lat: number;
  lon: number;
  officers: number;
  barricades: number;
  priority: "High" | "Medium" | "Low";
  reason: string;
}

export interface BMTCRoute {
  route: string;
  original: string;
  diverted: string;
}

export interface MetroStation {
  name: string;
  footfallIncreasePct: number;
  additionalStaff: number;
}

export interface RoadGeometry {
  name: string;
  coords: [number, number][];
}

export interface ForecastResult {
  // Section 2 — AI Impact Analysis
  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  affectedJunctions: JunctionImpact[];
  impactRadiusKm: number;
  expectedDelayMin: number;
  peakWindowStart: string;
  peakWindowEnd: string;
  confidencePct: number;

  // Section 3 — Event Operations Plan
  officersRequired: number;
  barricadesRequired: number;
  towTrucksRequired: number;
  fireUnitsRequired: number;
  entryGates: string[];
  exitGates: string[];
  deploymentPriority: { gate: string; priority: number }[];

  // Section 4 — Traffic Control Plan
  roadsClosed: string[];
  diversionRoutes: { from: string; to: string; reason: string }[];
  signalAdjustment: string;
  highRiskJunctions: string[];
  additionalOfficers: number;

  // Section 5 — Public Transport
  bmtcRoutes: BMTCRoute[];
  metroStations: MetroStation[];

  // Section 6 — Emergency Mobility
  avoidRoute: string;
  preferredRoute: string;
  backupRoute: string;

  // Section 7 — Before/After
  congestionBeforePct: number;
  congestionAfterPct: number;
  delayBefore: number;
  delayAfter: number;
  speedBefore: number;
  speedAfter: number;

  // Deployment zones for map markers
  deploymentZones: DeploymentZone[];

  // Map geometry
  impactZoneRoads: RoadGeometry[];
  originalRouteRoads: RoadGeometry[];
  diversionRouteRoads: RoadGeometry[];
  blockedRoads: RoadGeometry[];
  emergencyCorridor: RoadGeometry | null;
  vipCorridor: RoadGeometry | null;
}

// ─── Location data: coordinates + road network ──────────────────────────

export const LOCATIONS = [
  "Silk Board",
  "MG Road",
  "Church Street",
  "Majestic",
  "Electronic City",
  "Mekhri Circle",
  "Jayanagar",
] as const;

export const LOCATION_CENTERS: Record<string, [number, number]> = {
  "Silk Board":      [77.6227, 12.9175],
  "MG Road":         [77.6101, 12.9758],
  "Church Street":   [77.6070, 12.9740],
  "Majestic":        [77.5719, 12.9777],
  "Electronic City": [77.6761, 12.8399],
  "Mekhri Circle":   [77.5855, 13.0085],
  "Jayanagar":       [77.5832, 12.9299],
};

interface LocationProfile {
  junctions: JunctionImpact[];
  roads: RoadGeometry[]; // candidate road network around this location
  gates: string[];
  bmtcRoutes: BMTCRoute[];
  metroStations: MetroStation[];
}

const LOCATION_PROFILES: Record<string, LocationProfile> = {
  "Silk Board": {
    junctions: [
      { name: "Silk Board Junction", lat: 12.9175, lon: 77.6227 },
      { name: "BTM Layout",          lat: 12.9166, lon: 77.6101 },
      { name: "HSR Layout Junction", lat: 12.9121, lon: 77.6446 },
      { name: "Madiwala",            lat: 12.9233, lon: 77.6177 },
    ],
    roads: [
      { name: "Hosur Road (North)",      coords: [[77.6227, 12.9175], [77.6280, 12.9210], [77.6350, 12.9240]] },
      { name: "Hosur Road (South)",      coords: [[77.6227, 12.9175], [77.6180, 12.9140], [77.6100, 12.9100]] },
      { name: "Inner Ring Road (West)",  coords: [[77.6227, 12.9175], [77.6150, 12.9200], [77.6050, 12.9230]] },
      { name: "Inner Ring Road (East)",  coords: [[77.6227, 12.9175], [77.6300, 12.9160], [77.6400, 12.9150]] },
      { name: "BTM Connector",           coords: [[77.6227, 12.9175], [77.6210, 12.9100], [77.6190, 12.9020]] },
      { name: "HSR Service Road",        coords: [[77.6227, 12.9175], [77.6350, 12.9140], [77.6446, 12.9121]] },
    ],
    gates: ["North Gate", "East Gate", "South Gate", "West Gate"],
    bmtcRoutes: [
      { route: "201",   original: "Majestic → Silk Board → Electronic City", diverted: "Majestic → BTM 2nd Stage → Electronic City" },
      { route: "210A",  original: "Shivajinagar → Silk Board → HSR Layout",  diverted: "Shivajinagar → Koramangala → HSR Layout" },
      { route: "500C",  original: "Banashankari → Silk Board → Marathahalli", diverted: "Banashankari → Bannerghatta Rd → Marathahalli" },
    ],
    metroStations: [
      { name: "Silk Board (under construction)", footfallIncreasePct: 0,  additionalStaff: 0 },
      { name: "BTM Layout",                       footfallIncreasePct: 28, additionalStaff: 3 },
      { name: "Jayadeva",                          footfallIncreasePct: 22, additionalStaff: 2 },
    ],
  },
  "MG Road": {
    junctions: [
      { name: "MG Road Junction",   lat: 12.9758, lon: 77.6101 },
      { name: "Brigade Road",       lat: 12.9716, lon: 77.6080 },
      { name: "Trinity Circle",     lat: 12.9728, lon: 77.6178 },
      { name: "Cubbon Park Gate",   lat: 12.9763, lon: 77.5946 },
    ],
    roads: [
      { name: "MG Road (West)",       coords: [[77.6101, 12.9758], [77.6050, 12.9758], [77.5980, 12.9758]] },
      { name: "MG Road (East)",       coords: [[77.6101, 12.9758], [77.6160, 12.9758], [77.6230, 12.9758]] },
      { name: "Brigade Road",         coords: [[77.6101, 12.9758], [77.6101, 12.9810], [77.6101, 12.9870]] },
      { name: "Residency Road",       coords: [[77.6101, 12.9758], [77.6050, 12.9700], [77.6000, 12.9650]] },
      { name: "Richmond Road",        coords: [[77.6101, 12.9758], [77.6160, 12.9700], [77.6200, 12.9640]] },
      { name: "Queens Road",          coords: [[77.6101, 12.9758], [77.6050, 12.9810], [77.5990, 12.9850]] },
    ],
    gates: ["North Gate", "East Gate", "South Gate"],
    bmtcRoutes: [
      { route: "150",   original: "Shivajinagar → MG Road → Domlur",     diverted: "Shivajinagar → Museum Road → Domlur" },
      { route: "500CA", original: "Majestic → MG Road → Indiranagar",    diverted: "Majestic → Richmond Road → Indiranagar" },
      { route: "201",   original: "Banashankari → MG Road → Whitefield", diverted: "Banashankari → Queens Road → Whitefield" },
    ],
    metroStations: [
      { name: "MG Road",      footfallIncreasePct: 45, additionalStaff: 6 },
      { name: "Cubbon Park",  footfallIncreasePct: 31, additionalStaff: 4 },
      { name: "Trinity",      footfallIncreasePct: 27, additionalStaff: 3 },
    ],
  },
  "Church Street": {
    junctions: [
      { name: "Church Street Junction", lat: 12.9740, lon: 77.6070 },
      { name: "Brigade Road",           lat: 12.9716, lon: 77.6080 },
      { name: "St Mark's Road",         lat: 12.9710, lon: 77.6020 },
      { name: "Museum Road",            lat: 12.9755, lon: 77.6140 },
    ],
    roads: [
      { name: "Church Street",       coords: [[77.6070, 12.9740], [77.6040, 12.9770], [77.6010, 12.9800]] },
      { name: "Brigade Road",        coords: [[77.6070, 12.9740], [77.6100, 12.9760], [77.6140, 12.9780]] },
      { name: "Residency Road",      coords: [[77.6070, 12.9740], [77.6030, 12.9710], [77.5990, 12.9680]] },
      { name: "Museum Road",         coords: [[77.6070, 12.9740], [77.6110, 12.9710], [77.6150, 12.9680]] },
      { name: "St Mark's Road",      coords: [[77.6070, 12.9740], [77.6070, 12.9800], [77.6070, 12.9860]] },
    ],
    gates: ["North Gate", "South Gate"],
    bmtcRoutes: [
      { route: "150",  original: "Shivajinagar → Church St → Domlur",  diverted: "Shivajinagar → Museum Road → Domlur" },
      { route: "500C", original: "Majestic → Church St → Indiranagar", diverted: "Majestic → St Mark's Road → Indiranagar" },
    ],
    metroStations: [
      { name: "MG Road",     footfallIncreasePct: 38, additionalStaff: 5 },
      { name: "Cubbon Park", footfallIncreasePct: 24, additionalStaff: 3 },
    ],
  },
  "Majestic": {
    junctions: [
      { name: "Majestic Bus Stand",   lat: 12.9777, lon: 77.5719 },
      { name: "KR Market",            lat: 12.9650, lon: 77.5750 },
      { name: "City Railway Station", lat: 12.9767, lon: 77.5690 },
      { name: "Seshadripuram",        lat: 12.9870, lon: 77.5780 },
    ],
    roads: [
      { name: "Tumkur Road",       coords: [[77.5719, 12.9777], [77.5660, 12.9800], [77.5600, 12.9820]] },
      { name: "Seshadri Road",     coords: [[77.5719, 12.9777], [77.5780, 12.9760], [77.5850, 12.9740]] },
      { name: "South Connector",   coords: [[77.5719, 12.9777], [77.5719, 12.9710], [77.5719, 12.9640]] },
      { name: "Mysore Road",       coords: [[77.5719, 12.9777], [77.5680, 12.9740], [77.5640, 12.9700]] },
      { name: "KR Road",           coords: [[77.5719, 12.9777], [77.5760, 12.9810], [77.5800, 12.9840]] },
    ],
    gates: ["North Gate", "East Gate", "South Gate", "West Gate"],
    bmtcRoutes: [
      { route: "365J", original: "Majestic → KR Market → Jayanagar",     diverted: "Majestic → Mysore Road → Jayanagar" },
      { route: "400",  original: "Majestic → Seshadripuram → Yeshwanthpur", diverted: "Majestic → KR Road → Yeshwanthpur" },
    ],
    metroStations: [
      { name: "Majestic (Interchange)", footfallIncreasePct: 52, additionalStaff: 8 },
      { name: "City Railway Station",   footfallIncreasePct: 33, additionalStaff: 4 },
    ],
  },
  "Electronic City": {
    junctions: [
      { name: "Electronic City Toll",  lat: 12.8399, lon: 77.6761 },
      { name: "Bommanahalli",          lat: 12.8990, lon: 77.6240 },
      { name: "Konappana Agrahara",    lat: 12.8530, lon: 77.6630 },
    ],
    roads: [
      { name: "Hosur Road (North)",   coords: [[77.6761, 12.8399], [77.6800, 12.8450], [77.6850, 12.8500]] },
      { name: "Hosur Road (South)",   coords: [[77.6761, 12.8399], [77.6720, 12.8350], [77.6680, 12.8300]] },
      { name: "Service Road West",    coords: [[77.6761, 12.8399], [77.6700, 12.8420], [77.6620, 12.8440]] },
      { name: "Phase 2 Connector",    coords: [[77.6761, 12.8399], [77.6820, 12.8380], [77.6900, 12.8360]] },
    ],
    gates: ["North Gate", "South Gate"],
    bmtcRoutes: [
      { route: "500K", original: "Silk Board → Electronic City → Attibele", diverted: "Silk Board → NICE Road → Attibele" },
    ],
    metroStations: [
      { name: "Electronic City",  footfallIncreasePct: 19, additionalStaff: 2 },
    ],
  },
  "Mekhri Circle": {
    junctions: [
      { name: "Mekhri Circle",   lat: 13.0085, lon: 77.5855 },
      { name: "Hebbal",          lat: 13.0358, lon: 77.5970 },
      { name: "Jayamahal",       lat: 13.0010, lon: 77.5960 },
    ],
    roads: [
      { name: "Bellary Road (North)", coords: [[77.5855, 13.0085], [77.5800, 13.0120], [77.5750, 13.0160]] },
      { name: "Bellary Road (South)", coords: [[77.5855, 13.0085], [77.5910, 13.0050], [77.5960, 13.0010]] },
      { name: "Sankey Road",          coords: [[77.5855, 13.0085], [77.5790, 13.0060], [77.5720, 13.0030]] },
      { name: "Jayamahal Road",       coords: [[77.5855, 13.0085], [77.5920, 13.0110], [77.5990, 13.0130]] },
      { name: "Palace Road",          coords: [[77.5855, 13.0085], [77.5855, 13.0020], [77.5855, 12.9950]] },
    ],
    gates: ["North Gate", "South Gate"],
    bmtcRoutes: [
      { route: "293", original: "Hebbal → Mekhri Circle → City Center", diverted: "Hebbal → Sankey Road → City Center" },
    ],
    metroStations: [
      { name: "Sandal Soap Factory", footfallIncreasePct: 14, additionalStaff: 2 },
    ],
  },
  "Jayanagar": {
    junctions: [
      { name: "Jayanagar 4th Block",  lat: 12.9299, lon: 77.5832 },
      { name: "South End Circle",     lat: 12.9420, lon: 77.5800 },
      { name: "Jayanagar 9th Block",  lat: 12.9180, lon: 77.5840 },
    ],
    roads: [
      { name: "11th Main Road",     coords: [[77.5832, 12.9299], [77.5770, 12.9320], [77.5700, 12.9340]] },
      { name: "30th Cross Road",    coords: [[77.5832, 12.9299], [77.5900, 12.9280], [77.5970, 12.9260]] },
      { name: "South Connector",    coords: [[77.5832, 12.9299], [77.5832, 12.9240], [77.5832, 12.9180]] },
      { name: "North Connector",    coords: [[77.5832, 12.9299], [77.5832, 12.9360], [77.5832, 12.9420]] },
      { name: "KP Road",            coords: [[77.5832, 12.9299], [77.5760, 12.9270], [77.5690, 12.9240]] },
    ],
    gates: ["North Gate", "South Gate"],
    bmtcRoutes: [
      { route: "210A", original: "Jayanagar → 30th Cross → BTM Layout", diverted: "Jayanagar → KP Road → BTM Layout" },
    ],
    metroStations: [
      { name: "Jayanagar",         footfallIncreasePct: 26, additionalStaff: 3 },
      { name: "South End Circle",  footfallIncreasePct: 18, additionalStaff: 2 },
    ],
  },
};

// ─── Event type base profiles ────────────────────────────────────────────

interface EventProfile {
  label: string;
  baseRisk: "Low" | "Moderate" | "High" | "Severe";
  baseDelay: number;
  baseRadius: number;
  baseOfficers: number;
  baseBarricades: number;
  baseTow: number;
  baseFire: number;
  roadCount: number; // how many roads from the profile get affected
}

export const EVENT_TYPES = [
  { value: "procession",        label: "Political Rally" },
  { value: "public_event",      label: "Festival / Public Event" },
  { value: "congestion",        label: "Sports Event" },
  { value: "construction",      label: "Construction Activity" },
  { value: "water_logging",     label: "Flood / Waterlogging" },
  { value: "accident",          label: "Accident" },
  { value: "protest",           label: "Protest / Gathering" },
];

const EVENT_PROFILES: Record<string, EventProfile> = {
  procession:    { label: "Political Rally",         baseRisk: "High",     baseDelay: 28, baseRadius: 2.2, baseOfficers: 24, baseBarricades: 10, baseTow: 1, baseFire: 1, roadCount: 4 },
  public_event:  { label: "Festival / Public Event",  baseRisk: "Moderate", baseDelay: 22, baseRadius: 1.6, baseOfficers: 16, baseBarricades: 7,  baseTow: 1, baseFire: 1, roadCount: 3 },
  congestion:    { label: "Sports Event",              baseRisk: "Severe",   baseDelay: 32, baseRadius: 2.6, baseOfficers: 28, baseBarricades: 12, baseTow: 2, baseFire: 1, roadCount: 5 },
  construction:  { label: "Construction Activity",     baseRisk: "Moderate", baseDelay: 18, baseRadius: 1.1, baseOfficers: 8,  baseBarricades: 6,  baseTow: 1, baseFire: 0, roadCount: 2 },
  water_logging: { label: "Flood / Waterlogging",      baseRisk: "Severe",   baseDelay: 30, baseRadius: 2.4, baseOfficers: 14, baseBarricades: 8,  baseTow: 3, baseFire: 1, roadCount: 5 },
  accident:      { label: "Accident",                  baseRisk: "Moderate", baseDelay: 16, baseRadius: 0.8, baseOfficers: 6,  baseBarricades: 4,  baseTow: 1, baseFire: 1, roadCount: 2 },
  protest:       { label: "Protest / Gathering",       baseRisk: "Severe",   baseDelay: 34, baseRadius: 2.8, baseOfficers: 30, baseBarricades: 14, baseTow: 1, baseFire: 1, roadCount: 5 },
};

const CROWD_MULT: Record<string, number> = { small: 0.6, medium: 1.0, large: 1.5, massive: 2.2 };
const DURATION_MULT: Record<string, number> = { "1": 0.7, "2": 1.0, "4": 1.3, "8": 1.8 };

const RISK_ORDER = ["Low", "Moderate", "High", "Severe"] as const;

function bumpRisk(risk: ForecastResult["riskLevel"], steps: number): ForecastResult["riskLevel"] {
  const idx = Math.min(RISK_ORDER.indexOf(risk) + steps, RISK_ORDER.length - 1);
  return RISK_ORDER[idx];
}

// ─── Main calculation function ───────────────────────────────────────────

export function calculateForecast(config: EventConfig): ForecastResult {
  const profile = EVENT_PROFILES[config.eventType] || EVENT_PROFILES.procession;
  const locProfile = LOCATION_PROFILES[config.location] || LOCATION_PROFILES["Silk Board"];

  const cm = CROWD_MULT[config.crowd] || 1.0;
  const dm = DURATION_MULT[config.duration] || 1.0;

  // VIP and Rain multipliers
  const vipOfficerMult  = config.vipPresence ? 1.4 : 1.0;
  const vipBarricadeMult = config.vipPresence ? 1.3 : 1.0;
  const vipRiskBump     = config.vipPresence ? 1 : 0;

  const rainDelayMult   = config.rainExpected ? 1.35 : 1.0;
  const rainRadiusMult  = config.rainExpected ? 1.25 : 1.0;
  const rainTowMult     = config.rainExpected ? 2.0  : 1.0;
  const rainRiskBump    = config.rainExpected ? 1 : 0;

  // ── Risk level ──
  let riskLevel = bumpRisk(profile.baseRisk, vipRiskBump + rainRiskBump);

  // ── Affected junctions ──
  const junctionCount = Math.min(
    locProfile.junctions.length,
    Math.max(2, Math.round(profile.roadCount * 0.7 * cm))
  );
  const affectedJunctions = locProfile.junctions.slice(0, junctionCount);

  // ── Impact radius ──
  const impactRadiusKm = parseFloat((profile.baseRadius * cm * rainRadiusMult).toFixed(1));

  // ── Delay ──
  const expectedDelayMin = Math.round(profile.baseDelay * cm * dm * rainDelayMult);

  // ── Peak window (centered around 6:15 PM, widened by duration) ──
  const peakStartMinutes = 18 * 60 + 15; // 6:15 PM
  const peakEndMinutes = peakStartMinutes + Math.round(60 * dm + (config.rainExpected ? 30 : 0));
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const period = h >= 12 ? "PM" : "AM";
    return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
  };

  // ── Confidence (more data signals = higher confidence; extreme weather lowers it slightly) ──
  let confidencePct = 91 - (config.rainExpected ? 6 : 0) - (config.vipPresence ? 2 : 0);
  confidencePct = Math.max(70, Math.min(96, confidencePct));

  // ── Staffing ──
  const officersRequired   = Math.round(profile.baseOfficers * cm * vipOfficerMult);
  const barricadesRequired = Math.round(profile.baseBarricades * cm * vipBarricadeMult);
  const towTrucksRequired  = Math.max(1, Math.round(profile.baseTow * rainTowMult));
  const fireUnitsRequired  = profile.baseFire + (config.vipPresence ? 1 : 0);

  // ── Gates / deployment ──
  const gates = locProfile.gates;
  const totalOfficersForGates = officersRequired;
  // Distribute officers across gates by descending priority weight
  const weights = gates.map((_, i) => gates.length - i); // first gate gets highest weight
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const deploymentZones: DeploymentZone[] = gates.map((gate, i) => {
    const center = LOCATION_CENTERS[config.location];
    const angle = (i / gates.length) * Math.PI * 2;
    const offset = 0.012;
    const officers = Math.max(2, Math.round((weights[i] / weightSum) * totalOfficersForGates));
    const barricades = Math.max(1, Math.round((weights[i] / weightSum) * barricadesRequired));
    const priority: DeploymentZone["priority"] = i === 0 ? "High" : i === 1 ? "Medium" : "Low";
    const crowdPct = Math.max(20, 65 - i * 15);
    return {
      name: gate,
      lat: center[1] + Math.sin(angle) * offset,
      lon: center[0] + Math.cos(angle) * offset,
      officers,
      barricades,
      priority,
      reason: `${crowdPct}% crowd entry expected at this gate.`,
    };
  });

  const deploymentPriority = deploymentZones
    .slice()
    .sort((a, b) => (a.priority === "High" ? 0 : a.priority === "Medium" ? 1 : 2) -
                     (b.priority === "High" ? 0 : b.priority === "Medium" ? 1 : 2))
    .map((z, i) => ({ gate: z.name, priority: i + 1 }));

  // ── Roads: pick affected roads from profile ──
  const affectedRoadCount = Math.min(locProfile.roads.length, Math.max(2, Math.round(profile.roadCount * cm)));
  const impactZoneRoads = locProfile.roads.slice(0, affectedRoadCount);
  const blockedRoadCount = Math.max(1, Math.round(affectedRoadCount * 0.4));
  const blockedRoads = impactZoneRoads.slice(0, blockedRoadCount);

  const roadsClosed = blockedRoads.map(r => r.name);
  const highRiskJunctions = affectedJunctions.slice(0, Math.min(3, affectedJunctions.length)).map(j => j.name);

  // Diversion: route remaining (non-blocked) roads as alternates
  const diversionCandidates = impactZoneRoads.slice(blockedRoadCount);
  const diversionRoutes = diversionCandidates.slice(0, 2).map((r, i) => ({
    from: blockedRoads[i % blockedRoads.length]?.name || impactZoneRoads[0].name,
    to: r.name,
    reason: config.rainExpected
      ? "Primary route waterlogged — rerouting via higher-elevation corridor"
      : "Primary route at capacity — rerouting via parallel arterial",
  }));

  const originalRouteRoads = blockedRoads;
  const diversionRouteRoads = diversionCandidates.slice(0, 2);

  const signalAdjustment = config.rainExpected
    ? "Longer green signals added on diversion roads due to reduced visibility and speed"
    : "Traffic signals optimized for alternate routes to reduce delays";

  const additionalOfficers = config.vipPresence ? Math.round(officersRequired * 0.25) : Math.round(officersRequired * 0.15);

  // ── BMTC ──
  const bmtcRoutes = locProfile.bmtcRoutes;

  // ── Metro ──
  const rainFootfallBump = config.rainExpected ? 12 : 0;
  const metroStations = locProfile.metroStations
    .map(m => ({
      ...m,
      footfallIncreasePct: m.footfallIncreasePct + rainFootfallBump,
      additionalStaff: m.additionalStaff + (config.rainExpected ? 1 : 0),
    }))
    .sort((a, b) => b.footfallIncreasePct - a.footfallIncreasePct);

  // ── Emergency mobility ──
  const avoidRoute = blockedRoads[0]?.name || impactZoneRoads[0]?.name || "Primary corridor";
  const preferredRoute = diversionCandidates[0]?.name || impactZoneRoads[impactZoneRoads.length - 1]?.name || "Service Road";
  const backupRoute = diversionCandidates[1]?.name || impactZoneRoads[Math.floor(impactZoneRoads.length / 2)]?.name || "Ring Road";

  // ── Emergency corridor (pink) — always shown, connects to nearest "hospital-direction" road ──
  const center = LOCATION_CENTERS[config.location];
  const emergencyCorridor: RoadGeometry = {
    name: "Emergency Corridor",
    coords: [
      center,
      [center[0] + 0.018, center[1] + 0.014],
      [center[0] + 0.032, center[1] + 0.022],
    ],
  };

  // ── VIP corridor (purple) — ONLY if VIP toggle on ──
  const vipCorridor: RoadGeometry | null = config.vipPresence
    ? {
        name: "VIP Corridor",
        coords: [
          [center[0] - 0.020, center[1] - 0.016],
          [center[0] - 0.008, center[1] - 0.006],
          center,
        ],
      }
    : null;

  // ── Before / after ──
  const congestionBeforePct = Math.min(95, Math.round(60 + cm * 10 + (config.rainExpected ? 10 : 0) + (config.vipPresence ? 5 : 0)));
  const congestionAfterPct = Math.max(15, Math.round(congestionBeforePct * 0.42));
  const delayBefore = expectedDelayMin;
  const delayAfter = Math.round(expectedDelayMin * 0.44);
  const speedBefore = Math.max(6, Math.round(28 - cm * 4 - (config.rainExpected ? 4 : 0)));
  const speedAfter = Math.round(speedBefore * 1.7);

  return {
    riskLevel,
    affectedJunctions,
    impactRadiusKm,
    expectedDelayMin,
    peakWindowStart: fmt(peakStartMinutes),
    peakWindowEnd: fmt(peakEndMinutes),
    confidencePct,

    officersRequired,
    barricadesRequired,
    towTrucksRequired,
    fireUnitsRequired,
    entryGates: gates,
    exitGates: gates,
    deploymentPriority,

    roadsClosed,
    diversionRoutes,
    signalAdjustment,
    highRiskJunctions,
    additionalOfficers,

    bmtcRoutes,
    metroStations,

    avoidRoute,
    preferredRoute,
    backupRoute,

    congestionBeforePct,
    congestionAfterPct,
    delayBefore,
    delayAfter,
    speedBefore,
    speedAfter,

    deploymentZones,

    impactZoneRoads,
    originalRouteRoads,
    diversionRouteRoads,
    blockedRoads,
    emergencyCorridor,
    vipCorridor,
  };
}

// ─── Scenario simulator: recompute outcome given manual resource overrides ──

export interface ScenarioInput {
  officers: number;
  barricades: number;
  towTrucks: number;
}

export interface ScenarioResult {
  congestionPct: number;
  delayMin: number;
  avgSpeed: number;
  improvementScore: number;
}

export function simulateScenario(
  base: ForecastResult,
  input: ScenarioInput
): ScenarioResult {
  const officerRatio = input.officers / Math.max(1, base.officersRequired);
  const barricadeRatio = input.barricades / Math.max(1, base.barricadesRequired);
  const towRatio = input.towTrucks / Math.max(1, base.towTrucksRequired);

  // Diminishing returns curve: more resources help, but with saturation
  const effectiveness = Math.min(
    1.6,
    (officerRatio * 0.5 + barricadeRatio * 0.3 + towRatio * 0.2)
  );

  const congestionPct = Math.max(10, Math.round(base.congestionBeforePct * (1 - effectiveness * 0.55)));
  const delayMin = Math.max(4, Math.round(base.delayBefore * (1 - effectiveness * 0.6)));
  const avgSpeed = Math.round(base.speedBefore * (1 + effectiveness * 0.9));
  const improvementScore = Math.min(99, Math.round(effectiveness * 62));

  return { congestionPct, delayMin, avgSpeed, improvementScore };
}
