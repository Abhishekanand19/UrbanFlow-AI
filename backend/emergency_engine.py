import pandas as pd
import numpy as np

# Key Bengaluru hospitals and their coordinates
HOSPITALS = [
    {"name": "Manipal Hospital Old Airport Road", "lat": 12.9591, "lon": 77.6486},
    {"name": "Apollo Hospital Bannerghatta", "lat": 12.8889, "lon": 77.5962},
    {"name": "St. John's Medical College", "lat": 12.9299, "lon": 77.6185},
    {"name": "Victoria Hospital", "lat": 12.9647, "lon": 77.5778},
    {"name": "Fortis Hospital Cunningham Road", "lat": 12.9991, "lon": 77.5901},
    {"name": "Narayana Health City", "lat": 12.8927, "lon": 77.6098},
    {"name": "BGS Global Hospital", "lat": 12.9125, "lon": 77.5492},
]

def get_nearest_hospital(lat: float, lon: float):
    """Find nearest hospital to incident location"""
    def dist(h):
        return ((h['lat'] - lat)**2 + (h['lon'] - lon)**2)**0.5
    return min(HOSPITALS, key=dist)

def get_emergency_corridor(incident_lat: float, incident_lon: float):
    """
    Returns a GeoJSON LineString for the emergency corridor
    between nearest hospital and incident location.
    Used by Mapbox to draw the green glowing route.
    """
    hospital = get_nearest_hospital(incident_lat, incident_lon)
    
    # Simple straight-line corridor with midpoint jog for visual realism
    mid_lat = (hospital['lat'] + incident_lat) / 2 + 0.003
    mid_lon = (hospital['lon'] + incident_lon) / 2 + 0.002
    
    return {
        "hospital": hospital,
        "incident": {"lat": incident_lat, "lon": incident_lon},
        "geojson": {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [hospital['lon'], hospital['lat']],
                    [mid_lon, mid_lat],
                    [incident_lon, incident_lat],
                ]
            },
            "properties": {"type": "emergency_corridor"}
        }
    }