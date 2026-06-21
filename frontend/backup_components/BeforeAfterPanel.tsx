"use client";
import { motion } from "framer-motion";
import { TrendingDown, Users, Fuel, Leaf, DollarSign } from "lucide-react";

interface BeforeAfterPanelProps {
  delayWithout: number;
  delayWith: number;
  vehicleHoursSaved: number;
  fuelSavedLiters: number;
  co2SavedKg: number;
  economicSavingsLakhs: number;
}

export function BeforeAfterPanel({
  delayWithout,
  delayWith,
  vehicleHoursSaved,
  fuelSavedLiters,
  co2SavedKg,
  economicSavingsLakhs,
}: BeforeAfterPanelProps) {
  const reductionPct =
    delayWithout > 0
      ? Math.round((1 - delayWith / delayWithout) * 100)
      : 0;

  return (
    <div className="panel p-3 flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-bold tracking-wider" style={{ color: "#e8f0fe" }}>
          BEFORE vs AFTER AI INTERVENTION
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>
          Estimated impact of activating response plan
        </p>
      </div>

      {/* Side-by-side delay comparison */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Without AI */}
        <div
          className="rounded p-2.5 text-center"
          style={{ background: "#ff3b5c10", border: "1px solid #ff3b5c30" }}
        >
          <p className="text-xs mb-1" style={{ color: "#ff3b5c" }}>
            WITHOUT AI
          </p>
          <motion.div
            className="text-3xl font-bold"
            style={{ color: "#ff3b5c" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {delayWithout}
          </motion.div>
          <p className="text-xs" style={{ color: "#6b7a99" }}>
            min delay
          </p>
        </div>

        {/* Arrow + reduction */}
        <div className="flex flex-col items-center gap-1">
          <TrendingDown size={20} style={{ color: "#00ff88" }} />
          <div
            className="text-lg font-bold"
            style={{ color: "#00ff88" }}
          >
            {reductionPct}%
          </div>
          <p className="text-xs text-center" style={{ color: "#6b7a99" }}>
            reduction
          </p>
        </div>

        {/* With AI */}
        <div
          className="rounded p-2.5 text-center"
          style={{ background: "#00ff8810", border: "1px solid #00ff8830" }}
        >
          <p className="text-xs mb-1" style={{ color: "#00ff88" }}>
            WITH AI
          </p>
          <motion.div
            className="text-3xl font-bold"
            style={{ color: "#00ff88" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {delayWith}
          </motion.div>
          <p className="text-xs" style={{ color: "#6b7a99" }}>
            min delay
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "#6b7a99" }}>
          <span>Delay reduction progress</span>
          <span style={{ color: "#00ff88" }}>{reductionPct}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: "#1e2d4a" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #ff3b5c, #ffd700, #00ff88)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${reductionPct}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Savings metrics */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          {
            icon: <Users size={12} />,
            label: "Vehicle-hrs",
            value: vehicleHoursSaved,
            unit: "saved",
            color: "#00d4ff",
          },
          {
            icon: <Fuel size={12} />,
            label: "Fuel (L)",
            value: fuelSavedLiters,
            unit: "saved",
            color: "#ffd700",
          },
          {
            icon: <Leaf size={12} />,
            label: "CO₂ (kg)",
            value: co2SavedKg,
            unit: "saved",
            color: "#00ff88",
          },
          {
            icon: <DollarSign size={12} />,
            label: "₹ Savings",
            value: `${economicSavingsLakhs}L`,
            unit: "",
            color: "#a78bfa",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="panel-card p-2 text-center"
          >
            <div className="mb-1" style={{ color: s.color }}>
              {s.icon}
            </div>
            <div className="text-sm font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div
              className="leading-tight"
              style={{ fontSize: "9px", color: "#6b7a99" }}
            >
              {s.label}
            </div>
            {s.unit && (
              <div style={{ fontSize: "9px", color: "#3a4a66" }}>{s.unit}</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}