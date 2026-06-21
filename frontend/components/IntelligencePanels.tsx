"use client";
import {
  Users, Construction, Truck, Flame, GitBranch, Radio, Bus, TrainFront,
} from "lucide-react";
import { ForecastResult } from "@/lib/engine";
import { ConfidenceBreakdown } from "@/lib/mapIntelligence";
import { ConfidenceBreakdownPanel } from "@/components/IntelligenceExtras";

// ─── Shared primitives ────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 13 }}>
      <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.09em" }}>{num}</span>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F2F3F5", letterSpacing: "-0.01em" }}>{title}</h2>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "16px 20px", borderTop: "1px solid #2A2D34" }}>{children}</div>;
}

const RISK_COLORS: Record<string, string> = {
  Low: "#3FB97F", Moderate: "#FFB020", High: "#FF8A3D", Severe: "#FF4D4F",
};

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — AI Impact Analysis (dense, no giant numbers)
// ═══════════════════════════════════════════════════════════════════════

export function ImpactAnalysisSection({ forecast, confidenceBreakdown }: { forecast: ForecastResult; confidenceBreakdown?: ConfidenceBreakdown }) {
  const riskColor = RISK_COLORS[forecast.riskLevel];
  return (
    <Section>
      <SectionHeader num="02" title="AI Impact Analysis" />

      <div style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "9px 12px", borderRadius: 7, marginBottom: 13,
        background: `${riskColor}0f`, border: `1px solid ${riskColor}35`,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: riskColor }} />
        <span style={{ fontSize: 11, color: "#A0A7B5" }}>Risk Level</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: riskColor, marginLeft: "auto" }}>
          {forecast.riskLevel.toUpperCase()}
        </span>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px",
        marginBottom: 13, background: "#1D1F24", border: "1px solid #2A2D34", borderRadius: 7, padding: "11px 13px",
      }}>
        <MiniStat label="Expected delay" value={`${forecast.expectedDelayMin} min`} />
        <MiniStat label="Impact radius" value={`${forecast.impactRadiusKm} km`} />
        <MiniStat label="Peak window start" value={forecast.peakWindowStart} />
        <MiniStat label="Peak window end" value={forecast.peakWindowEnd} />
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 6 }}>
          Affected junctions ({forecast.affectedJunctions.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden" }}>
          {forecast.affectedJunctions.map((j, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 11.5, color: "#A0A7B5",
              padding: "6px 11px", background: i % 2 === 0 ? "#1D1F24" : "#1A1B1F",
            }}>
              <span style={{ color: "#747B88", fontFamily: "JetBrains Mono, monospace", fontSize: 9.5 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {j.name}
            </div>
          ))}
        </div>
      </div>

      {confidenceBreakdown && <ConfidenceBreakdownPanel breakdown={confidenceBreakdown} />}
    </Section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: "#F2F3F5", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#747B88", marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 — Event Operations Plan — Deployment Priority redesign
// ═══════════════════════════════════════════════════════════════════════

export function OperationsPlanSection({ forecast }: { forecast: ForecastResult }) {
  const resources = [
    { icon: <Users size={13} />, label: "Officers", value: forecast.officersRequired },
    { icon: <Construction size={13} />, label: "Barricades", value: forecast.barricadesRequired },
    { icon: <Truck size={13} />, label: "Tow trucks", value: forecast.towTrucksRequired },
    { icon: <Flame size={13} />, label: "Fire units", value: forecast.fireUnitsRequired },
  ];

  return (
    <Section>
      <SectionHeader num="03" title="Event Operations Plan" />

      <div style={{
        display: "flex", border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden", marginBottom: 14,
      }}>
        {resources.map((r, i) => (
          <div key={i} style={{
            flex: 1, padding: "10px 8px", textAlign: "center" as const,
            borderRight: i < resources.length - 1 ? "1px solid #2A2D34" : "none",
            background: "#1D1F24",
          }}>
            <div style={{ color: "#747B88", display: "flex", justifyContent: "center", marginBottom: 5 }}>{r.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#F2F3F5", lineHeight: 1 }}>{r.value}</div>
            <div style={{ fontSize: 9.5, color: "#747B88", marginTop: 3 }}>{r.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 7 }}>Deployment priority</div>
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden" }}>
        {forecast.deploymentPriority.map((d, i) => {
          const zone = forecast.deploymentZones.find(z => z.name === d.gate);
          const priorityColor = zone?.priority === "High" ? "#FF4D4F" : zone?.priority === "Medium" ? "#FFB020" : "#4A90FF";
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px",
              background: i % 2 === 0 ? "#1D1F24" : "#1A1B1F",
              borderTop: i > 0 ? "1px solid #2A2D34" : "none",
            }}>
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
                color: priorityColor, width: 22, flexShrink: 0,
              }}>
                P{d.priority}
              </span>
              <span style={{ fontSize: 12.5, color: "#F2F3F5", fontWeight: 500, flex: 1 }}>{d.gate}</span>
              {zone && (
                <>
                  <span style={{ fontSize: 11, color: "#A0A7B5", fontFamily: "JetBrains Mono, monospace" }}>
                    {zone.officers} off
                  </span>
                  <span style={{ fontSize: 11, color: "#A0A7B5", fontFamily: "JetBrains Mono, monospace" }}>
                    {zone.barricades} bar
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: `${priorityColor}18`, color: priorityColor, letterSpacing: "0.03em",
                  }}>
                    {zone.priority.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4 — Traffic Control Plan — operations briefing redesign
// ═══════════════════════════════════════════════════════════════════════

export function TrafficControlSection({ forecast }: { forecast: ForecastResult }) {
  return (
    <Section>
      <SectionHeader num="04" title="Traffic Control Plan" />

      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 6 }}>Roads closed</div>
        <div style={{ border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden" }}>
          {forecast.roadsClosed.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 11px",
              background: i % 2 === 0 ? "#1D1F24" : "#1A1B1F",
              borderTop: i > 0 ? "1px solid #2A2D34" : "none",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF4D4F", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#F2F3F5" }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 6 }}>Diversions</div>
        {forecast.diversionRoutes.map((d, i) => (
          <div key={i} style={{
            padding: "10px 12px", background: "#1D1F24", borderRadius: 7,
            border: "1px solid #2A2D34", marginBottom: 7,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 3 }}>
              <span style={{ fontSize: 9.5, color: "#747B88", width: 56, flexShrink: 0 }}>ORIGINAL</span>
              <span style={{ fontSize: 12, color: "#747B88", textDecoration: "line-through" }}>{d.from}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 6 }}>
              <span style={{ fontSize: 9.5, color: "#747B88", width: 56, flexShrink: 0 }}>DIVERTED</span>
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: "#FFB020",
                background: "#FFB02014", padding: "1px 6px", borderRadius: 4,
              }}>
                {d.to}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#A0A7B5", lineHeight: 1.4, paddingLeft: 65 }}>{d.reason}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "flex-start", gap: 9,
        padding: "9px 11px", background: "#1D1F24", borderRadius: 7,
        border: "1px solid #2A2D34", marginBottom: 13,
      }}>
        <Radio size={12} style={{ color: "#4A90FF", marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "#A0A7B5", lineHeight: 1.4 }}>{forecast.signalAdjustment}</span>
      </div>

      <div style={{ marginBottom: 11 }}>
        <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 6 }}>High-risk junctions</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          {forecast.highRiskJunctions.map((j, i) => (
            <span key={i} style={{
              fontSize: 11, padding: "3px 9px", borderRadius: 4,
              background: "#FF4D4F14", border: "1px solid #FF4D4F30", color: "#FF8A8B", fontWeight: 600,
            }}>
              {j}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 11, borderTop: "1px solid #2A2D34",
      }}>
        <span style={{ fontSize: 11, color: "#A0A7B5" }}>Additional traffic officers</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#4A90FF" }}>+{forecast.additionalOfficers}</span>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5 — Public Transport Impact — BMTC strikethrough, Metro %, staffing
// ═══════════════════════════════════════════════════════════════════════

export function PublicTransportSection({ forecast }: { forecast: ForecastResult }) {
  // Derive a delay estimate per route from overall forecast
  const routeDelay = Math.max(8, Math.round(forecast.expectedDelayMin * 0.6));

  return (
    <Section>
      <SectionHeader num="05" title="Public Transport Impact" />

      <div style={{ marginBottom: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Bus size={12} style={{ color: "#4A90FF" }} />
          <span style={{ fontSize: 11, color: "#A0A7B5", fontWeight: 600 }}>BMTC — Affected routes</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {forecast.bmtcRoutes.map((r, i) => (
            <div key={i} style={{
              padding: "9px 11px", background: "#1D1F24", borderRadius: 7, border: "1px solid #2A2D34",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F2F3F5" }}>Route {r.route}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  background: "#FFB02018", color: "#FFB020", letterSpacing: "0.03em",
                }}>
                  DIVERTED
                </span>
                <span style={{ fontSize: 10.5, color: "#FF8A3D", marginLeft: "auto" }}>+{routeDelay} min</span>
              </div>
              <div style={{ fontSize: 11, color: "#747B88", textDecoration: "line-through", marginBottom: 2 }}>
                {r.original}
              </div>
              <div style={{ fontSize: 11.5, color: "#3FB97F", fontWeight: 500 }}>{r.diverted}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <TrainFront size={12} style={{ color: "#B56DFF" }} />
          <span style={{ fontSize: 11, color: "#A0A7B5", fontWeight: 600 }}>Metro — Footfall impact</span>
        </div>
        <div style={{ border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden", marginBottom: 9 }}>
          {forecast.metroStations.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "7px 11px",
              background: i % 2 === 0 ? "#1D1F24" : "#1A1B1F",
              borderTop: i > 0 ? "1px solid #2A2D34" : "none",
            }}>
              <span style={{ fontSize: 9.5, color: "#747B88", fontFamily: "JetBrains Mono, monospace", width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: "#F2F3F5", flex: 1 }}>{s.name}</span>
              <span style={{ fontSize: 12, color: "#B56DFF", fontWeight: 700 }}>+{s.footfallIncreasePct}%</span>
            </div>
          ))}
        </div>

        {/* Staffing — male/female officers split */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <div style={{ background: "#1D1F24", border: "1px solid #2A2D34", borderRadius: 7, padding: "9px 11px", textAlign: "center" as const }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F2F3F5" }}>
              {Math.ceil(forecast.metroStations.reduce((a, s) => a + s.additionalStaff, 0) * 0.6)}
            </div>
            <div style={{ fontSize: 9.5, color: "#747B88", marginTop: 2 }}>Male officers</div>
          </div>
          <div style={{ background: "#1D1F24", border: "1px solid #2A2D34", borderRadius: 7, padding: "9px 11px", textAlign: "center" as const }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F2F3F5" }}>
              {Math.floor(forecast.metroStations.reduce((a, s) => a + s.additionalStaff, 0) * 0.4)}
            </div>
            <div style={{ fontSize: 9.5, color: "#747B88", marginTop: 2 }}>Female officers</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6 — Emergency Mobility — left-border colors, compact tags
// ═══════════════════════════════════════════════════════════════════════

export function EmergencyMobilitySection({ forecast }: { forecast: ForecastResult }) {
  const etaPreferred = Math.max(6, Math.round(forecast.delayAfter * 0.8));
  const etaBackup = Math.max(8, Math.round(forecast.delayAfter * 1.1));

  const routes = [
    { tag: "PREFERRED", value: forecast.preferredRoute, color: "#3FB97F", detail: `Est. time +${etaPreferred} min` },
    { tag: "BACKUP", value: forecast.backupRoute, color: "#4A90FF", detail: `Est. time +${etaBackup} min` },
    { tag: "AVOID", value: forecast.avoidRoute, color: "#FF4D4F", detail: "Blocked — primary impact zone" },
  ];

  return (
    <Section>
      <SectionHeader num="06" title="Emergency Mobility Advisory" />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {routes.map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "9px 12px", background: "#1D1F24", borderRadius: 6,
            borderLeft: `3px solid ${r.color}`,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: r.color, letterSpacing: "0.04em",
              width: 70, flexShrink: 0,
            }}>
              {r.tag}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F2F3F5" }}>{r.value}</div>
              <div style={{ fontSize: 10.5, color: "#747B88", marginTop: 1 }}>{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7 — Before vs After — metric table, executive report style
// ═══════════════════════════════════════════════════════════════════════

export function BeforeAfterSection({ forecast }: { forecast: ForecastResult }) {
  const congestionImprovement = Math.round((1 - forecast.congestionAfterPct / forecast.congestionBeforePct) * 100);
  const delayImprovement = Math.round((1 - forecast.delayAfter / forecast.delayBefore) * 100);
  const speedImprovement = Math.round((forecast.speedAfter / forecast.speedBefore - 1) * 100);
  const overallScore = Math.round((congestionImprovement + delayImprovement + speedImprovement) / 3);

  const rows = [
    { metric: "Congestion", before: `${forecast.congestionBeforePct}%`, after: `${forecast.congestionAfterPct}%`, improvement: congestionImprovement },
    { metric: "Delay", before: `${forecast.delayBefore} min`, after: `${forecast.delayAfter} min`, improvement: delayImprovement },
    { metric: "Avg. speed", before: `${forecast.speedBefore} km/h`, after: `${forecast.speedAfter} km/h`, improvement: speedImprovement },
  ];

  return (
    <Section>
      <SectionHeader num="07" title="Before vs After Intervention" />

      <div style={{ border: "1px solid #2A2D34", borderRadius: 7, overflow: "hidden", marginBottom: 12 }}>
        {/* Header row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1.1fr 0.8fr 0.8fr 0.7fr",
          padding: "8px 12px", background: "#23262C",
        }}>
          <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.04em" }}>METRIC</span>
          <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.04em" }}>BEFORE</span>
          <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.04em" }}>AFTER</span>
          <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.04em", textAlign: "right" as const }}>IMP.</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1.1fr 0.8fr 0.8fr 0.7fr",
            padding: "9px 12px", alignItems: "center",
            background: i % 2 === 0 ? "#1D1F24" : "#1A1B1F",
            borderTop: "1px solid #2A2D34",
          }}>
            <span style={{ fontSize: 12, color: "#F2F3F5", fontWeight: 500 }}>{r.metric}</span>
            <span style={{ fontSize: 12, color: "#A0A7B5" }}>{r.before}</span>
            <span style={{ fontSize: 12, color: "#3FB97F", fontWeight: 600 }}>{r.after}</span>
            <span style={{ fontSize: 12, color: "#3FB97F", fontWeight: 700, textAlign: "right" as const }}>+{r.improvement}%</span>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", background: "#1D1F24", border: "1px solid #2A2D34", borderRadius: 7,
      }}>
        <span style={{ fontSize: 11.5, color: "#A0A7B5", fontWeight: 600 }}>Overall improvement score</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#3FB97F" }}>{overallScore}%</span>
      </div>
    </Section>
  );
}
