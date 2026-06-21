"use client";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { EventConfig, EVENT_TYPES, LOCATIONS } from "@/lib/engine";

const CROWD_OPTIONS = [
  { value: "small", label: "< 1,000" },
  { value: "medium", label: "1,000 – 10,000" },
  { value: "large", label: "10,000 – 50,000" },
  { value: "massive", label: "50,000+" },
];

const DURATION_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "4", label: "4 hours" },
  { value: "8", label: "Full day" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 10.5, color: "#747B88", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function StyledSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "#1D1F24",
        border: "1px solid #2A2D34",
        borderRadius: 6,
        color: "#F2F3F5",
        fontSize: 12.5,
        padding: "9px 11px",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({
  label, sublabel, checked, onChange, color = "#4A90FF",
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 11px",
        background: checked ? `${color}10` : "#1D1F24",
        border: `1px solid ${checked ? color + "45" : "#2A2D34"}`,
        borderRadius: 7, cursor: "pointer", marginBottom: 7,
        transition: "all 0.2s ease",
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: checked ? color : "#F2F3F5" }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "#747B88", marginTop: 1 }}>{sublabel}</div>
      </div>
      <div className="toggle" style={{ background: checked ? color : "#2A2D34" }}>
        <motion.div className="toggle-knob" animate={{ left: checked ? 18 : 2 }} transition={{ duration: 0.15 }} />
      </div>
    </div>
  );
}

interface EventCommandCenterProps {
  config: EventConfig;
  onChange: (c: EventConfig) => void;
  onPredict: () => void;
  isLoading: boolean;
}

export function EventCommandCenter({ config, onChange, onPredict, isLoading }: EventCommandCenterProps) {
  const set = <K extends keyof EventConfig>(k: K) => (v: EventConfig[K]) =>
    onChange({ ...config, [k]: v });

  return (
    <div style={{ padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 16 }}>
        <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.09em" }}>01</span>
        <h2 style={{ fontSize: 14.5, fontWeight: 700, color: "#F2F3F5", letterSpacing: "-0.01em" }}>
          Event Command Center
        </h2>
      </div>

      <Field label="Event Type">
        <StyledSelect value={config.eventType} onChange={set("eventType")} options={EVENT_TYPES} />
      </Field>

      <Field label="Event Location">
        <StyledSelect
          value={config.location}
          onChange={set("location")}
          options={LOCATIONS.map(l => ({ value: l, label: l }))}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <Field label="Expected Crowd">
          <StyledSelect value={config.crowd} onChange={set("crowd")} options={CROWD_OPTIONS} />
        </Field>
        <Field label="Duration">
          <StyledSelect value={config.duration} onChange={set("duration")} options={DURATION_OPTIONS} />
        </Field>
      </div>

      <div style={{ marginTop: 3, marginBottom: 15 }}>
        <Toggle
          label="VIP Presence"
          sublabel="Dignitary or high-profile attendee expected"
          checked={config.vipPresence}
          onChange={set("vipPresence")}
          color="#B56DFF"
        />
        <Toggle
          label="Rain Expected"
          sublabel="Weather forecast indicates rainfall"
          checked={config.rainExpected}
          onChange={set("rainExpected")}
          color="#4A90FF"
        />
      </div>

      <motion.button
        onClick={onPredict}
        disabled={isLoading}
        whileTap={{ scale: 0.98 }}
        style={{
          width: "100%", padding: "12px",
          background: isLoading ? "#1D1F24" : "#23262C",
          border: `1px solid ${isLoading ? "#2A2D34" : "#4A90FF"}`,
          borderRadius: 8,
          color: isLoading ? "#747B88" : "#7FB0FF",
          fontSize: 13, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: "0.02em",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {isLoading ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Zap size={15} />
            </motion.div>
            Analyzing Impact...
          </>
        ) : (
          <>
            <Zap size={15} />
            Predict Impact
          </>
        )}
      </motion.button>
    </div>
  );
}
