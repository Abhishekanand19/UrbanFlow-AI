import pandas as pd
import numpy as np

def get_similar_incidents(event_cause: str, junction: str, df: pd.DataFrame, top_n: int = 4):
    """
    Find historically similar incidents using cause + location proximity.
    Returns enriched records with outcome info.
    """
    scored = df.copy()
    
    # Cause match score
    scored['cause_match'] = (scored['event_cause'] == event_cause).astype(int) * 3
    
    # Junction match score
    scored['junction_match'] = (scored['junction'] == junction).astype(int) * 2
    
    # Priority score
    scored['priority_pts'] = scored['priority'].map({'High': 1, 'Low': 0}).fillna(0)
    
    scored['match_score'] = scored['cause_match'] + scored['junction_match'] + scored['priority_pts']
    
    result_df = scored[scored['cause_match'] > 0].sort_values(
        ['match_score', 'risk_score'], ascending=False
    ).head(top_n)
    
    results = []
    for _, row in result_df.iterrows():
        # Estimate resolution time
        resolution_mins = None
        try:
            start = pd.to_datetime(row['start_datetime'])
            end = pd.to_datetime(row.get('resolved_datetime') or row.get('closed_datetime'))
            if pd.notna(start) and pd.notna(end):
                resolution_mins = int((end - start).total_seconds() / 60)
        except:
            pass
        
        results.append({
            "id": str(row['id']),
            "event_cause": row['event_cause'],
            "junction": row.get('junction') or 'Unknown',
            "zone": row.get('zone') or 'Unknown',
            "police_station": row.get('police_station') or 'Unknown',
            "risk_score": round(float(row['risk_score']), 1),
            "requires_road_closure": bool(row['requires_road_closure']),
            "start_datetime": str(row['start_datetime'])[:16],
            "resolution_mins": resolution_mins,
            "status": row.get('status', 'closed'),
            "priority": row.get('priority', 'Low'),
            "match_score": int(row['match_score']),
        })
    
    return results