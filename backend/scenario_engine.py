import pandas as pd
import numpy as np
from graph_engine import get_cascade_sequence, get_affected_nodes, build_junction_graph
from data_processor import load_and_clean

CAUSE_DELAY_MAP = {
    'accident': 22,
    'water_logging': 28,
    'construction': 18,
    'procession': 25,
    'public_event': 20,
    'vip_movement': 15,
    'tree_fall': 12,
    'pot_holes': 8,
    'vehicle_breakdown': 7,
    'congestion': 24,
    'protest': 30,
    'others': 10,
    'road_conditions': 9,
    'Debris': 8,
}

CAUSE_OFFICERS_MAP = {
    'accident': 6,
    'water_logging': 4,
    'construction': 3,
    'procession': 10,
    'public_event': 8,
    'vip_movement': 12,
    'tree_fall': 3,
    'pot_holes': 2,
    'vehicle_breakdown': 2,
    'congestion': 5,
    'protest': 15,
    'others': 3,
    'road_conditions': 2,
    'Debris': 3,
}

def run_scenario(incident_cause: str, junction: str, df: pd.DataFrame):
    """
    Simulate disruption scenario for a given cause + junction.
    Returns risk, delay, officers needed, cascade, economic impact.
    """
    # Base delay from cause
    base_delay = CAUSE_DELAY_MAP.get(incident_cause, 12)
    
    # Adjust by junction historical incidents
    junc_df = df[df['junction'] == junction]
    if len(junc_df) > 0:
        incident_multiplier = min(1 + len(junc_df) / 200, 2.0)
        base_delay = int(base_delay * incident_multiplier)
    
    # Risk score 0-100
    cause_base_risk = {
        'accident': 85, 'water_logging': 78, 'construction': 60,
        'procession': 75, 'public_event': 65, 'vip_movement': 55,
        'tree_fall': 45, 'pot_holes': 35, 'vehicle_breakdown': 30,
        'congestion': 80, 'protest': 88, 'others': 25, 'road_conditions': 38,
        'Debris': 32,
    }
    risk = min(cause_base_risk.get(incident_cause, 40) + (len(junc_df) // 10), 99)
    
    # Affected nodes
    affected = get_affected_nodes(junction, df, hops=2)
    
    # Officers
    officers = CAUSE_OFFICERS_MAP.get(incident_cause, 4)
    if risk > 70:
        officers += 3
    
    # Economic impact (vehicles * delay_mins * ₹500/hr)
    vehicles_affected = len(affected) * 200
    economic_lakhs = round((vehicles_affected * base_delay / 60 * 500) / 100000, 1)
    
    # AI intervention improvement
    ai_delay = int(base_delay * 0.45)
    delay_reduction_pct = round((1 - ai_delay / base_delay) * 100)
    
    cascade = get_cascade_sequence(junction, df)
    
    return {
        "junction": junction,
        "incident_cause": incident_cause,
        "risk_score": risk,
        "predicted_delay_mins": base_delay,
        "ai_intervention_delay_mins": ai_delay,
        "delay_reduction_pct": delay_reduction_pct,
        "officers_required": officers,
        "affected_nodes": len(affected),
        "economic_impact_lakhs": economic_lakhs,
        "cascade": cascade,
        "historical_incidents_at_junction": len(junc_df),
    }