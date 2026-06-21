"use client";
import { useState, useMemo } from "react";
import { Sliders } from "lucide-react";
import { ForecastResult, simulateScenario, ScenarioInput } from "@/lib/engine";

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 13 }}>
      <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.09em" }}>{num}</span>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F2F3F5", letterSpacing: "-0.01em" }}>{title}</h2>
    </div>
  );
}

function SliderField({
  label, value, min, max, onChange, color = "#4A90FF",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: "#A0A7B5" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

export function ScenarioSimulatorSection({ forecast }: { forecast: ForecastResult }) {
  const [officers, setOfficers] = useState(forecast.officersRequired);
  const [barricades, setBarricades] = useState(forecast.barricadesRequired);
  const [towTrucks, setTowTrucks] = useState(forecast.towTrucksRequired);

  const input: ScenarioInput = { officers, barricades, towTrucks };
  const result = useMemo(() => simulateScenario(forecast, input), [forecast, officers, barricades, towTrucks]);

  return (
    <div style={{ padding: "16px 20px", borderTop: "1px solid #2A2D34" }}>
      <SectionHeader num="08" title="Scenario Simulator" />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <Sliders size={11} style={{ color: "#747B88" }} />
        <span style={{ fontSize: 10.5, color: "#747B88" }}>Adjust resources to see projected outcome</span>
      </div>

      <SliderField label="Officers deployed" value={officers} min={2} max={60} onChange={setOfficers} color="#4A90FF" />
      <SliderField label="Barricades installed" value={barricades} min={1} max={30} onChange={setBarricades} color="#FFB020" />
      <SliderField label="Tow trucks available" value={towTrucks} min={0} max={8} onChange={setTowTrucks} color="#FF8A3D" />

      <div style={{
        marginTop: 14, padding: "12px 13px", background: "#1D1F24",
        border: "1px solid #2A2D34", borderRadius: 7,
      }}>
        <div style={{ fontSize: 10, color: "#747B88", marginBottom: 11, fontWeight: 600, letterSpacing: "0.03em" }}>
          PROJECTED OUTCOME
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 11 }}>
          <MiniMetric value={`${result.congestionPct}%`} label="Congestion" />
          <MiniMetric value={`${result.delayMin}m`} label="Delay" />
          <MiniMetric value={`${result.avgSpeed}`} label="km/h avg" />
        </div>

        <div style={{ paddingTop: 10, borderTop: "1px solid #2A2D34" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, color: "#A0A7B5" }}>Overall effectiveness</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#3FB97F" }}>{result.improvementScore}</span>
          </div>
          <div style={{ width: "100%", height: 5, background: "#23262C", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${result.improvementScore}%`, height: "100%",
              background: "#3FB97F", borderRadius: 3, transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" as const }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#F2F3F5" }}>{value}</div>
      <div style={{ fontSize: 9.5, color: "#747B88", marginTop: 2 }}>{label}</div>
    </div>
  );
}
