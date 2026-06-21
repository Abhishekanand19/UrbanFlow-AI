"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Radio } from "lucide-react";

interface CascadeStep {
  time_offset_mins: number;
  junction: string;
  lat: number;
  lon: number;
  status: "red" | "orange" | "yellow" | "green";
  label: string;
  incident_count: number;
  hop?: number;
}

interface CascadeReplayProps {
  steps: CascadeStep[];
  activeIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  baseTime?: string;
}

const STATUS_COLORS: Record<string, string> = {
  red: "#ff3b5c",
  orange: "#ff8c00",
  yellow: "#ffd700",
  green: "#00ff88",
};

const STATUS_LABELS: Record<string, string> = {
  red: "CRITICAL",
  orange: "HIGH",
  yellow: "MODERATE",
  green: "STABLE",
};

function addMinutes(base: string, mins: number): string {
  const [time, period] = base.split(" ");
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + mins;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  const displayH = nh % 12 === 0 ? 12 : nh % 12;
  const displayPeriod = nh >= 12 ? "PM" : "AM";
  return `${displayH}:${nm.toString().padStart(2, "0")} ${displayPeriod}`;
}

export function CascadeReplay({
  steps,
  activeIndex,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  baseTime = "6:12 PM",
}: CascadeReplayProps) {
  const progress =
    steps.length > 0 ? ((activeIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="panel p-3 flex flex-col gap-2.5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Radio size={12} style={{ color: "#ff3b5c" }} />
            <h3
              className="text-xs font-bold tracking-wider"
              style={{ color: "#e8f0fe" }}
            >
              CASCADE FAILURE REPLAY
            </h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>
            Disruption propagation timeline
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onReset}
            className="p-1.5 rounded transition-colors hover:bg-gray-800"
            style={{ border: "1px solid #1e2d4a" }}
            title="Reset"
          >
            <RotateCcw size={12} style={{ color: "#6b7a99" }} />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-1.5 rounded transition-colors"
            style={{
              border: `1px solid ${isPlaying ? "#ff3b5c60" : "#00ff8860"}`,
              background: isPlaying ? "#ff3b5c15" : "#00ff8815",
            }}
            title={isPlaying ? "Pause" : "Play"}
            disabled={steps.length === 0}
          >
            {isPlaying ? (
              <Pause size={12} style={{ color: "#ff3b5c" }} />
            ) : (
              <Play size={12} style={{ color: "#00ff88" }} />
            )}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {steps.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-center" style={{ color: "#3a4a66" }}>
            Select a junction on the map
            <br />
            to see cascade propagation
          </p>
        </div>
      )}

      {/* Timeline */}
      {steps.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {steps.map((step, i) => {
            const isActive = i <= activeIndex;
            const isCurrent = i === activeIndex;
            const color = STATUS_COLORS[step.status];

            return (
              <AnimatePresence key={`${step.junction}-${i}`}>
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{
                    opacity: isActive ? 1 : 0.25,
                    x: 0,
                  }}
                  transition={{ duration: 0.35, delay: isActive ? 0 : 0 }}
                  className="flex gap-2.5 items-start py-2 px-2 rounded"
                  style={{
                    background: isCurrent ? color + "12" : "transparent",
                    border: isCurrent
                      ? `1px solid ${color}35`
                      : "1px solid transparent",
                  }}
                >
                  {/* Dot + line */}
                  <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        background: isActive ? color : "#1e2d4a",
                        boxShadow: isCurrent ? `0 0 8px ${color}` : "none",
                      }}
                      animate={
                        isCurrent
                          ? { scale: [1, 1.4, 1] }
                          : { scale: 1 }
                      }
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                    {i < steps.length - 1 && (
                      <div
                        className="w-px mt-1 flex-shrink-0"
                        style={{
                          height: "20px",
                          background: isActive
                            ? `linear-gradient(${color}, ${STATUS_COLORS[steps[i + 1]?.status] || color})`
                            : "#1e2d4a",
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className="text-xs font-mono"
                        style={{ color: isActive ? "#6b7a99" : "#2a3a55" }}
                      >
                        {addMinutes(baseTime, step.time_offset_mins)}
                      </span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: isActive ? color : "#2a3a55",
                          background: isActive ? color + "20" : "transparent",
                          fontSize: "9px",
                        }}
                      >
                        {STATUS_LABELS[step.status]}
                      </span>
                    </div>
                    <p
                      className="text-xs font-medium leading-tight"
                      style={{ color: isActive ? "#e8f0fe" : "#2a3a55" }}
                    >
                      {step.label}
                    </p>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: isActive ? "#4a5a77" : "#1a2540", fontSize: "10px" }}
                    >
                      {step.junction} · {step.incident_count} incidents
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {steps.length > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "#3a4a66" }}>
            <span>Propagation</span>
            <span>
              {activeIndex + 1}/{steps.length} nodes
            </span>
          </div>
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: "#1e2d4a" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #00ff88, #ffd700, #ff3b5c)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}