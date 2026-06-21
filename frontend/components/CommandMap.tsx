"use client";
import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import { LOCATION_CENTERS, ForecastResult, DeploymentZone, RoadGeometry } from "@/lib/engine";
import {
  MapIntelligence, RoadSegment, IncidentMarker, CCTVCamera, IncidentType,
} from "@/lib/mapIntelligence";
import { resolveRoadsToRealGeometry, resolveSingleRoad, isDirectionsAvailable } from "@/lib/directions";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ═══ Color hierarchy (Updated for better judge-friendly UX) ═══
const C = {
  normal: "#2563EB",     // Deeper structural blue for Original Route
  diversion: "#FFB020",  // Diversion Route
  emergency: "#10FF8B",  // CHANGED: High-Vis Neon Mint for Emergency Route
  vip: "#B56DFF",        // VIP Route
  severe: "#FF4D4F",     // Blocked Roads
  flood: "#5FA8FF",      // Flood Zone
  impactZone: "rgba(255,120,200,0.18)", // Impact Zone fill
  impactZoneStroke: "#FF78C8",
  good: "#3FB97F",
};

const CONGESTION_TO_COLOR: Record<string, string> = {
  free: C.good,
  moderate: "#E8C547",
  heavy: "#FF8A3D",
  severe: C.severe,
};

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function roadsToFC(
  roads: { name: string; coords: [number, number][] }[],
  color: string
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: roads.map(r => ({
      type: "Feature",
      properties: { name: r.name, color },
      geometry: { type: "LineString", coordinates: r.coords },
    })),
  };
}

function buildFlowPoints(segments: RoadSegment[], tick: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  segments.forEach((seg) => {
    if (seg.coords.length < 2) return;
    const particleCount = seg.congestion === "free" ? 3 : seg.congestion === "moderate" ? 2 : 1;
    for (let p = 0; p < particleCount; p++) {
      const speedFactor = seg.speedKmh / 48;
      const offset = ((tick * speedFactor * 0.012) + p / particleCount) % 1;
      const point = interpolateAlongPath(seg.coords, offset);
      if (point) {
        features.push({
          type: "Feature",
          properties: { congestion: seg.congestion },
          geometry: { type: "Point", coordinates: point },
        });
      }
    }
  });
  return { type: "FeatureCollection", features };
}

// Directional flow for a single colored route (diversion/emergency/VIP) — slower, elegant
function buildRouteFlow(road: RoadGeometry | null, tick: number, particleCount = 2): GeoJSON.FeatureCollection {
  if (!road || road.coords.length < 2) return emptyFC();
  const features: GeoJSON.Feature[] = [];
  for (let p = 0; p < particleCount; p++) {
    const offset = ((tick * 0.006) + p / particleCount) % 1;
    const point = interpolateAlongPath(road.coords, offset);
    if (point) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: point },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function interpolateAlongPath(coords: [number, number][], t: number): [number, number] | null {
  if (coords.length < 2) return null;
  const segCount = coords.length - 1;
  const segLen = 1 / segCount;
  const segIdx = Math.min(Math.floor(t / segLen), segCount - 1);
  const localT = (t - segIdx * segLen) / segLen;
  const [x1, y1] = coords[segIdx];
  const [x2, y2] = coords[segIdx + 1];
  return [x1 + (x2 - x1) * localT, y1 + (y2 - y1) * localT];
}

const INCIDENT_ICON: Record<IncidentType, string> = {
  accident: "🚧", event: "📍", police: "👮", closure: "⛔", ambulance: "🚑", diversion: "↪️",
};
const INCIDENT_COLOR: Record<IncidentType, string> = {
  accident: C.severe, event: C.vip, police: C.normal, closure: C.severe, ambulance: "#FF6FA5", diversion: C.diversion,
};

export interface MapLayerVisibility {
  original: boolean;
  diversion: boolean;
  emergency: boolean;
  flood: boolean;
  impactZone: boolean;
}

export interface CommandMapHandle {
  resetView: () => void;
}

interface CommandMapProps {
  location: string;
  forecast: ForecastResult | null;
  animationStage: number;
  intelligence: MapIntelligence | null;
  layerVisibility: MapLayerVisibility;
  onMapReady: () => void;
  onDeploymentClick: (zone: DeploymentZone) => void;
  onIncidentClick: (incident: IncidentMarker) => void;
  onCameraClick: (camera: CCTVCamera) => void;
}

const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];
const DEFAULT_ZOOM = 12;
const DEFAULT_PITCH = 42;
const DEFAULT_BEARING = -12;

export const CommandMap = forwardRef<CommandMapHandle, CommandMapProps>(function CommandMap({
  location, forecast, animationStage, intelligence, layerVisibility,
  onMapReady, onDeploymentClick, onIncidentClick, onCameraClick,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const epicenterMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deploymentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const cameraMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const flowAnimRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const driftRef = useRef<number | null>(null);

  // ── Reset View — exposed to parent via ref ──
  useImperativeHandle(ref, () => ({
    resetView: () => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: LOCATION_CENTERS[location] || DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM + 1.4,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING - 3,
        duration: 1200,
        essential: true,
      });
    },
  }), [location]);

  // Resolved (real road-geometry) versions of forecast roads
  const [resolvedRoads, setResolvedRoads] = useState<{
    impactZone: RoadGeometry[];
    blocked: RoadGeometry[];
    original: RoadGeometry[];
    diversion: RoadGeometry[];
    emergency: RoadGeometry | null;
    vip: RoadGeometry | null;
  } | null>(null);

  // ── Init map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [77.5946, 12.9716],
      zoom: 12,
      pitch: 42,
      bearing: -12,
      antialias: true,
      scrollZoom: { around: "center" },
      dragRotate: true,
      dragPan: { linearity: 0.3, easing: (t: number) => t, deceleration: 2500, maxSpeed: 1400 },
      touchZoomRotate: true,
      touchPitch: true,
      pitchWithRotate: true,
      keyboard: true,
      doubleClickZoom: true,
      cooperativeGestures: false,
    });

    const map = mapRef.current;
    map.scrollZoom.enable({ around: "center" });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.dragPan.enable({ linearity: 0.3, easing: (t: number) => t, deceleration: 2500, maxSpeed: 1400 });

    mapRef.current.on("load", () => {
      loadedRef.current = true;
      const map = mapRef.current!;

      // ═══ Ambient fog — depth only, not weather ═══
      map.setFog({
        range: [0.8, 10],
        color: "#0c0f17",
        "horizon-blend": 0.25,
        "high-color": "#0e1320",
        "space-color": "#07090f",
        "star-intensity": 0.0,
      });

      // ═══ Directional lighting for buildings ═══
      map.setLight({
        anchor: "viewport",
        color: "#a8c4ff",
        intensity: 0.35,
        position: [1.2, 180, 42],
      });

      // ═══ Buildings — height variation, color variation, shadow ═══
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 12.5,
        paint: {
          "fill-extrusion-color": [
            "interpolate", ["linear"], ["get", "height"],
            0, "#161A22",
            40, "#1B2030",
            90, "#212840",
            180, "#283154",
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.92,
          "fill-extrusion-vertical-gradient": true,
        },
      });

      // ── Road hierarchy: dim default road network so our overlays pop ──
      try {
        if (map.getLayer("road-primary")) {
          map.setPaintProperty("road-primary", "line-color", "#3a3f4d");
        }
        if (map.getLayer("road-secondary-tertiary")) {
          map.setPaintProperty("road-secondary-tertiary", "line-color", "#2a2e38");
        }
        if (map.getLayer("road-street")) {
          map.setPaintProperty("road-street", "line-color", "#20232b");
        }
        // Label contrast + halo
        ["road-label", "settlement-label", "poi-label"].forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, "text-color", "#C7CCD6");
            map.setPaintProperty(layerId, "text-halo-color", "#0a0c12");
            map.setPaintProperty(layerId, "text-halo-width", 1.4);
          }
        });
      } catch {
        // Style layer names can vary by Mapbox style version — fail silent
      }

      // ═══ Road congestion (Layer 1) ═══
      map.addSource("road-congestion", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "road-congestion-glow",
        type: "line",
        source: "road-congestion",
        paint: { "line-color": ["get", "color"], "line-width": 11, "line-opacity": 0.12, "line-blur": 7 },
      });
      map.addLayer({
        id: "road-congestion-line",
        type: "line",
        source: "road-congestion",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.4, 15, 5.5],
          "line-opacity": 0.88,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // ═══ Animated flow particles (ambient congestion) ═══
      map.addSource("flow-particles", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "flow-particles-layer",
        type: "circle",
        source: "flow-particles",
        paint: { "circle-radius": 2.2, "circle-color": "#ffffff", "circle-opacity": 0.7, "circle-blur": 0.3 },
      });

      // ── Blocked roads — solid severe red, distinct dash overlay ──
      map.addSource("blocked-roads", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "blocked-roads-line",
        type: "line",
        source: "blocked-roads",
        paint: { "line-color": C.severe, "line-width": 4, "line-opacity": 1 },
        layout: { "line-cap": "round" },
      });
      map.addLayer({
        id: "blocked-roads-pattern",
        type: "line",
        source: "blocked-roads",
        paint: { "line-color": "#1a0d0d", "line-width": 1.2, "line-opacity": 0.7, "line-dasharray": [0.4, 1.8] },
      });

      // ── Original/normal route (blue) ──
      map.addSource("original-route", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "original-route-line",
        type: "line",
        source: "original-route",
        // Increased line width to 4 and opacity to 1 so it's fully visible
        paint: { "line-color": C.normal, "line-width": 4, "line-opacity": 1, "line-dasharray": [2, 2] },
        layout: { "line-cap": "round" },
      });

      // ── Diversion route (amber) + animated flow ──
      map.addSource("diversion-route", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "diversion-route-line",
        type: "line",
        source: "diversion-route",
        paint: { "line-color": C.diversion, "line-width": 3, "line-opacity": 0.9 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addSource("diversion-flow", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "diversion-flow-layer",
        type: "circle",
        source: "diversion-flow",
        paint: { "circle-radius": 3.5, "circle-color": C.diversion, "circle-opacity": 0.95, "circle-blur": 0.15 },
      });

      // ── Emergency corridor (neon mint) + animated flow ──
      map.addSource("emergency-corridor", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "emergency-line",
        type: "line",
        source: "emergency-corridor",
        paint: { "line-color": C.emergency, "line-width": 2.6, "line-opacity": 0.85, "line-dasharray": [1, 1] },
        layout: { "line-cap": "round" },
      });
      map.addSource("emergency-flow", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "emergency-flow-layer",
        type: "circle",
        source: "emergency-flow",
        paint: { "circle-radius": 3.5, "circle-color": C.emergency, "circle-opacity": 0.95, "circle-blur": 0.15 },
      });

      // ── VIP corridor (purple) + animated flow ──
      map.addSource("vip-corridor", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "vip-glow",
        type: "line",
        source: "vip-corridor",
        paint: { "line-color": C.vip, "line-width": 10, "line-opacity": 0.16, "line-blur": 7 },
      });
      map.addLayer({
        id: "vip-line",
        type: "line",
        source: "vip-corridor",
        paint: { "line-color": C.vip, "line-width": 2.8, "line-opacity": 0.95 },
        layout: { "line-cap": "round" },
      });
      map.addSource("vip-flow", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "vip-flow-layer",
        type: "circle",
        source: "vip-flow",
        paint: { "circle-radius": 3.5, "circle-color": C.vip, "circle-opacity": 0.95, "circle-blur": 0.15 },
      });

      // ═══ Flood zones — softer, lower opacity, soft edges ═══
      map.addSource("flood-zones", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "flood-zones-fill",
        type: "fill",
        source: "flood-zones",
        paint: { "fill-color": C.flood, "fill-opacity": 0.10 },
      });
      map.addLayer({
        id: "flood-zones-outline",
        type: "line",
        source: "flood-zones",
        paint: { "line-color": C.flood, "line-width": 1, "line-opacity": 0.3, "line-blur": 3 },
      });

      // ═══ Impact zone polygon — organic, soft, pulsing, hidden by default ═══
      map.addSource("impact-zone-polygon", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "impact-zone-fill",
        type: "fill",
        source: "impact-zone-polygon",
        layout: { visibility: "none" },
        paint: { "fill-color": C.impactZone, "fill-opacity": 1 },
      });
      map.addLayer({
        id: "impact-zone-outline",
        type: "line",
        source: "impact-zone-polygon",
        layout: { visibility: "none" },
        paint: { "line-color": C.impactZoneStroke, "line-width": 1.2, "line-opacity": 0.4, "line-blur": 3 },
      });

      // ═══ Impact center — radar pulse rings ═══
      map.addSource("radar-center", { type: "geojson", data: emptyFC() });
      [0, 1, 2].forEach(i => {
        map.addLayer({
          id: `radar-ring-${i}`,
          type: "circle",
          source: "radar-center",
          paint: {
            "circle-radius": 0,
            "circle-color": "transparent",
            "circle-stroke-color": C.severe,
            "circle-stroke-width": 1.5,
            "circle-stroke-opacity": 0,
          },
        });
      });

      onMapReady();
    });

    return () => {
      if (flowAnimRef.current) cancelAnimationFrame(flowAnimRef.current);
      if (driftRef.current) cancelAnimationFrame(driftRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // ── Fly to location + epicenter marker w/ clean pin ──
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const center = LOCATION_CENTERS[location] || LOCATION_CENTERS["Silk Board"];

    mapRef.current.flyTo({ center, zoom: 13.4, pitch: 45, bearing: -15, duration: 1700, essential: true });

    epicenterMarkerRef.current?.remove();
    
    // Create a clean, professional Event Location pin instead of the glowing dot
    const el = document.createElement("div");
    el.style.cssText = `display: flex; flex-direction: column; align-items: center; cursor: pointer;`;
    el.innerHTML = `
      <div style="
        background: rgba(23,24,28,0.95);
        border: 1.5px solid #4A90FF;
        border-radius: 6px;
        padding: 5px 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11.5px;
        font-weight: 700;
        color: #4A90FF;
        white-space: nowrap;
        box-shadow: 0 0 16px rgba(74,144,255,0.25);
        margin-bottom: 2px;
      ">
        📍 EVENT LOCATION
      </div>
      <div style="width: 2px; height: 14px; background: #4A90FF;"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #fff; border: 2.5px solid #4A90FF; box-shadow: 0 0 8px rgba(74,144,255,0.6);"></div>
    `;
    
    // anchor: "bottom" ensures the bottom of the pin sits exactly on the geographic coordinate
    epicenterMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(center)
      .addTo(mapRef.current);

    const radarSrc = mapRef.current.getSource("radar-center") as mapboxgl.GeoJSONSource | undefined;
    radarSrc?.setData({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: center } }],
    });
  }, [location]);

  // ═══ Radar pulse animation (subtle, 2.5s cycle, 3 staggered rings) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    let raf: number;
    const startTime = performance.now();
    const CYCLE = 2500;

    const animateRadar = (now: number) => {
      const elapsed = (now - startTime) % CYCLE;
      [0, 1, 2].forEach(i => {
        const phase = ((elapsed + i * (CYCLE / 3)) % CYCLE) / CYCLE; // 0 → 1
        const radius = phase * 34;
        const opacity = (1 - phase) * 0.45;
        try {
          map.setPaintProperty(`radar-ring-${i}`, "circle-radius", radius);
          map.setPaintProperty(`radar-ring-${i}`, "circle-stroke-opacity", opacity);
        } catch { /* layer not ready yet */ }
      });
      raf = requestAnimationFrame(animateRadar);
    };
    raf = requestAnimationFrame(animateRadar);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ═══ Subtle camera drift / breathing — pauses during user interaction ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const baseBearing = -15;
    const startTime = performance.now();
    let userInteracting = false;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const onInteractionStart = () => {
      userInteracting = true;
      if (resumeTimeout) clearTimeout(resumeTimeout);
    };
    const onInteractionEnd = () => {
      // Resume drift 1.2s after the user lets go, so it never snaps mid-gesture
      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => { userInteracting = false; }, 1200);
    };

    map.on("dragstart", onInteractionStart);
    map.on("rotatestart", onInteractionStart);
    map.on("pitchstart", onInteractionStart);
    map.on("zoomstart", onInteractionStart);
    map.on("dragend", onInteractionEnd);
    map.on("rotateend", onInteractionEnd);
    map.on("pitchend", onInteractionEnd);
    map.on("zoomend", onInteractionEnd);

    const drift = (now: number) => {
      if (!userInteracting) {
        const t = (now - startTime) / 1000;
        const bearingDrift = Math.sin(t * 0.05) * 2.2;     // ±2.2°, ~20s cycle
        const pitchDrift = 45 + Math.sin(t * 0.035) * 1.2;  // ±1.2°, ~30s cycle
        map.setBearing(baseBearing + bearingDrift);
        map.setPitch(pitchDrift);
      }
      driftRef.current = requestAnimationFrame(drift);
    };
    driftRef.current = requestAnimationFrame(drift);

    return () => {
      if (driftRef.current) cancelAnimationFrame(driftRef.current);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      map.off("dragstart", onInteractionStart);
      map.off("rotatestart", onInteractionStart);
      map.off("pitchstart", onInteractionStart);
      map.off("zoomstart", onInteractionStart);
      map.off("dragend", onInteractionEnd);
      map.off("rotateend", onInteractionEnd);
      map.off("pitchend", onInteractionEnd);
      map.off("zoomend", onInteractionEnd);
    };
  }, [location]);

  // ── Resolve real road geometry via Directions API when forecast changes ──
  useEffect(() => {
    if (!forecast) {
      setResolvedRoads(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const [impactZone, blocked, original, diversion, emergency, vip] = await Promise.all([
        resolveRoadsToRealGeometry(forecast.impactZoneRoads),
        resolveRoadsToRealGeometry(forecast.blockedRoads),
        resolveRoadsToRealGeometry(forecast.originalRouteRoads),
        resolveRoadsToRealGeometry(forecast.diversionRouteRoads),
        forecast.emergencyCorridor ? resolveSingleRoad(forecast.emergencyCorridor) : Promise.resolve(null),
        forecast.vipCorridor ? resolveSingleRoad(forecast.vipCorridor) : Promise.resolve(null),
      ]);

      if (!cancelled) {
        setResolvedRoads({ impactZone, blocked, original, diversion, emergency, vip });
      }
    })();

    return () => { cancelled = true; };
  }, [forecast]);

  // ── Update route/zone layers using resolved (real) geometry ──
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;

    const blockedSrc = map.getSource("blocked-roads") as mapboxgl.GeoJSONSource;
    const origSrc = map.getSource("original-route") as mapboxgl.GeoJSONSource;
    const divSrc = map.getSource("diversion-route") as mapboxgl.GeoJSONSource;
    const emergencySrc = map.getSource("emergency-corridor") as mapboxgl.GeoJSONSource;
    const vipSrc = map.getSource("vip-corridor") as mapboxgl.GeoJSONSource;

    deploymentMarkersRef.current.forEach(m => m.remove());
    deploymentMarkersRef.current = [];

    if (!forecast || animationStage === 0 || !resolvedRoads) {
      blockedSrc?.setData(emptyFC());
      origSrc?.setData(emptyFC());
      divSrc?.setData(emptyFC());
      emergencySrc?.setData(emptyFC());
      vipSrc?.setData(emptyFC());
      return;
    }

    if (animationStage >= 2) {
      blockedSrc?.setData(roadsToFC(resolvedRoads.blocked, C.severe));
      origSrc?.setData(roadsToFC(resolvedRoads.original, C.normal));
    } else {
      blockedSrc?.setData(emptyFC());
      origSrc?.setData(emptyFC());
    }

    if (animationStage >= 3) {
      divSrc?.setData(roadsToFC(resolvedRoads.diversion, C.diversion));
      if (resolvedRoads.vip) vipSrc?.setData(roadsToFC([resolvedRoads.vip], C.vip));
    } else {
      divSrc?.setData(emptyFC());
      vipSrc?.setData(emptyFC());
    }

    if (animationStage >= 4 && resolvedRoads.emergency) {
      emergencySrc?.setData(roadsToFC([resolvedRoads.emergency], C.emergency));
    } else {
      emergencySrc?.setData(emptyFC());
    }

    if (animationStage >= 4) {
      forecast.deploymentZones.forEach(zone => {
        const el = document.createElement("div");
        const priorityColor = zone.priority === "High" ? C.severe : zone.priority === "Medium" ? C.diversion : C.normal;
        el.style.cssText = `display: flex; flex-direction: column; align-items: center; cursor: pointer;`;
        el.innerHTML = `
          <div style="
            background: rgba(23,24,28,0.95);
            border: 1.5px solid ${priorityColor};
            border-radius: 7px;
            padding: 5px 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            font-weight: 600;
            color: ${priorityColor};
            white-space: nowrap;
            box-shadow: 0 0 12px ${priorityColor}35;
          ">
            👮 ×${zone.officers}
          </div>
        `;
        el.addEventListener("click", () => onDeploymentClick(zone));
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([zone.lon, zone.lat]).addTo(map);
        deploymentMarkersRef.current.push(marker);
      });
    }
  }, [forecast, resolvedRoads, animationStage, onDeploymentClick]);

  // ── Road congestion + flood zones + impact zone polygon from intelligence ──
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const congestionSrc = map.getSource("road-congestion") as mapboxgl.GeoJSONSource;
    const floodSrc = map.getSource("flood-zones") as mapboxgl.GeoJSONSource;
    const impactZoneSrc = map.getSource("impact-zone-polygon") as mapboxgl.GeoJSONSource;

    if (!intelligence || animationStage === 0) {
      congestionSrc?.setData(emptyFC());
      floodSrc?.setData(emptyFC());
      impactZoneSrc?.setData(emptyFC());
      return;
    }

    congestionSrc?.setData({
      type: "FeatureCollection",
      features: intelligence.roadSegments.map(seg => ({
        type: "Feature",
        properties: { name: seg.name, color: CONGESTION_TO_COLOR[seg.congestion] },
        geometry: { type: "LineString", coordinates: seg.coords },
      })),
    });

    floodSrc?.setData({
      type: "FeatureCollection",
      features: intelligence.floodZones.map(fz => ({
        type: "Feature",
        properties: { severity: fz.severity },
        geometry: { type: "Polygon", coordinates: [fz.coords] },
      })),
    });

    impactZoneSrc?.setData({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [intelligence.impactZonePolygon.coords] },
      }],
    });
  }, [intelligence, animationStage]);

  // ═══ Issue 3: Impact zone subtle pulsing animation (independent of visibility toggle) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    let raf: number;
    const startTime = performance.now();
    const CYCLE = 3000; // 3s slow pulse

    const animatePulse = (now: number) => {
      const t = ((now - startTime) % CYCLE) / CYCLE;
      const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2; // 0 → 1 → 0
      try {
        map.setPaintProperty("impact-zone-fill", "fill-opacity", 0.65 + pulse * 0.35);
        map.setPaintProperty("impact-zone-outline", "line-opacity", 0.25 + pulse * 0.3);
      } catch { /* layer not ready yet */ }
      raf = requestAnimationFrame(animatePulse);
    };
    raf = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ═══ FINAL FIX: Layer visibility toggles (Binding messy lines to Impact Zone) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const setVis = (layerIds: string[], visible: boolean) => {
      layerIds.forEach(layerId => {
        try {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
          }
        } catch { /* layer not added yet */ }
      });
    };

    setVis(["original-route-line"], layerVisibility.original);
    
    setVis(["diversion-route-line", "diversion-flow-layer"], layerVisibility.diversion);
    
    setVis(["emergency-line", "emergency-flow-layer", "vip-line", "vip-glow", "vip-flow-layer"], layerVisibility.emergency);
    
    setVis(["flood-zones-fill", "flood-zones-outline"], layerVisibility.flood);
    
    // Impact zone toggle hides all the aggressive straight lines!
    setVis([
      "impact-zone-fill", "impact-zone-outline",
      "road-congestion-line", "road-congestion-glow",
      "flow-particles-layer", 
      "blocked-roads-line", "blocked-roads-pattern",
      "radar-ring-0", "radar-ring-1", "radar-ring-2"
    ], layerVisibility.impactZone);
  }, [layerVisibility]);

  // ═══ Ambient flow particles + directional route flow (single rAF loop) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;

    const animate = () => {
      tickRef.current += 1;
      const map = mapRef.current;
      if (!map) return;

      if (intelligence && animationStage > 0 && intelligence.roadSegments.length > 0) {
        const fc = buildFlowPoints(intelligence.roadSegments, tickRef.current);
        (map.getSource("flow-particles") as mapboxgl.GeoJSONSource | undefined)?.setData(fc);
      }

      if (resolvedRoads && animationStage >= 3) {
        const divFlow = buildRouteFlow(resolvedRoads.diversion[0] || null, tickRef.current, 2);
        (map.getSource("diversion-flow") as mapboxgl.GeoJSONSource | undefined)?.setData(divFlow);

        if (resolvedRoads.vip) {
          const vipFlow = buildRouteFlow(resolvedRoads.vip, tickRef.current, 2);
          (map.getSource("vip-flow") as mapboxgl.GeoJSONSource | undefined)?.setData(vipFlow);
        }
      }
      if (resolvedRoads?.emergency && animationStage >= 4) {
        const emFlow = buildRouteFlow(resolvedRoads.emergency, tickRef.current, 2);
        (map.getSource("emergency-flow") as mapboxgl.GeoJSONSource | undefined)?.setData(emFlow);
      }

      flowAnimRef.current = requestAnimationFrame(animate);
    };
    flowAnimRef.current = requestAnimationFrame(animate);

    return () => { if (flowAnimRef.current) cancelAnimationFrame(flowAnimRef.current); };
  }, [intelligence, resolvedRoads, animationStage]);

  // ═══ Incident markers (20% larger) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    incidentMarkersRef.current.forEach(m => m.remove());
    incidentMarkersRef.current = [];
    if (!intelligence || animationStage < 2) return;

    intelligence.incidents.forEach(inc => {
      const color = INCIDENT_COLOR[inc.type];
      const el = document.createElement("div");
      el.style.cssText = `cursor: pointer;`;
      el.innerHTML = `
        <div style="
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(23,24,28,0.92);
          border: 1.5px solid ${color};
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 0 10px ${color}45;
        ">
          ${INCIDENT_ICON[inc.type]}
        </div>
      `;
      el.addEventListener("click", () => onIncidentClick(inc));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([inc.lon, inc.lat]).addTo(map);
      incidentMarkersRef.current.push(marker);
    });
  }, [intelligence, animationStage, onIncidentClick]);

  // ═══ CCTV markers (20% larger) ═══
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    cameraMarkersRef.current.forEach(m => m.remove());
    cameraMarkersRef.current = [];
    if (!intelligence || animationStage < 1) return;

    intelligence.cameras.forEach(cam => {
      const el = document.createElement("div");
      el.style.cssText = `cursor: pointer;`;
      el.innerHTML = `
        <div style="
          width: 26px; height: 26px; border-radius: 6px;
          background: rgba(23,24,28,0.92);
          border: 1.5px solid #4a5060;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        ">
          📷
        </div>
      `;
      el.addEventListener("click", () => onCameraClick(cam));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([cam.lon, cam.lat]).addTo(map);
      cameraMarkersRef.current.push(marker);
    });
  }, [intelligence, animationStage, onCameraClick]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center", background: "#0c0f17", zIndex: 20,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: C.severe, marginBottom: 4 }}>Mapbox token missing</div>
            <div style={{ fontSize: 11, color: "#8a96b8" }}>Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</div>
          </div>
        </div>
      )}
    </div>
  );
});

CommandMap.displayName = "CommandMap";