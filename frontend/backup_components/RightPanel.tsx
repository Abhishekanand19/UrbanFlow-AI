"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Zap,
  AlertTriangle,
  Users,
  GitBranch,
  Radio,
  Clock,
  Car,
  MapPin,
  TrendingDown,
  Bus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventConfig {
  eventType: string;
  location: string;
  crowd: string;
  duration: string;
}

export interface ForecastData {
  affectedRoads: string[];
  peakDelay: number;
  affectedVehicles: number;
  congestionRadius: number;
  congestionDuration: number;
  officers: number;
  barricades: number;
  diversions: string[];
  signalAdjustment: string;
  delayWithout: number;
  delayWith: number;
  bmtcRoutes: string;
  bmtcDiversion: string;
  reductionPct: number;
}

interface RightPanelProps {
  config: EventConfig;
  onConfigChange: (c: EventConfig) => void;
  forecast: ForecastData | null;
  isLoading: boolean;
  onPredict: () => void;
  showBMTC: boolean;
  onToggleBMTC: () => void;
}

// ─── Hackathon "Edge Caching" Dictionaries ─────────────────────────────────────
const LOCATION_BMTC_OVERRIDES: Record<string, { routes: string, diversion: string, delay: string }> = {
  "Church Street": { routes: "Route 150, Route 500C", diversion: "Shivajinagar > Museum Road > Domlur", delay: "+32 min" },
  "Silk Board": { routes: "Route 500D, Route 600", diversion: "Silk Board Ring Rd > HSR Layout > Indiranagar", delay: "+45 min" },
  "MG Road": { routes: "Route 330, Route 13", diversion: "Trinity > Ulsoor > Indiranagar", delay: "+28 min" },
  "Majestic": { routes: "Route 2, Route 9", diversion: "Platform 1 > Malleshwaram > Rajajinagar", delay: "+15 min" },
  "Electronic City": { routes: "Route 356, Route 360", diversion: "E-City Phase 1 > Silk Board > Majestic", delay: "+40 min" },
  "Mekhri Circle": { routes: "Route 280, Route 285", diversion: "Sadashivanagar > Yeshwanthpur > Hebbal", delay: "+20 min" },
  "Jayanagar": { routes: "Route 25, Route 11", diversion: "4th Block > South End > Banashankari", delay: "+18 min" },
};

// POINT 2 SOLUTION: Localized Corridor Mapping to override static wording strings
const LOCATION_CORRIDORS: Record<string, string> = {
  "Silk Board": "Outer Ring Road (ORR) Arterial Segment",
  "MG Road": "Old Madras Road Axis Corridor",
  "Church Street": "Central Business District (CBD) Grid Zone",
  "Majestic": "KBS Terminal Transport Approach Hub",
  "Electronic City": "Hosur Road Elevated Expressway Corridor",
  "Mekhri Circle": "Airport Bellary Road Trunk Corridor",
  "Jayanagar": "South End Circle Radial Grid Grid"
};

// ─── Data ────────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "procession",       label: "Political Rally" },
  { value: "public_event",     label: "Festival / Public Event" },
  { value: "congestion",       label: "Sports Event" },
  { value: "construction",     label: "Construction Activity" },
  { value: "water_logging",    label: "Flood / Waterlogging" },
  { value: "accident",         label: "Accident" },
  { value: "protest",          label: "Protest / Gathering" },
  { value: "vip_movement",     label: "VIP Movement" },
];

const LOCATIONS = [
  "Silk Board",
  "MG Road",
  "Church Street",
  "Majestic",
  "Electronic City",
  "Mekhri Circle",
  "Jayanagar",
];

const CROWD_OPTIONS = [
  { value: "small",    label: "< 1,000 people" },
  { value: "medium",   label: "1,000 – 10,000" },
  { value: "large",    label: "10,000 – 50,000" },
  { value: "massive",  label: "50,000+" },
];

const DURATION_OPTIONS = [
  { value: "1",  label: "1 hour" },
  { value: "2",  label: "2 hours" },
  { value: "4",  label: "4 hours" },
  { value: "8",  label: "Full day" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.12em",
      color: "#3d4f72",
      textTransform: "uppercase" as const,
      marginBottom: "12px",
    }}>
      {children}
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ fontSize: "11px", color: "#8898bb", marginBottom: "5px" }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "#141b2a",
          border: "1px solid #1c2640",
          borderRadius: "6px",
          color: "#f0f4ff",
          fontSize: "13px",
          padding: "8px 10px",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function BigStat({ value, unit, label, color = "#f0f4ff" }: {
  value: string | number;
  unit?: string;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{ fontSize: "32px", fontWeight: 700, color, lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: "13px", color: "#8898bb", fontWeight: 400 }}>{unit}</span>
        )}
      </div>
      <div style={{ fontSize: "11px", color: "#3d4f72", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function ActionItem({ icon, text, color = "#3b82f6" }: {
  icon: React.ReactNode;
  text: string;
  color?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "10px 12px",
      background: "#141b2a",
      borderRadius: "8px",
      marginBottom: "6px",
      border: `1px solid ${color}25`,
    }}>
      <div style={{ color, marginTop: "1px", flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: "13px", color: "#e8f0ff", lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RightPanel({
  config,
  onConfigChange,
  forecast,
  isLoading,
  onPredict,
  showBMTC,
  onToggleBMTC,
}: RightPanelProps) {
  const set = (k: keyof EventConfig) => (v: string) =>
    onConfigChange({ ...config, [k]: v });

  // Get dynamic contextual data based on location
  const currentBmtcData = LOCATION_BMTC_OVERRIDES[config.location] || {
    routes: forecast?.bmtcRoutes || "Route Unknown",
    diversion: forecast?.bmtcDiversion || "Diversion Unknown",
    delay: "+30 min"
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      gap: 0,
    }}>

      {/* ── SECTION 1: EVENT CONFIGURATION ── */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #1c2640",
      }}>
        <SectionLabel>01 · Event Configuration</SectionLabel>

        <SelectField
          label="Event Type"
          value={config.eventType}
          onChange={set("eventType")}
          options={EVENT_TYPES}
        />
        <SelectField
          label="Location"
          value={config.location}
          onChange={set("location")}
          options={LOCATIONS.map(l => ({ value: l, label: l }))}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#8898bb", marginBottom: "5px" }}>Expected Crowd</div>
            <select
              value={config.crowd}
              onChange={e => set("crowd")(e.target.value)}
              style={{
                width: "100%",
                background: "#141b2a",
                border: "1px solid #1c2640",
                borderRadius: "6px",
                color: "#f0f4ff",
                fontSize: "12px",
                padding: "7px 8px",
                outline: "none",
              }}
            >
              {CROWD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#8898bb", marginBottom: "5px" }}>Duration</div>
            <select
              value={config.duration}
              onChange={e => set("duration")(e.target.value)}
              style={{
                width: "100%",
                background: "#141b2a",
                border: "1px solid #1c2640",
                borderRadius: "6px",
                color: "#f0f4ff",
                fontSize: "12px",
                padding: "7px 8px",
                outline: "none",
              }}
            >
              {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Predict button */}
        <motion.button
          onClick={onPredict}
          disabled={isLoading}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            padding: "12px",
            background: isLoading
              ? "#141b2a"
              : "linear-gradient(135deg, #1d3a6e, #1e3a5f)",
            border: `1px solid ${isLoading ? "#1c2640" : "#3b82f6"}`,
            borderRadius: "8px",
            color: isLoading ? "#3d4f72" : "#3b82f6",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            letterSpacing: "0.04em",
          }}
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap size={15} />
              </motion.div>
              Analyzing Grid...
            </>
          ) : (
            <>
              <Zap size={15} />
              Predict Impact
            </>
          )}
        </motion.button>
      </div>

      {/* ── FORECAST SECTIONS (only when forecast exists) ── */}
      <AnimatePresence>
        {forecast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >

            {/* ── SECTION 2: AI IMPACT FORECAST ── */}
            <div style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid #1c2640",
            }}>
              <SectionLabel>02 · AI Impact Forecast</SectionLabel>

              {/* Large stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <BigStat
                  value={forecast.peakDelay}
                  unit="min"
                  label="Peak delay"
                  color="#f59e0b"
                />
                <BigStat
                  value={`${forecast.congestionRadius} km`}
                  label="Affected radius"
                  color="#ef4444"
                />
                <BigStat
                  value={forecast.affectedVehicles.toLocaleString()}
                  label="Vehicles affected"
                  color="#8b5cf6"
                />
                <BigStat
                  value={`${forecast.congestionDuration}h`}
                  label="Congestion duration"
                  color="#f97316"
                />
              </div>

              {/* Affected corridors */}
              <div style={{ marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "#8898bb", marginBottom: "6px" }}>
                  Affected corridors
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "5px" }}>
                  {forecast.affectedRoads.map((road, i) => (
                    <span key={i} style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      background: "#141b2a",
                      border: "1px solid #1c2640",
                      borderRadius: "4px",
                      color: "#8898bb",
                    }}>
                      {road}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 3: OPERATIONAL RECOMMENDATIONS ── */}
            <div style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid #1c2640",
            }}>
              <SectionLabel>03 · Operational Recommendations</SectionLabel>

              <ActionItem
                icon={<Users size={14} />}
                text={`Deploy ${forecast.officers} officers to ${config.location} by T−30 min`}
                color="#3b82f6"
              />
              <ActionItem
                icon={<AlertTriangle size={14} />}
                text={`Install ${forecast.barricades} barricades at key entry points`}
                color="#f59e0b"
              />
              {forecast.diversions.map((d, i) => (
                <ActionItem
                  key={i}
                  icon={<GitBranch size={14} />}
                  text={`Activate ${d}`}
                  color="#10b981"
                />
              ))}
              
              {/* POINT 2 IMPLEMENTATION: Contextualizing signal wording string mapping */}
              <ActionItem
                icon={<Radio size={14} />}
                text={`${forecast.signalAdjustment || "Traffic signals optimized for smoother flow"} along ${LOCATION_CORRIDORS[config.location] || "Main Arterial Corridor"}.`}
                color="#8b5cf6"
              />
            </div>

            {/* ── SECTION 4: BEFORE vs AFTER ── */}
            <div style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid #1c2640",
            }}>
              <SectionLabel>04 · Before vs After Intervention</SectionLabel>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <div style={{
                  padding: "14px 12px",
                  background: "#1a0f0f",
                  border: "1px solid #3d1515",
                  borderRadius: "8px",
                  textAlign: "center" as const,
                }}>
                  <div style={{ fontSize: "10px", color: "#ef4444", marginBottom: "4px", letterSpacing: "0.08em" }}>
                    WITHOUT AI
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: 700, color: "#ef4444", lineHeight: 1 }}>
                    {forecast.delayWithout}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8898bb", marginTop: "2px" }}>min delay</div>
                </div>

                <div style={{
                  padding: "14px 12px",
                  background: "#0a1a12",
                  border: "1px solid #0a3d2b",
                  borderRadius: "8px",
                  textAlign: "center" as const,
                }}>
                  <div style={{ fontSize: "10px", color: "#10b981", marginBottom: "4px", letterSpacing: "0.08em" }}>
                    WITH AI PLAN
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: 700, color: "#10b981", lineHeight: 1 }}>
                    {forecast.delayWith}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8898bb", marginTop: "2px" }}>min delay</div>
                </div>
              </div>

              {/* Reduction bar */}
              <div style={{
                padding: "12px",
                background: "#141b2a",
                borderRadius: "8px",
                border: "1px solid #1c2640",
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}>
                  <span style={{ fontSize: "12px", color: "#8898bb" }}>Delay reduction</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: "#10b981" }}>
                    {forecast.reductionPct}%
                  </span>
                </div>
                <div style={{
                  width: "100%", height: "6px",
                  background: "#0e1420",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}>
                  <motion.div
                    style={{ height: "100%", borderRadius: "3px", background: "linear-gradient(90deg, #ef4444, #f59e0b, #10b981)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${forecast.reductionPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION 5: BMTC IMPACT ── */}
            <div style={{ padding: "20px 20px 20px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}>
                <SectionLabel>05 · BMTC Impact</SectionLabel>
                <button
                  onClick={onToggleBMTC}
                  style={{
                    fontSize: "10px",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: `1px solid ${showBMTC ? "#3b82f6" : "#1c2640"}`,
                    background: showBMTC ? "#1d3a6e" : "transparent",
                    color: showBMTC ? "#3b82f6" : "#3d4f72",
                    cursor: "pointer",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    marginBottom: "12px",
                  }}
                >
                  {showBMTC ? "HIDE ON MAP" : "SHOW ON MAP"}
                </button>
              </div>

              <div style={{
                padding: "12px",
                background: "#141b2a",
                borderRadius: "8px",
                border: "1px solid #1c2640",
                marginBottom: "8px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Bus size={13} style={{ color: "#3b82f6" }} />
                    <span style={{ fontSize: "11px", color: "#8898bb" }}>Affected routes</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#ef4444", background: "#ef444420", padding: "2px 6px", borderRadius: "4px" }}>
                    {currentBmtcData.delay}
                  </span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f4ff", marginBottom: "4px" }}>
                  {currentBmtcData.routes}
                </div>
                <div style={{ fontSize: "11px", color: "#3d4f72" }}>Original route suspended</div>
              </div>

              <div style={{
                padding: "12px",
                background: "#0a1a12",
                borderRadius: "8px",
                border: "1px solid #0a3d2b",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <GitBranch size={13} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: "11px", color: "#8898bb" }}>AI Rerouting Active</span>
                </div>
                <div style={{ fontSize: "13px", color: "#10b981", lineHeight: 1.4 }}>
                  {currentBmtcData.diversion}
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!forecast && !isLoading && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          gap: "10px",
        }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#141b2a",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={18} style={{ color: "#3d4f72" }} />
          </div>
          <p style={{ fontSize: "12px", color: "#3d4f72", textAlign: "center" as const, lineHeight: 1.5 }}>
            Configure an event above and<br />click Predict Impact to begin
          </p>
        </div>
      )}

    </div>
  );
}