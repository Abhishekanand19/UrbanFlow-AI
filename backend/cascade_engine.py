"""
cascade_engine.py
Thin wrapper kept for backward-compatibility.
All real logic lives in graph_engine.py
"""
from graph_engine import get_cascade_sequence, get_affected_nodes, build_junction_graph

__all__ = ["get_cascade_sequence", "get_affected_nodes", "build_junction_graph"]