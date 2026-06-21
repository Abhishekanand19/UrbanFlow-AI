import os
import json
from dotenv import load_dotenv

load_dotenv()

def _rules_engine_brief(event_cause: str, junction: str, risk_score: int, cascade_steps: list):
    """Fallback when Gemini fails — deterministic rules-based brief"""
    officers = 8 if risk_score > 70 else 5
    delay_without = 24 if risk_score > 70 else 15
    delay_with = int(delay_without * 0.45)
    reduction = int((1 - delay_with / delay_without) * 100)
    
    return {
        "severity_level": "CRITICAL" if risk_score > 70 else "HIGH" if risk_score > 40 else "MODERATE",
        "actions": [
            {"type": "officer_deployment", "description": f"Deploy {officers} officers to {junction} immediately", "count": officers},
            {"type": "barricade", "description": f"Place barricades at entry and exit points of {junction}"},
            {"type": "diversion", "description": "Activate alternate diversion route via parallel arterial road"},
            {"type": "emergency_corridor", "description": "Maintain clear corridor to nearest hospital — no diversions on this route"},
        ],
        "expected_delay_reduction_pct": reduction,
        "estimated_delay_without_ai_mins": delay_without,
        "estimated_delay_with_ai_mins": delay_with,
        "vehicle_hours_saved": officers * 52,
        "fuel_saved_liters": officers * 26,
        "co2_saved_kg": officers * 60,
        "economic_savings_lakhs": round(officers * 1.1, 1),
        "summary": f"A {event_cause.replace('_',' ')} incident at {junction} is causing network stress with risk score {risk_score}/100. Immediate officer deployment and diversion activation can reduce delays by {reduction}%.",
        "source": "rules_engine"
    }

def generate_ai_brief(event_cause: str, junction: str, risk_score: int,
                       cascade_steps: list, zone: str = ""):
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("No GEMINI_API_KEY")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""You are an AI traffic operations assistant for Bengaluru city.

A traffic disruption has been detected:
- Event Cause: {event_cause}
- Junction: {junction}
- Zone: {zone}
- Risk Score: {risk_score}/100
- Cascade Steps: {json.dumps(cascade_steps[:3])}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{{
  "severity_level": "CRITICAL",
  "actions": [
    {{"type": "officer_deployment", "description": "Deploy 8 officers to {junction} by 6:15 PM", "count": 8}},
    {{"type": "barricade", "description": "Place barricades at key entry points"}},
    {{"type": "diversion", "description": "Activate diversion via Hosur Road service road"}},
    {{"type": "emergency_corridor", "description": "Protect route to nearest hospital"}}
  ],
  "expected_delay_reduction_pct": 54,
  "estimated_delay_without_ai_mins": 24,
  "estimated_delay_with_ai_mins": 11,
  "vehicle_hours_saved": 420,
  "fuel_saved_liters": 210,
  "co2_saved_kg": 490,
  "economic_savings_lakhs": 8.4,
  "summary": "Brief operational summary in 2 sentences.",
  "source": "gemini"
}}

Use real Bengaluru road names near {junction}. Return ONLY valid JSON."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown fences if present
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        result["source"] = "gemini"
        return result
        
    except Exception as e:
        print(f"Gemini failed: {e} — using rules engine fallback")
        return _rules_engine_brief(event_cause, junction, risk_score, cascade_steps)