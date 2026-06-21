from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from data_processor import load_and_clean, get_hotspots, get_corridor_risk, get_hourly_pattern, get_cause_distribution
from risk_engine import compute_overall_risk
from graph_engine import get_cascade_sequence, build_junction_graph
from similarity_engine import get_similar_incidents
from scenario_engine import run_scenario
from emergency_engine import get_emergency_corridor
from ai_brief import generate_ai_brief
import pandas as pd

app = FastAPI(title="UrbanFlow AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

df = load_and_clean()

@app.get("/")
def root():
    return {"status": "UrbanFlow AI running", "records": len(df)}

@app.get("/api/kpi")
def kpi():
    return compute_overall_risk(df)

@app.get("/api/hotspots")
def hotspots(top_n: int = 20):
    return get_hotspots(df, top_n)

@app.get("/api/junctions")
def junctions():
    junc_list = df['junction'].dropna().unique().tolist()
    return sorted([j for j in junc_list if j.strip() != ''])

@app.get("/api/causes")
def causes():
    return get_cause_distribution(df)

@app.get("/api/cascade")
def cascade(junction: str = "SilkBoardJunc"):
    return {
        "junction": junction,
        "steps": get_cascade_sequence(junction, df)
    }

@app.get("/api/similar")
def similar(event_cause: str = "accident", junction: str = "all"):
    return get_similar_incidents(event_cause, junction, df)

@app.post("/api/simulate")
async def simulate(body: dict):
    incident = body.get("incident", "accident")
    junction = body.get("junction", "SilkBoardJunc")
    return run_scenario(incident, junction, df)

@app.post("/api/ai-brief")
async def ai_brief(body: dict):
    junction = body.get("junction", "SilkBoardJunc")
    event_cause = body.get("event_cause", "accident")
    risk_score = body.get("risk_score", 84)
    zone = body.get("zone", "")
    cascade_steps = body.get("cascade_steps", [])
    return generate_ai_brief(event_cause, junction, risk_score, cascade_steps, zone)

@app.get("/api/emergency-corridor")
def emergency_corridor(lat: float = 12.9175, lon: float = 77.6227):
    return get_emergency_corridor(lat, lon)

@app.get("/api/corridors")
def corridors():
    return get_corridor_risk(df)

@app.get("/api/hourly")
def hourly():
    return get_hourly_pattern(df)