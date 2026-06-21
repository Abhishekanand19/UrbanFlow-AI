import pandas as pd
import numpy as np
from data_processor import load_and_clean, get_junction_stats

def compute_overall_risk(df):
    """Returns dashboard KPI values"""
    avg_risk = df['risk_score'].mean()
    risk_score = int(avg_risk * 10)
    
    # Peak delay estimate (heuristic)
    high_risk = df[df['risk_score'] > 6]
    base_delay = len(high_risk) * 0.3
    peak_delay = min(int(base_delay + 8), 45)
    
    # Confidence (based on data completeness)
    completeness = df[['latitude','longitude','event_cause','junction']].notna().mean().mean()
    confidence = int(completeness * 100)
    
    # Economic impact (rough heuristic: ₹500/vehicle-hour, ~500 vehicles affected per high incident)
    economic = round((len(high_risk) * 500 * peak_delay / 60) / 100000, 1)
    
    return {
        "risk_score": risk_score,
        "peak_delay_mins": peak_delay,
        "confidence_pct": confidence,
        "economic_impact_cr": economic,
    }

def get_cascade_sequence(junction_name: str, df: pd.DataFrame):
    """
    Simulates cascade failure propagation from a given junction.
    Returns a timeline of affected nodes.
    """
    stats = get_junction_stats(df)
    
    # Find the selected junction
    target = stats[stats['junction'] == junction_name]
    if target.empty:
        target = stats.iloc[0:1]
        junction_name = target.iloc[0]['junction']
    
    target_row = target.iloc[0]
    base_lat = target_row['lat']
    base_lon = target_row['lon']
    
    # Find nearby junctions within ~3km radius
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2)**2
        return R * 2 * np.arcsin(np.sqrt(a))
    
    stats['dist_km'] = stats.apply(
        lambda r: haversine(base_lat, base_lon, r['lat'], r['lon']), axis=1
    )
    
    nearby = stats[
        (stats['junction'] != junction_name) & 
        (stats['dist_km'] < 3.5) &
        (stats['dist_km'] > 0.1)
    ].sort_values('dist_km').head(5)
    
    # Build cascade timeline
    cascade = []
    t = 0
    severity_map = {'red': 'CRITICAL', 'orange': 'HIGH', 'yellow': 'MODERATE', 'green': 'LOW'}
    
    cascade.append({
        "time_offset_mins": 0,
        "junction": junction_name,
        "lat": float(base_lat),
        "lon": float(base_lon),
        "status": "red",
        "label": f"{junction_name} overloads",
        "incident_count": int(target_row['incident_count']),
    })
    
    intervals = [12, 13, 15, 18]
    colors = ['orange', 'orange', 'yellow', 'yellow']
    
    for i, (_, row) in enumerate(nearby.iterrows()):
        if i >= 4:
            break
        t += intervals[i]
        cascade.append({
            "time_offset_mins": t,
            "junction": row['junction'],
            "lat": float(row['lat']),
            "lon": float(row['lon']),
            "status": colors[i],
            "label": f"Spillback reaches {row['junction']}",
            "incident_count": int(row['incident_count']),
        })
    
    return cascade

def get_similar_incidents(event_cause: str, junction: str, df: pd.DataFrame, top_n=3):
    """Find historically similar incidents"""
    similar = df[df['event_cause'] == event_cause].copy()
    if junction and junction != 'all':
        junc_match = similar[similar['junction'] == junction]
        if len(junc_match) >= 2:
            similar = junc_match
    
    similar = similar.sort_values('risk_score', ascending=False).head(top_n)
    
    result = []
    for _, row in similar.iterrows():
        result.append({
            "id": row['id'],
            "event_cause": row['event_cause'],
            "junction": row.get('junction', 'Unknown'),
            "zone": row.get('zone', 'Unknown'),
            "police_station": row.get('police_station', 'Unknown'),
            "risk_score": round(float(row['risk_score']), 2),
            "requires_road_closure": bool(row['requires_road_closure']),
            "start_datetime": str(row['start_datetime']),
        })
    return result