"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { CommandMap, CommandMapHandle, MapLayerVisibility } from "@/components/CommandMap";
import { MapLegend, DeploymentPopup, IncidentPopup, CameraPopup, LayerTogglePanel, ResetViewButton, LayerToggleState } from "@/components/MapOverlays";
import { EventCommandCenter } from "@/components/EventCommandCenter";
import {
  ImpactAnalysisSection,
  OperationsPlanSection,
  TrafficControlSection,
  PublicTransportSection,
  EmergencyMobilitySection,
  BeforeAfterSection,
} from "@/components/IntelligencePanels";
import { ScenarioSimulatorSection } from "@/components/ScenarioSimulator";
import { ExportReportSection } from "@/components/ExportReport";
import { calculateForecast, EventConfig, ForecastResult, DeploymentZone, EVENT_TYPES } from "@/lib/engine";
import { buildMapIntelligence, IncidentMarker, CCTVCamera } from "@/lib/mapIntelligence";

export default function Home() {
  const [currentTime, setCurrentTime] = useState("");

  const [config, setConfig] = useState<EventConfig>({
    eventType: "procession",
    location: "Silk Board",
    crowd: "large",
    duration: "4",
    vipPresence: false,
    rainExpected: false,
  });

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);
  const [selectedZone, setSelectedZone] = useState<DeploymentZone | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentMarker | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null);

  // Issue 2 — layer toggle state
  const [layerVisibility, setLayerVisibility] = useState<LayerToggleState>({
    original: true,
    diversion: true,
    emergency: true,
    flood: true,
    impactZone: false, // hidden by default per Issue 3
  });

  const mapHandleRef = useRef<CommandMapHandle>(null);
  const animTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clock — hydration safe
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reset on config change
  useEffect(() => {
    setAnimationStage(0);
    setForecast(null);
    setSelectedZone(null);
    setSelectedIncident(null);
    setSelectedCamera(null);
    if (animTimerRef.current) clearInterval(animTimerRef.current);
  }, [config.location, config.eventType]);

  const handlePredict = useCallback(() => {
    setIsLoading(true);
    setAnimationStage(0);
    setForecast(null);
    setSelectedZone(null);
    setSelectedIncident(null);
    setSelectedCamera(null);
    if (animTimerRef.current) clearInterval(animTimerRef.current);

    setTimeout(() => {
      const result = calculateForecast(config);
      setForecast(result);
      setIsLoading(false);

      // FIX: Synchronize UI checkboxes with the newly generated map layers
      setLayerVisibility({
        original: true,
        diversion: true,
        impactZone: true,
        emergency: config.vipPresence, // Tie Emergency route visibility to VIP presence per requirements
        flood: config.rainExpected,    // Tie Flood Zone visibility to Rain condition
      });

      let stage = 1;
      setAnimationStage(1);
      animTimerRef.current = setInterval(() => {
        stage += 1;
        setAnimationStage(stage);
        if (stage >= 4 && animTimerRef.current) {
          clearInterval(animTimerRef.current);
        }
      }, 850);
    }, 600);
  }, [config]);

  // Map intelligence — derived from forecast + animation stage
  const intelligence = useMemo(() => {
    if (!forecast) return null;
    return buildMapIntelligence(config, forecast, animationStage);
  }, [forecast, config, animationStage]);

  const eventLabel = EVENT_TYPES.find(e => e.value === config.eventType)?.label || config.eventType;

  const handleDeploymentClick = useCallback((zone: DeploymentZone) => {
    setSelectedIncident(null);
    setSelectedCamera(null);
    setSelectedZone(zone);
  }, []);
  const handleIncidentClick = useCallback((inc: IncidentMarker) => {
    setSelectedZone(null);
    setSelectedCamera(null);
    setSelectedIncident(inc);
  }, []);
  const handleCameraClick = useCallback((cam: CCTVCamera) => {
    setSelectedZone(null);
    setSelectedIncident(null);
    setSelectedCamera(cam);
  }, []);

  const handleLayerToggle = useCallback((key: keyof LayerToggleState) => {
    setLayerVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleResetView = useCallback(() => {
    mapHandleRef.current?.resetView();
  }, []);

  return (
    <div style={{
      height: "100vh", width: "100vw",
      display: "flex", flexDirection: "column",
      overflow: "hidden", background: "var(--map-bg)",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid #1d2230",
        flexShrink: 0, background: "rgba(7,9,15,0.97)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB97F" }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "#747B88", fontFamily: "JetBrains Mono, monospace" }}>
              LIVE
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "#2A2D34" }} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.01em", color: "#F2F3F5" }}>
            UrbanFlow AI
          </span>
          <span style={{ fontSize: 11.5, color: "#747B88" }}>
            Traffic Disruption Command Center · Bengaluru
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#747B88", fontFamily: "JetBrains Mono, monospace" }}>
          {currentTime}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── Map (hero, 65%) ── */}
        <div style={{ flex: "0 0 65%", position: "relative", minHeight: 0 }}>
          <CommandMap
            ref={mapHandleRef}
            location={config.location}
            forecast={forecast}
            animationStage={animationStage}
            intelligence={intelligence}
            layerVisibility={layerVisibility}
            onMapReady={() => {}}
            onDeploymentClick={handleDeploymentClick}
            onIncidentClick={handleIncidentClick}
            onCameraClick={handleCameraClick}
          />
          <LayerTogglePanel layers={layerVisibility} onToggle={handleLayerToggle} />
          <MapLegend showVip={config.vipPresence} showFlood={config.rainExpected && animationStage > 0} />
          <ResetViewButton onClick={handleResetView} />

          <DeploymentPopup zone={selectedZone} onClose={() => setSelectedZone(null)} />
          <IncidentPopup incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
          <CameraPopup camera={selectedCamera} onClose={() => setSelectedCamera(null)} />

          {/* Scenario badge — recolored, doubles as stage indicator (compact, replaces old Deployment Status box) */}
          {forecast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "rgba(23,24,28,0.92)", border: "1px solid #2A2D34",
                borderRadius: 8, padding: "12px 14px", backdropFilter: "blur(10px)",
                zIndex: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ fontSize: 9.5, color: "#747B88", letterSpacing: "0.09em", marginBottom: 4 }}>
                ACTIVE SCENARIO
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#F2F3F5" }}>{config.location}</div>
              <div style={{ fontSize: 11, color: "#A0A7B5", marginBottom: 7 }}>{eventLabel}</div>

              {(config.vipPresence || config.rainExpected) && (
                <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
                  {config.vipPresence && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#B56DFF18", color: "#B56DFF", fontWeight: 600 }}>
                      VIP
                    </span>
                  )}
                  {config.rainExpected && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#4A90FF18", color: "#4A90FF", fontWeight: 600 }}>
                      RAIN
                    </span>
                  )}
                </div>
              )}

              {/* Stage progress — compact, inline, replaces standalone Deployment Status box */}
              <div style={{ display: "flex", gap: 4, marginBottom: 7 }}>
                {[1, 2, 3, 4].map(s => (
                  <div key={s} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: s <= animationStage ? "#FF4D4F" : "#2A2D34",
                    transition: "background 0.4s ease",
                  }} />
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 7, borderTop: "1px solid #2A2D34" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF4D4F" }} />
                <span style={{ fontSize: 11, color: "#FF8A8B", fontWeight: 600 }}>
                  {forecast.expectedDelayMin} min peak delay
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right panel (35%) — graphite/steel ── */}
        <div style={{
          flex: "0 0 35%", borderLeft: "1px solid #2A2D34",
          background: "#17181C", display: "flex", flexDirection: "column",
          minHeight: 0, overflow: "hidden",
        }}>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <EventCommandCenter
              config={config}
              onChange={setConfig}
              onPredict={handlePredict}
              isLoading={isLoading}
            />

            {forecast && (
              <>
                <ImpactAnalysisSection forecast={forecast} confidenceBreakdown={intelligence?.confidence} />
                <OperationsPlanSection forecast={forecast} />
                <TrafficControlSection forecast={forecast} />
                <PublicTransportSection forecast={forecast} />
                <EmergencyMobilitySection forecast={forecast} />
                <BeforeAfterSection forecast={forecast} />
                <ScenarioSimulatorSection forecast={forecast} />
                <ExportReportSection config={config} forecast={forecast} />
              </>
            )}

            {!forecast && !isLoading && (
              <div style={{ padding: "50px 20px", textAlign: "center" as const }}>
                <p style={{ fontSize: 12, color: "#747B88", lineHeight: 1.6 }}>
                  Configure the event above and click<br /><strong style={{ color: "#7FB0FF" }}>Predict Impact</strong> to generate the full operational plan.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}