import pandas as pd
import numpy as np
from datetime import datetime

def load_and_clean():
    df = pd.read_csv("data/incidents.csv")
    
    # Parse datetime
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
    df['hour'] = df['start_datetime'].dt.hour
    df['day_of_week'] = df['start_datetime'].dt.dayofweek
    df['month'] = df['start_datetime'].dt.month
    
    # Severity score
    cause_severity = {
        'accident': 9,
        'congestion': 8,
        'water_logging': 7,
        'construction': 6,
        'procession': 8,
        'public_event': 7,
        'vip_movement': 6,
        'tree_fall': 5,
        'pot_holes': 4,
        'vehicle_breakdown': 3,
        'road_conditions': 4,
        'protest': 8,
        'others': 2,
        'Debris': 3,
        'debris': 3,
    }
    df['severity_score'] = df['event_cause'].map(cause_severity).fillna(2)
    df['priority_score'] = df['priority'].map({'High': 2, 'Low': 1}).fillna(1)
    df['road_closure_score'] = df['requires_road_closure'].astype(int) * 3
    df['risk_score'] = (
        df['severity_score'] * 0.5 +
        df['priority_score'] * 0.3 +
        df['road_closure_score'] * 0.2
    ).clip(0, 10)
    
    df = df.dropna(subset=['latitude', 'longitude'])
    return df

def get_junction_stats(df):
    stats = df.groupby('junction').agg(
        incident_count=('id', 'count'),
        avg_risk=('risk_score', 'mean'),
        high_priority_count=('priority_score', lambda x: (x == 2).sum()),
        road_closures=('requires_road_closure', 'sum'),
        top_cause=('event_cause', lambda x: x.mode()[0] if len(x) > 0 else 'unknown'),
        lat=('latitude', 'mean'),
        lon=('longitude', 'mean'),
    ).reset_index()
    stats = stats[stats['junction'].notna() & (stats['junction'] != '')]
    stats = stats.sort_values('incident_count', ascending=False)
    return stats

def get_hotspots(df, top_n=20):
    stats = get_junction_stats(df)
    return stats.head(top_n).to_dict(orient='records')

def get_corridor_risk(df):
    corridor = df.groupby('corridor').agg(
        incident_count=('id', 'count'),
        avg_risk=('risk_score', 'mean'),
        closure_rate=('requires_road_closure', 'mean'),
    ).reset_index()
    corridor = corridor[corridor['corridor'] != 'Non-corridor']
    return corridor.sort_values('avg_risk', ascending=False).to_dict(orient='records')

def get_hourly_pattern(df):
    hourly = df.groupby('hour').agg(
        incident_count=('id', 'count'),
        avg_risk=('risk_score', 'mean'),
    ).reset_index()
    return hourly.to_dict(orient='records')

def get_cause_distribution(df):
    cause = df['event_cause'].value_counts().reset_index()
    cause.columns = ['cause', 'count']
    return cause.to_dict(orient='records')

if __name__ == "__main__":
    df = load_and_clean()
    print(df[['event_cause','severity_score','risk_score']].head())
    print(get_hotspots(df, 5))