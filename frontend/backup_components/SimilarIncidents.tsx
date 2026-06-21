"use client";
import { motion } from "framer-motion";
import { Clock, MapPin, AlertCircle } from "lucide-react";

interface Incident {
  id: string;
  event_cause: string;
  junction: string;
  zone: string;
  risk_score: number;
  requires_road_closure: boolean;
  start_datetime: string;
  resolution_mins: number | null;
  priority: string;
}

const CAUSE_COLORS: Record<string, string> = {
  accident: "#ff3b5c",
  water_logging: "#00d4ff",
  construction: "#ff8c00",
  procession: "#ffd700",
  vehicle_breakdown: "#a78bfa",
  public_event: "#34d399",
  congestion: "#ff8c00",
  tree_fall: "#6ee7b7",
  pot_holes: "#94a3b8",
};

export function SimilarIncidents({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) return (
    <div className="panel p-4 h-full flex items-center justify-center">
      <p className="text-xs text-gray-500">Select a junction to see similar historical incidents</p>
    </div>
  );

  return (
    <div className="panel p-3 flex flex-col gap-2 h-full overflow-y-auto">
      <div>
        <h3 className="text-xs font-bold text-white tracking-wider">SIMILAR HISTORICAL CASES</h3>
        <p className="text-xs text-gray-500">Based on cause + location matching</p>
      </div>
      {incidents.map((inc, i) => {
        const color = CAUSE_COLORS[inc.event_cause] || "#6b7a99";
        return (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-2.5 rounded"
            style={{ background: "#111827", border: `1px solid ${color}30` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded capitalize"
                style={{ background: color + "20", color }}
              >
                {inc.event_cause.replace("_", " ")}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: inc.priority === "High" ? "#ff3b5c20" : "#6b7a9920",
                  color: inc.priority === "High" ? "#ff3b5c" : "#6b7a99",
                }}
              >
                {inc.priority}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <MapPin size={10} />
              <span className="truncate">{inc.junction !== "Unknown" ? inc.junction : inc.zone}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="text-center p-1 rounded" style={{ background: "#0d1224" }}>
                <div className="font-bold" style={{ color }}>{inc.risk_score}</div>
                <div className="text-gray-500" style={{ fontSize: "9px" }}>Risk</div>
              </div>
              <div className="text-center p-1 rounded" style={{ background: "#0d1224" }}>
                <div className="font-bold text-yellow-400">
                  {inc.requires_road_closure ? "Yes" : "No"}
                </div>
                <div className="text-gray-500" style={{ fontSize: "9px" }}>Closure</div>
              </div>
              <div className="text-center p-1 rounded" style={{ background: "#0d1224" }}>
                <div className="font-bold text-blue-400">
                  {inc.resolution_mins ? `${inc.resolution_mins}m` : "—"}
                </div>
                <div className="text-gray-500" style={{ fontSize: "9px" }}>Recovery</div>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Clock size={9} />
              <span>{inc.start_datetime}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}