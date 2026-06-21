"use client";
import { motion } from "framer-motion";
import { Shield, Clock, BarChart2, TrendingUp, AlertCircle } from "lucide-react";

interface KPIBarProps {
  riskScore: number;
  peakDelay: number;
  confidence: number;
  economicImpact: number;
  activeIncident?: { cause: string; junction: string } | null;
}

export function KPIBar({ riskScore, peakDelay, confidence, economicImpact, activeIncident }: KPIBarProps) {
  const riskColor = riskScore > 70 ? "#ff3b5c" : riskScore > 40 ? "#ff8c00" : "#00ff88";

  const kpis = [
    { icon: <Shield size={16} />, label: "Risk Score", value: `${riskScore}/100`, color: riskColor, sub: riskScore > 70 ? "CRITICAL" : riskScore > 40 ? "HIGH" : "MODERATE" },
    { icon: <Clock size={16} />, label: "Peak Delay", value: `${peakDelay} mins`, color: "#00d4ff", sub: "Without intervention" },
    { icon: <BarChart2 size={16} />, label: "Confidence", value: `${confidence}%`, color: "#00ff88", sub: "Model accuracy" },
    { icon: <TrendingUp size={16} />, label: "Economic Cost", value: `₹${economicImpact} Cr`, color: "#ffd700", sub: "Estimated impact" },
  ];

  return (
    <div className="px-3 pt-1 pb-2 space-y-2">
      {/* Active Incident Banner */}
      {activeIncident && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-3 px-3 py-1.5 rounded"
          style={{ background: "#ff3b5c15", border: "1px solid #ff3b5c40" }}
        >
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <AlertCircle size={14} style={{ color: "#ff3b5c" }} />
          </motion.div>
          <span className="text-xs font-bold" style={{ color: "#ff3b5c" }}>ACTIVE INCIDENT</span>
          <span className="text-xs text-gray-300 capitalize">{activeIncident.cause.replace("_", " ")}</span>
          <span className="text-gray-500 text-xs">·</span>
          <span className="text-xs text-gray-300">{activeIncident.junction}</span>
          <span className="text-gray-500 text-xs">·</span>
          <span className="text-xs" style={{ color: "#ff3b5c" }}>Risk: CRITICAL</span>
          <span className="ml-auto text-xs text-gray-500">Predicted Delay: {peakDelay} min</span>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="panel px-3 py-2 flex items-center gap-2"
            style={{ borderColor: kpi.color + "40" }}
          >
            <div style={{ color: kpi.color }}>{kpi.icon}</div>
            <div>
              <div className="text-xs text-gray-400">{kpi.label}</div>
              <div className="text-lg font-bold leading-tight" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}