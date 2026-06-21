"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Users,
  GitBranch,
  Shield,
  Loader2,
  Zap,
  TrendingDown,
  Leaf,
  Fuel,
} from "lucide-react";

interface Action {
  type: string;
  description: string;
  count?: number;
}

interface AIBrief {
  severity_level: string;
  actions: Action[];
  expected_delay_reduction_pct: number;
  estimated_delay_without_ai_mins: number;
  estimated_delay_with_ai_mins: number;
  vehicle_hours_saved: number;
  fuel_saved_liters: number;
  co2_saved_kg: number;
  economic_savings_lakhs: number;
  summary: string;
  source?: string;
}

interface AIActionBriefProps {
  brief: AIBrief | null;
  loading: boolean;
  selectedJunction: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  officer_deployment: <Users size={13} />,
  barricade: <AlertTriangle size={13} />,
  diversion: <GitBranch size={13} />,
  emergency_corridor: <Shield size={13} />,
};

const ACTION_COLORS: Record<string, string> = {
  officer_deployment: "#00d4ff",
  barricade: "#ffd700",
  diversion: "#a78bfa",
  emergency_corridor: "#00ff88",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff3b5c",
  HIGH: "#ff8c00",
  MODERATE: "#ffd700",
  LOW: "#00ff88",
};

export function AIActionBrief({ brief, loading, selectedJunction }: AIActionBriefProps) {
  if (loading) {
    return (
      <div className="panel p-4 h-full flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={22} style={{ color: "#00d4ff" }} />
        </motion.div>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: "#00d4ff" }}>
            AI ANALYZING DISRUPTION
          </p>
          <p className="text-xs mt-1" style={{ color: "#6b7a99" }}>
            Generating action brief...
          </p>
        </div>
        <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: "#1e2d4a" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00d4ff, #00ff88)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="panel p-4 h-full flex flex-col items-center justify-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#1e2d4a" }}
        >
          <Zap size={18} style={{ color: "#6b7a99" }} />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: "#6b7a99" }}>
            AI ACTION BRIEF
          </p>
          <p className="text-xs mt-1" style={{ color: "#3a4a66" }}>
            Click a junction on the map
          </p>
          <p className="text-xs" style={{ color: "#3a4a66" }}>
            to generate operational brief
          </p>
        </div>
      </div>
    );
  }

  const severityColor = SEVERITY_COLORS[brief.severity_level] || "#00d4ff";
  const reductionPct = brief.expected_delay_reduction_pct;

  return (
    <div className="panel p-3 h-full flex flex-col gap-2.5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                background: severityColor + "25",
                color: severityColor,
                border: `1px solid ${severityColor}50`,
              }}
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ● {brief.severity_level}
            </motion.div>
            {brief.source === "rules_engine" && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "#1e2d4a", color: "#6b7a99" }}
              >
                RULES
              </span>
            )}
            {brief.source === "gemini" && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "#a78bfa20", color: "#a78bfa" }}
              >
                GEMINI
              </span>
            )}
          </div>
          <h3
            className="text-xs font-bold truncate"
            style={{ color: "#e8f0fe" }}
            title={selectedJunction}
          >
            {selectedJunction}
          </h3>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold tracking-wider" style={{ color: "#6b7a99" }}>
          RECOMMENDED ACTIONS
        </p>
        <AnimatePresence>
          {brief.actions.map((action, i) => {
            const color = ACTION_COLORS[action.type] || "#6b7a99";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-2 p-2 rounded"
                style={{
                  background: color + "10",
                  border: `1px solid ${color}25`,
                }}
              >
                <div className="flex-shrink-0 mt-0.5" style={{ color }}>
                  {ACTION_ICONS[action.type] || <AlertTriangle size={13} />}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#c8d8f0" }}>
                  {action.description}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delay Reduction Bar */}
      <div
        className="p-2.5 rounded"
        style={{ background: "#00ff8808", border: "1px solid #00ff8825" }}
      >
        <div className="flex justify-between items-center text-xs mb-2">
          <span style={{ color: "#6b7a99" }}>Without AI</span>
          <span className="font-bold" style={{ color: "#ff3b5c" }}>
            {brief.estimated_delay_without_ai_mins} min delay
          </span>
        </div>
        <div className="flex justify-between items-center text-xs mb-2">
          <span style={{ color: "#6b7a99" }}>With AI</span>
          <span className="font-bold" style={{ color: "#00ff88" }}>
            {brief.estimated_delay_with_ai_mins} min delay
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "#1e2d4a" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00ff88, #00d4ff)" }}
            initial={{ width: "0%" }}
            animate={{ width: `${reductionPct}%` }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          />
        </div>
        <p
          className="text-center text-xs font-bold mt-1.5"
          style={{ color: "#00ff88" }}
        >
          <TrendingDown size={10} className="inline mr-1" />
          {reductionPct}% delay reduction
        </p>
      </div>

      {/* Savings Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          {
            icon: <Users size={10} />,
            label: "Vehicle-hrs saved",
            value: brief.vehicle_hours_saved,
            color: "#00d4ff",
          },
          {
            icon: <Fuel size={10} />,
            label: "Fuel saved (L)",
            value: brief.fuel_saved_liters,
            color: "#ffd700",
          },
          {
            icon: <Leaf size={10} />,
            label: "CO₂ saved (kg)",
            value: brief.co2_saved_kg,
            color: "#00ff88",
          },
          {
            icon: <TrendingDown size={10} />,
            label: "Savings (₹L)",
            value: brief.economic_savings_lakhs,
            color: "#a78bfa",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="panel-card p-2 text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: s.color }}>
              {s.icon}
            </div>
            <div className="text-sm font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-gray-500 leading-tight" style={{ fontSize: "9px" }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      {brief.summary && (
        <p
          className="text-xs leading-relaxed pt-2"
          style={{
            color: "#6b7a99",
            borderTop: "1px solid #1e2d4a",
          }}
        >
          {brief.summary}
        </p>
      )}
    </div>
  );
}