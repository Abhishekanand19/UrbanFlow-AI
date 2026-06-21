const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchKPI() {
  const r = await fetch(`${BASE}/api/kpi`);
  return r.json();
}

export async function fetchHotspots(topN = 25) {
  const r = await fetch(`${BASE}/api/hotspots?top_n=${topN}`);
  return r.json();
}

export async function fetchJunctions() {
  const r = await fetch(`${BASE}/api/junctions`);
  return r.json();
}

export async function fetchCascade(junction: string) {
  const r = await fetch(`${BASE}/api/cascade?junction=${encodeURIComponent(junction)}`);
  return r.json();
}

export async function fetchSimilar(event_cause: string, junction: string) {
  const r = await fetch(
    `${BASE}/api/similar?event_cause=${encodeURIComponent(event_cause)}&junction=${encodeURIComponent(junction)}`
  );
  return r.json();
}

export async function fetchEmergencyCorridor(lat: number, lon: number) {
  const r = await fetch(`${BASE}/api/emergency-corridor?lat=${lat}&lon=${lon}`);
  return r.json();
}

export async function runSimulation(payload: { incident: string; junction: string }) {
  const r = await fetch(`${BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export async function fetchAIBrief(payload: {
  junction: string;
  event_cause: string;
  risk_score: number;
  zone: string;
  cascade_steps: any[];
}) {
  const r = await fetch(`${BASE}/api/ai-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}