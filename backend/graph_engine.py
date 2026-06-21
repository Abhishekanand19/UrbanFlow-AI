import networkx as nx
import pandas as pd
import numpy as np
from data_processor import load_and_clean, get_junction_stats

def build_junction_graph(df: pd.DataFrame, radius_km: float = 3.5) -> nx.Graph:
    """Build a graph of Bengaluru junctions connected by proximity"""
    stats = get_junction_stats(df)
    stats = stats[stats['junction'].notna() & (stats['lat'].notna())]
    
    G = nx.Graph()
    
    for _, row in stats.iterrows():
        G.add_node(
            row['junction'],
            lat=row['lat'],
            lon=row['lon'],
            incident_count=int(row['incident_count']),
            avg_risk=float(row['avg_risk']),
            top_cause=row['top_cause'],
        )
    
    nodes = list(G.nodes(data=True))
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2)**2
        return R * 2 * np.arcsin(np.sqrt(a))
    
    for i, (n1, d1) in enumerate(nodes):
        for n2, d2 in nodes[i+1:]:
            dist = haversine(d1['lat'], d1['lon'], d2['lat'], d2['lon'])
            if dist <= radius_km:
                weight = 1 / (dist + 0.01)
                G.add_edge(n1, n2, distance_km=round(dist, 2), weight=weight)
    
    return G


def get_cascade_sequence(junction_name: str, df: pd.DataFrame, max_hops: int = 5):
    """
    BFS propagation from epicenter junction.
    Returns ordered cascade steps with timing.
    """
    G = build_junction_graph(df)
    
    if junction_name not in G.nodes:
        # Fallback to most connected node
        junction_name = max(G.degree, key=lambda x: x[1])[0]
    
    node_data = G.nodes[junction_name]
    
    # BFS from epicenter
    visited = {junction_name: 0}
    queue = [junction_name]
    order = [junction_name]
    
    while queue and len(order) < max_hops:
        current = queue.pop(0)
        current_hop = visited[current]
        neighbors = sorted(
            G.neighbors(current),
            key=lambda n: G[current][n]['distance_km']
        )
        for neighbor in neighbors:
            if neighbor not in visited and len(order) < max_hops:
                visited[neighbor] = current_hop + 1
                queue.append(neighbor)
                order.append(neighbor)
    
    # Build cascade timeline
    status_sequence = ['red', 'orange', 'orange', 'yellow', 'yellow']
    delay_sequence = [0, 12, 13, 15, 18]
    label_templates = [
        "{j} overloads — cascade origin",
        "Spillback reaches {j}",
        "{j} congestion spreading",
        "Queue propagates to {j}",
        "Network saturation at {j}",
    ]
    
    cascade = []
    cumulative_time = 0
    
    for i, junc in enumerate(order):
        if i >= len(status_sequence):
            break
        cumulative_time += delay_sequence[i]
        ndata = G.nodes[junc]
        cascade.append({
            "time_offset_mins": cumulative_time,
            "junction": junc,
            "lat": float(ndata['lat']),
            "lon": float(ndata['lon']),
            "status": status_sequence[i],
            "label": label_templates[i].format(j=junc),
            "incident_count": int(ndata['incident_count']),
            "hop": i,
        })
    
    return cascade


def get_affected_nodes(junction_name: str, df: pd.DataFrame, hops: int = 2):
    """Returns all junctions within N hops of epicenter"""
    G = build_junction_graph(df)
    if junction_name not in G.nodes:
        return []
    subgraph_nodes = nx.single_source_shortest_path_length(G, junction_name, cutoff=hops)
    return [
        {"junction": n, "hops": h, **G.nodes[n]}
        for n, h in subgraph_nodes.items()
    ]