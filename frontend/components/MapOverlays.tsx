"use client";
import { motion, AnimatePresence } from "framer-motion";
import { DeploymentZone } from "@/lib/engine";
import { IncidentMarker, CCTVCamera } from "@/lib/mapIntelligence";
import type { MapLayerVisibility } from "@/components/CommandMap";

// --- HARMONIZED BUT DISTINCT COLOR PALETTE ---
const C = {
  severe: "#FF4D4F",
  diversion: "#FFB020",
  emergency: "#10FF8B", // CHANGED: High-Vis Neon Mint so it never clashes with Original Blue
  vip: "#B56DFF",
  normal: "#2563EB",    // Deeper, structural blue for base routes
};

// ─── Legend ───────────────────────────────────────────────────────────────

const ROAD_LEGEND = [
  { color: "#3FB97F", label: "Free" },
  { color: "#E8C547", label: "Moderate" },
  { color: "#FF8A3D", label: "Heavy" },
  { color: C.severe, label: "Severe" },
];

const ROUTE_LEGEND = [
  { color: C.normal, label: "Normal route" },
  { color: C.diversion, label: "Diversion" },
  { color: C.emergency, label: "Emergency" },
];

export function MapLegend({ showVip, showFlood }: { showVip: boolean; showFlood: boolean }) {
  return (
    <div style={{
      position: "absolute", bottom: 18, left: 18,
      background: "rgba(23,24,28,0.92)", border: "1px solid #2A2D34",
      borderRadius: 8, padding: "11px 13px", backdropFilter: "blur(10px)",
      zIndex: 10, maxWidth: 190, boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.09em", marginBottom: 6, fontWeight: 600 }}>
        CONGESTION
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 9, flexWrap: "wrap" as const }}>
        {ROAD_LEGEND.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 10, color: "#A0A7B5" }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.09em", marginBottom: 6, paddingTop: 8, borderTop: "1px solid #2A2D34", fontWeight: 600 }}>
        ROUTES
      </div>
      {ROUTE_LEGEND.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <div style={{ width: 14, height: 2.5, borderRadius: 2, background: item.color }} />
          <span style={{ fontSize: 10, color: "#A0A7B5" }}>{item.label}</span>
        </div>
      ))}
      {showVip && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          <div style={{ width: 14, height: 2.5, borderRadius: 2, background: C.vip }} />
          <span style={{ fontSize: 10, color: C.vip, fontWeight: 600 }}>VIP corridor</span>
        </div>
      )}
      {showFlood && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: C.normal, opacity: 0.5 }} />
          <span style={{ fontSize: 10, color: "#7FB0FF", fontWeight: 600 }}>Flood risk</span>
        </div>
      )}
    </div>
  );
}

// ─── Shared popup shell ───────────────────────────────────────────────────

function PopupShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: "rgba(23,24,28,0.98)", border: "1px solid #34373F", borderRadius: 10,
        padding: "18px 20px", backdropFilter: "blur(14px)", zIndex: 30, minWidth: 260,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 13, right: 15,
          background: "transparent", border: "none", color: "#747B88",
          fontSize: 17, cursor: "pointer", lineHeight: 1, padding: 0,
        }}
      >
        ×
      </button>
      {children}
    </motion.div>
  );
}

function PriorityBadge({ priority }: { priority: "High" | "Medium" | "Low" }) {
  const color = priority === "High" ? C.severe : priority === "Medium" ? C.diversion : C.normal;
  return (
    <div style={{
      display: "inline-block", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
      background: `${color}1a`, color, letterSpacing: "0.04em",
    }}>
      PRIORITY: {priority.toUpperCase()}
    </div>
  );
}

// ─── Deployment popup ─────────────────────────────────────────────────────

export function DeploymentPopup({ zone, onClose }: { zone: DeploymentZone | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {zone && (
        <PopupShell onClose={onClose}>
          <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.07em", marginBottom: 3 }}>DEPLOYMENT ZONE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F2F3F5", marginBottom: 12 }}>{zone.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.normal }}>{zone.officers}</div>
              <div style={{ fontSize: 10.5, color: "#A0A7B5" }}>Officers</div>
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.diversion }}>{zone.barricades}</div>
              <div style={{ fontSize: 10.5, color: "#A0A7B5" }}>Barricades</div>
            </div>
          </div>
          <PriorityBadge priority={zone.priority} />
          <div style={{ fontSize: 11.5, color: "#A0A7B5", lineHeight: 1.5, marginTop: 11 }}>
            <span style={{ color: "#747B88" }}>Reason: </span>{zone.reason}
          </div>
        </PopupShell>
      )}
    </AnimatePresence>
  );
}

// ─── Incident popup ───────────────────────────────────────────────────────

export function IncidentPopup({ incident, onClose }: { incident: IncidentMarker | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {incident && (
        <PopupShell onClose={onClose}>
          <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.07em", marginBottom: 3 }}>INCIDENT</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F2F3F5", marginBottom: 9 }}>{incident.name}</div>
          <div style={{ fontSize: 12.5, color: "#A0A7B5", lineHeight: 1.5, marginBottom: 11 }}>{incident.detail}</div>
          <div style={{ fontSize: 10.5, color: "#747B88" }}>Reported {incident.timestamp}</div>
        </PopupShell>
      )}
    </AnimatePresence>
  );
}

// ─── CCTV popup ───────────────────────────────────────────────────────────

const DENSITY_COLOR: Record<string, string> = { Low: "#3FB97F", Medium: "#FFB020", High: "#FF4D4F" };
const STATUS_COLOR: Record<string, string> = { Flowing: "#3FB97F", Congested: "#FFB020", Blocked: "#FF4D4F" };

export function CameraPopup({ camera, onClose }: { camera: CCTVCamera | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {camera && (
        <PopupShell onClose={onClose}>
          <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.07em", marginBottom: 3 }}>CCTV FEED</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F2F3F5", marginBottom: 11 }}>{camera.name}</div>
          <div style={{
            background: "#0c0d10", borderRadius: 7, border: "1px solid #2A2D34",
            padding: "18px 12px", textAlign: "center" as const, marginBottom: 11,
            fontSize: 10.5, color: "#747B88",
          }}>
            📷 Live feed simulated for demo
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "#A0A7B5", marginBottom: 2 }}>Vehicle density</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: DENSITY_COLOR[camera.vehicleDensity] }}>{camera.vehicleDensity}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "#A0A7B5", marginBottom: 2 }}>Crowd density</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: DENSITY_COLOR[camera.crowdDensity] }}>{camera.crowdDensity}</div>
            </div>
          </div>
          <div style={{
            display: "inline-block", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
            background: `${STATUS_COLOR[camera.status]}1a`, color: STATUS_COLOR[camera.status],
          }}>
            {camera.status.toUpperCase()}
          </div>
        </PopupShell>
      )}
    </AnimatePresence>
  );
}

// ─── Layer Toggle Panel ───────────────────────────────────────────

export type LayerToggleState = MapLayerVisibility;

const LAYER_ITEMS: { key: keyof LayerToggleState; label: string; color: string }[] = [
  { key: "original", label: "Original Routes", color: C.normal },
  { key: "diversion", label: "Diversion Routes", color: C.diversion },
  { key: "emergency", label: "Emergency Routes", color: C.emergency },
  { key: "flood", label: "Flood Zone", color: "#5FA8FF" },
  { key: "impactZone", label: "Impact Zone", color: "#FF78C8" },
];

export function LayerTogglePanel({
  layers,
  onToggle,
}: {
  layers: LayerToggleState;
  onToggle: (key: keyof LayerToggleState) => void;
}) {
  return (
    <div style={{
      position: "absolute", top: 16, left: 16,
      background: "rgba(23,24,28,0.92)", border: "1px solid #2A2D34",
      borderRadius: 8, padding: "10px 12px", backdropFilter: "blur(10px)",
      zIndex: 10, minWidth: 152, boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.09em", marginBottom: 8, fontWeight: 600 }}>
        MAP LAYERS
      </div>
      {LAYER_ITEMS.map(item => (
        <label
          key={item.key}
          onClick={() => onToggle(item.key)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 0", cursor: "pointer", userSelect: "none" as const,
          }}
        >
          <div style={{
            width: 13, height: 13, borderRadius: 3, flexShrink: 0,
            border: `1.3px solid ${layers[item.key] ? item.color : "#3a3e47"}`,
            background: layers[item.key] ? `${item.color}22` : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}>
            {layers[item.key] && (
              <div style={{ width: 7, height: 7, borderRadius: 1, background: item.color }} />
            )}
          </div>
          <span style={{
            fontSize: 11, color: layers[item.key] ? "#F2F3F5" : "#747B88",
            transition: "color 0.15s ease",
          }}>
            {item.label}
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── Reset View button ────────────────────────────────────────────

export function ResetViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute", bottom: 18, right: 18,
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(23,24,28,0.92)", border: "1px solid #2A2D34",
        borderRadius: 7, padding: "8px 13px", backdropFilter: "blur(10px)",
        zIndex: 10, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        fontSize: 11, color: "#A0A7B5", fontWeight: 600,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "#F2F3F5"; e.currentTarget.style.borderColor = "#3a3e47"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "#A0A7B5"; e.currentTarget.style.borderColor = "#2A2D34"; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
      Reset View
    </button>
  );
}