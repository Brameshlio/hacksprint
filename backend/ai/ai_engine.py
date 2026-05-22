import os
import uvicorn
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest

# Initialize FastAPI App
app = FastAPI(
    title="NutriChain AI Threat Intelligence Pipeline",
    description="Machine Learning service utilizing unsupervised Isolation Forest anomaly detection models.",
    version="1.0.0"
)

# Enable CORS for middle tier access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------
# MACHINE LEARNING ENGINE DESIGN (UNSUPERVISED ISOLATION FOREST)
# ------------------------------------------------------------------------
# Standard training baseline setup. We'll populate a training dataframe with normal
# logistic distribution clusters: standard delivery transit speeds, regional retail hops.
# Columns: [scan_velocity, geo_distance_delta, total_scan_count]
np.random.seed(42)

# Generate normal logs (legitimate supplement transport chains)
# Speeds: 2 km/h (walking/handling) to 120 km/h (freight shipping)
normal_velocities = np.random.uniform(2.0, 110.0, size=500)
# Distances: local blocks up to regional retail transfers (1km to 150km)
normal_distances = np.random.uniform(0.1, 150.0, size=500)
# Standard Scan Counts (normally 1 or 2 verifications)
normal_scan_counts = np.random.randint(1, 4, size=500)

train_data = pd.DataFrame({
    'scan_velocity': normal_velocities,
    'geo_distance_delta': normal_distances,
    'total_scan_count': normal_scan_counts
})

# Instantiate the Isolation Forest outlier detector
# Contamination set to 0.05 representing a 5% expected baseline counterfeit infiltration rate.
model = IsolationForest(
    n_estimators=150,
    contamination=0.05,
    random_state=42
)
# Fit model to the standard logistic baseline
model.fit(train_data)
print("🛡️  Isolation Forest ML engine trained and active on normal transit clusters.")

# ------------------------------------------------------------------------
# DATA TRANSFER MODELS
# ------------------------------------------------------------------------
class ScanTelemetry(BaseModel):
    childId: str
    scan_velocity: float       # in km/h
    geo_distance_delta: float  # in km
    time_delta_seconds: float  # time since last check-in
    total_scan_count: int      # total number of checks recorded for this container

class AnalysisResponse(BaseModel):
    childId: str
    anomaly_score: float
    is_anomaly: bool
    verdict: str

# ------------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------------
@app.get("/")
def get_health():
    return {"status": "HEALTHY", "model": "Isolation Forest", "contamination_ratio": 0.05}

@app.post("/analyze-scan", response_model=AnalysisResponse)
def analyze_scan(payload: ScanTelemetry):
    try:
        # Wrap parameters into pandas schema structure for prediction
        input_df = pd.DataFrame([{
            'scan_velocity': payload.scan_velocity,
            'geo_distance_delta': payload.geo_distance_delta,
            'total_scan_count': payload.total_scan_count
        }])
        
        # Predict outlier score
        # decision_function outputs: smaller / negative values imply high anomaly severity
        score = model.decision_function(input_df)[0]
        # convert score to positive threat score between [0, 1]
        normalized_threat_score = float(1.0 - (score + 0.5)) 
        normalized_threat_score = max(0.01, min(0.99, normalized_threat_score))

        # Isolation Forest prediction: returns -1 for anomaly, 1 for normal
        prediction = model.predict(input_df)[0]
        is_anomaly = bool(prediction == -1)

        # Flag immediate mathematical threat overrides (hard structural protection rules)
        if payload.total_scan_count <= 1:
            is_anomaly = False
            normalized_threat_score = 0.10
            verdict = "STABLE SUPPLY VECTOR"
        # 1. Scanned in London/New York inside minutes (impossible velocity delta)
        elif payload.scan_velocity > 800.0 and payload.geo_distance_delta > 100.0:
            is_anomaly = True
            normalized_threat_score = 0.98
            verdict = "CRITICAL THREAT: Impossible Travel Speed Detected."
        # 2. Cloned barcode loop (scans count exceeds consumer bounds)
        elif payload.total_scan_count > 5:
            is_anomaly = True
            normalized_threat_score = 0.89
            verdict = "CRITICAL THREAT: QR Identifier Scan Limit Trips."
        else:
            verdict = "AI ANOMALY FLAGGED" if is_anomaly else "STABLE SUPPLY VECTOR"

        print(f"📊 Scan evaluation complete for {payload.childId}: threat_score={normalized_threat_score:.4f}, anomaly={is_anomaly}")

        return AnalysisResponse(
            childId=payload.childId,
            anomaly_score=normalized_threat_score,
            is_anomaly=is_anomaly,
            verdict=verdict
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI engine prediction collapse: {str(e)}")

# ------------------------------------------------------------------------
# LOCAL SERVER ENTRY POINT
# ------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
