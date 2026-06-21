"use client";
import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Real Bengaluru road network segments keyed by area
// Each entry: [lng, lat] pairs forming a road polyline
const ROAD_NETWORK: Record<string, [number, number][][]> = {
  "Silk Board": [
    [[77.6227, 12.9175], [77.6280, 12.9210], [77.6350, 12.9240]],   // Hosur Road north
    [[77.6227, 12.9175], [77.6180, 12.9140], [77.6100, 12.9100]],   // Hosur Road south
    [[77.6227, 12.9175], [77.6150, 12.9200], [77.6050, 12.9230]],   // Inner Ring Road west
    [[77.6227, 12.9175], [77.6300, 12.9160], [77.6400, 12.9150]],   // Inner Ring Road east
    [[77.6227, 12.9175], [77.6210, 12.9100], [77.6190, 12.9020]],   // BTM connector
  ],
  "MG Road": [
    [[77.6101, 12.9758], [77.6050, 12.9758], [77.5980, 12.9758]],   // MG Road west
    [[77.6101, 12.9758], [77.6160, 12.9758], [77.6230, 12.9758]],   // MG Road east
    [[77.6101, 12.9758], [77.6101, 12.9810], [77.6101, 12.9870]],   // Brigade Road
    [[77.6101, 12.9758], [77.6050, 12.9700], [77.6000, 12.9650]],   // Residency Road
    [[77.6101, 12.9758], [77.6160, 12.9700], [77.6200, 12.9640]],   // Richmond Road
  ],
  "Church Street": [
    [[77.6070, 12.9740], [77.6040, 12.9770], [77.6010, 12.9800]],   // Church Street
    [[77.6070, 12.9740], [77.6100, 12.9760], [77.6140, 12.9780]],   // Brigade Road
    [[77.6070, 12.9740], [77.6030, 12.9710], [77.5990, 12.9680]],   // Residency
    [[77.6070, 12.9740], [77.6110, 12.9710], [77.6150, 12.9680]],   // Museum Road
    [[77.6070, 12.9740], [77.6070, 12.9800], [77.6070, 12.9860]],   // St Mark's
  ],
  "Majestic": [
    [[77.5719, 12.9777], [77.5660, 12.9800], [77.5600, 12.9820]],   // Tumkur Road
    [[77.5719, 12.9777], [77.5780, 12.9760], [77.5850, 12.9740]],   // Seshadri Road
    [[77.5719, 12.9777], [77.5719, 12.9710], [77.5719, 12.9640]],   // South connector
    [[77.5719, 12.9777], [77.5680, 12.9740], [77.5640, 12.9700]],   // Mysore Road
    [[77.5719, 12.9777], [77.5760, 12.9810], [77.5800, 12.9840]],   // KR Road
  ],
  "Electronic City": [
    [[77.6761, 12.8399], [77.6800, 12.8450], [77.6850, 12.8500]],   // Hosur Road north
    [[77.6761, 12.8399], [77.6720, 12.8350], [77.6680, 12.8300]],   // Hosur Road south
    [[77.6761, 12.8399], [77.6700, 12.8420], [77.6620, 12.8440]],   // Service road west
    [[77.6761, 12.8399], [77.6820, 12.8380], [77.6900, 12.8360]],   // Phase 2 connector
  ],
  "Mekhri Circle": [
    [[77.5855, 13.0085], [77.5800, 13.0120], [77.5750, 13.0160]],   // Bellary Road north
    [[77.5855, 13.0085], [77.5910, 13.0050], [77.5960, 13.0010]],   // Bellary Road south
    [[77.5855, 13.0085], [77.5790, 13.0060], [77.5720, 13.0030]],   // Sankey Road
    [[77.5855, 13.0085], [77.5920, 13.0110], [77.5990, 13.0130]],   // Jayamahal
    [[77.5855, 13.0085], [77.5855, 13.0020], [77.5855, 12.9950]],   // Palace Road
  ],
  "Jayanagar": [
    [[77.5832, 12.9299], [77.5770, 12.9320], [77.5700, 12.9340]],   // 11th Main
    [[77.5832, 12.9299], [77.5900, 12.9280], [77.5970, 12.9260]],   // 30th Cross
    [[77.5832, 12.9299], [77.5832, 12.9240], [77.5832, 12.9180]],   // South connector
    [[77.5832, 12.9299], [77.5832, 12.9360], [77.5832, 12.9420]],   // North connector
    [[77.5832, 12.9299], [77.5760, 12.9270], [77.5690, 12.9240]],   // KP Road
  ],
};

// BMTC routes: array of [lng, lat]
const BMTC_ROUTES: Record<string, { name: string; coords: [number, number][]; diversion: [number, number][] }> = {
  "Silk Board": {
    name: "Routes 201, 210A, 500C",
    coords: [[77.5946, 12.9716], [77.6050, 12.9500], [77.6227, 12.9175]],
    diversion: [[77.5946, 12.9716], [77.5800, 12.9400], [77.5900, 12.9175]],
  },
  "MG Road": {
    name: "Routes 150, 150E, 500K",
    coords: [[77.5719, 12.9777], [77.5900, 12.9758], [77.6101, 12.9758]],
    diversion: [[77.5719, 12.9777], [77.5900, 12.9900], [77.6101, 12.9758]],
  },
  "Majestic": {
    name: "Routes 365J, 400, 401",
    coords: [[77.5500, 12.9900], [77.5719, 12.9777], [77.5900, 12.9700]],
    diversion: [[77.5500, 12.9900], [77.5600, 12.9650], [77.5900, 12.9700]],
  },
  "default": {
    name: "Routes 201, 335E",
    coords: [[77.5719, 12.9777], [77.5946, 12.9716], [77.6227, 12.9175]],
    diversion: [[77.5719, 12.9777], [77.5800, 12.9600], [77.6227, 12.9175]],
  },
};

// Congestion spread stages per event type
const SPREAD_PROFILE: Record<string, { stages: number; radius: number; roadCount: number }> = {
  accident:         { stages: 3, radius: 0.8, roadCount: 2 },
  construction:     { stages: 4, radius: 1.2, roadCount: 3 },
  water_logging:    { stages: 5, radius: 2.0, roadCount: 5 },
  procession:       { stages: 4, radius: 1.8, roadCount: 4 },
  public_event:     { stages: 4, radius: 1.5, roadCount: 4 },
  vehicle_breakdown:{ stages: 2, radius: 0.5, roadCount: 1 },
  congestion:       { stages: 5, radius: 2.2, roadCount: 5 },
  protest:          { stages: 5, radius: 2.0, roadCount: 5 },
  pot_holes:        { stages: 2, radius: 0.6, roadCount: 2 },
  tree_fall:        { stages: 3, radius: 0.7, roadCount: 2 },
  vip_movement:     { stages: 3, radius: 1.5, roadCount: 3 },
  others:           { stages: 3, radius: 1.0, roadCount: 2 },
};

const CONGESTION_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

interface PropagationState {
  locationKey: string;
  eventType: string;
  stage: number;
  maxStages: number;
}

interface MapPanelProps {
  selectedLocation: string;
  selectedEvent: string;
  isAnimating: boolean;
  animationStage: number; // 0 = idle, 1-4 = spreading
  showBMTC: boolean;
  onMapReady: () => void;
}

export function MapPanel({
  selectedLocation,
  selectedEvent,
  isAnimating,
  animationStage,
  showBMTC,
  onMapReady,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const animFrameRef = useRef<NodeJS.Timeout | null>(null);

  // Find center coords for location
  const getLocationCoords = useCallback((loc: string): [number, number] => {
    const coords: Record<string, [number, number]> = {
      "Silk Board":      [77.6227, 12.9175],
      "MG Road":         [77.6101, 12.9758],
      "Church Street":   [77.6070, 12.9740],
      "Majestic":        [77.5719, 12.9777],
      "Electronic City": [77.6761, 12.8399],
      "Mekhri Circle":   [77.5855, 13.0085],
      "Jayanagar":       [77.5832, 12.9299],
    };
    return coords[loc] || [77.5946, 12.9716];
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [77.5946, 12.9716],
      zoom: 12,
      pitch: 40,
      bearing: -10,
      antialias: true,
    });

    mapRef.current.on("load", () => {
      mapLoadedRef.current = true;

      // 3D buildings
      mapRef.current!.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": "#0e1420",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.85,
        },
      });

      // Road congestion source — will be updated on animation
      mapRef.current!.addSource("congestion-roads", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Road glow (wide blurred)
      mapRef.current!.addLayer({
        id: "road-glow",
        type: "line",
        source: "congestion-roads",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 18,
          "line-opacity": 0.18,
          "line-blur": 10,
        },
      });

      // Road main line
      mapRef.current!.addLayer({
        id: "road-line",
        type: "line",
        source: "congestion-roads",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 7],
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      // Road pulse (animated dashes over the line)
      mapRef.current!.addLayer({
        id: "road-pulse",
        type: "line",
        source: "congestion-roads",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2,
          "line-opacity": 0.3,
          "line-dasharray": [2, 6],
        },
        layout: {
          "line-cap": "round",
        },
      });

      // BMTC original route
      mapRef.current!.addSource("bmtc-original", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapRef.current!.addLayer({
        id: "bmtc-original-line",
        type: "line",
        source: "bmtc-original",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-opacity": 0.7,
          "line-dasharray": [3, 2],
        },
      });

      // BMTC diversion route
      mapRef.current!.addSource("bmtc-diversion", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapRef.current!.addLayer({
        id: "bmtc-diversion-line",
        type: "line",
        source: "bmtc-diversion",
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
          "line-opacity": 0.9,
          "line-dasharray": [2, 1],
        },
      });

      onMapReady();
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, []);

  // Handle location + animation stage changes
  useEffect(() => {
    if (!mapLoadedRef.current || !mapRef.current) return;

    const center = getLocationCoords(selectedLocation);

    // Fly to location
    mapRef.current.flyTo({
      center,
      zoom: 13.5,
      pitch: 45,
      bearing: -15,
      duration: 1800,
      essential: true,
    });

    // Drop epicenter marker
    if (markerRef.current) markerRef.current.remove();

    const el = document.createElement("div");
    el.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 0 4px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.6);
      border: 2px solid #fff;
      animation: pulse-glow 1.5s ease infinite;
    `;
    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(center)
      .addTo(mapRef.current);

    // Clear roads if stage 0
    if (animationStage === 0) {
      const source = mapRef.current.getSource("congestion-roads") as mapboxgl.GeoJSONSource;
      if (source) source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Build road features for current stage
    const roads = ROAD_NETWORK[selectedLocation] || ROAD_NETWORK["Silk Board"];
    const profile = SPREAD_PROFILE[selectedEvent] || SPREAD_PROFILE["others"];
    const stageRatio = animationStage / 4; // 0.25 → 0.5 → 0.75 → 1.0
    const roadsToShow = Math.ceil(roads.length * Math.min(stageRatio * (profile.roadCount / roads.length) * 2, 1));
    const activeRoads = roads.slice(0, Math.max(1, roadsToShow));

    const features = activeRoads.map((coords, i) => {
      // Color gets more severe with each stage and road index
      const colorIndex = Math.min(
        Math.floor(animationStage * 0.8 + i * 0.3),
        CONGESTION_COLORS.length - 1
      );
      return {
        type: "Feature" as const,
        properties: {
          color: CONGESTION_COLORS[colorIndex],
          stage: animationStage,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
      };
    });

    const source = mapRef.current.getSource("congestion-roads") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: "FeatureCollection", features });
    }
  }, [selectedLocation, selectedEvent, animationStage, getLocationCoords]);

  // Handle BMTC overlay
  useEffect(() => {
    if (!mapLoadedRef.current || !mapRef.current) return;

    const bmtc = BMTC_ROUTES[selectedLocation] || BMTC_ROUTES["default"];

    const origSource = mapRef.current.getSource("bmtc-original") as mapboxgl.GeoJSONSource;
    const divSource = mapRef.current.getSource("bmtc-diversion") as mapboxgl.GeoJSONSource;

    if (showBMTC && origSource && divSource) {
      origSource.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: bmtc.coords },
        }],
      });
      divSource.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: bmtc.diversion },
        }],
      });
    } else {
      origSource?.setData({ type: "FeatureCollection", features: [] });
      divSource?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [showBMTC, selectedLocation]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Stage label overlay */}
      {animationStage > 0 && (
        <div style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          background: "rgba(8,12,20,0.85)",
          border: "1px solid #1c2640",
          borderRadius: "8px",
          padding: "10px 14px",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}>
          <div style={{ fontSize: "10px", color: "#8898bb", letterSpacing: "0.1em", marginBottom: "4px" }}>
            CONGESTION SPREAD
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{
                width: "28px",
                height: "4px",
                borderRadius: "2px",
                background: s <= animationStage ? CONGESTION_COLORS[s-1] : "#1c2640",
                transition: "background 0.5s ease",
                boxShadow: s <= animationStage ? `0 0 6px ${CONGESTION_COLORS[s-1]}` : "none",
              }} />
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "#f0f4ff", marginTop: "4px" }}>
            T+{animationStage * 10} min · {
              animationStage === 1 ? "Origin affected" :
              animationStage === 2 ? "Nearby roads congested" :
              animationStage === 3 ? "Network spillback" :
              "Full corridor saturation"
            }
          </div>
        </div>
      )}

      {/* BMTC legend */}
      {showBMTC && (
        <div style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          background: "rgba(8,12,20,0.85)",
          border: "1px solid #1c2640",
          borderRadius: "8px",
          padding: "10px 14px",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}>
          <div style={{ fontSize: "10px", color: "#8898bb", letterSpacing: "0.1em", marginBottom: "6px" }}>
            BMTC ROUTES
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{ width: "24px", height: "2px", background: "#3b82f6", borderRadius: "1px" }} />
            <span style={{ fontSize: "11px", color: "#8898bb" }}>Original route</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "2px", background: "#10b981", borderRadius: "1px" }} />
            <span style={{ fontSize: "11px", color: "#10b981" }}>Diversion active</span>
          </div>
        </div>
      )}

      {/* No token warning */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0e1420", zIndex: 20, borderRadius: "12px",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#ef4444", marginBottom: "4px" }}>
              Mapbox token missing
            </div>
            <div style={{ fontSize: "11px", color: "#8898bb" }}>
              Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
