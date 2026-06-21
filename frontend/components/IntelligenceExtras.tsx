"use client";
import { ConfidenceBreakdown } from "@/lib/mapIntelligence";

// ─── AI Confidence Breakdown ───────────────────────────────────────────────
// NOTE: CitizenAdvisorySection was removed in this revision per spec
// ("Remove these components completely" — Citizen Advisory, Active Data
// Streams, Deployment Status box). Only the confidence breakdown remains,
// nested inside Section 02 (AI Impact Analysis).

const CONFIDENCE_ITEMS: { key: keyof ConfidenceBreakdown; label: string; color: string }[] = [
  { key: "historicalData", label: "Historical Data", color: "#4A90FF" },
  { key: "weather", label: "Weather", color: "#38D6FF" },
  { key: "roadCapacity", label: "Road Capacity", color: "#FFB020" },
  { key: "crowdEstimate", label: "Crowd Estimate", color: "#B56DFF" },
  { key: "eventSimilarity", label: "Event Similarity", color: "#3FB97F" },
];

export function ConfidenceBreakdownPanel({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return (
    <div style={{
      marginTop: 12, padding: "11px 12px", background: "#1D1F24",
      border: "1px solid #2A2D34", borderRadius: 7,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span style={{ fontSize: 10.5, color: "#A0A7B5", fontWeight: 600 }}>AI Confidence Breakdown</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3FB97F" }}>{total}%</span>
      </div>

      <div style={{ display: "flex", width: "100%", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 9 }}>
        {CONFIDENCE_ITEMS.map(item => (
          <div key={item.key} style={{ width: `${breakdown[item.key]}%`, background: item.color }} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {CONFIDENCE_ITEMS.map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: "#A0A7B5", flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#F2F3F5" }}>{breakdown[item.key]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
