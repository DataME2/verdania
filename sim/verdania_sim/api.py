"""HTTP API for the engine. Called only by the web app's server; never exposed to browsers.

Auth: every request must carry X-Sim-Key equal to SIM_API_KEY. Without SIM_API_KEY the service
refuses requests unless SIM_DEV=1 (local development).
"""

import hmac
import os
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from . import engine
from .params import BASELINE, CALIBRATION, LEVERS, MODEL_VERSION, PRESETS, STRUCTURAL

app = FastAPI(title="Verdania simulation engine", version=MODEL_VERSION,
              description="Fictional country, synthetic data. Outputs are model results, not forecasts.")


def require_key(x_sim_key: str | None = Header(default=None)):
    expected = os.environ.get("SIM_API_KEY")
    if not expected:
        if os.environ.get("SIM_DEV") == "1":
            return
        raise HTTPException(503, "SIM_API_KEY is not configured")
    if not x_sim_key or not hmac.compare_digest(x_sim_key, expected):
        raise HTTPException(401, "invalid or missing X-Sim-Key")


class SimRequest(BaseModel):
    preset: str | None = None
    levers: dict[str, float | str] = Field(default_factory=dict)
    horizon: Literal[1, 5, 10, 20] = 10
    structural: dict[str, float] = Field(default_factory=dict)
    mode: Literal["interactive", "full"] = "interactive"
    mc_seed: int = Field(engine.DEFAULT_MC_SEED, ge=0, le=2**31 - 1)
    model_version: str | None = None


@app.get("/v1/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


@app.get("/v1/parameters", dependencies=[Depends(require_key)])
def parameters():
    as_dict = lambda reg: [p.__dict__ for p in reg.values()]  # noqa: E731
    return {"model_version": MODEL_VERSION, "levers": as_dict(LEVERS), "baseline": BASELINE,
            "structural": as_dict(STRUCTURAL), "calibration": CALIBRATION, "presets": PRESETS,
            "indicators": {c: {"label": l, "unit": u, "desirable": d} for c, (l, u, d) in engine.INDICATORS.items()}}


@app.post("/v1/sensitivity", dependencies=[Depends(require_key)])
def sensitivity(req: SimRequest):
    if req.model_version and req.model_version != MODEL_VERSION:
        raise HTTPException(409, f"this engine runs model {MODEL_VERSION}, not {req.model_version}")
    try:
        return engine.sensitivity(levers=req.levers, preset=req.preset, horizon=req.horizon, structural=req.structural)
    except ValueError as err:
        raise HTTPException(422, str(err)) from err


@app.post("/v1/simulate", dependencies=[Depends(require_key)])
def simulate(req: SimRequest):
    if req.model_version and req.model_version != MODEL_VERSION:
        raise HTTPException(409, f"this engine runs model {MODEL_VERSION}, not {req.model_version}")
    try:
        return engine.run(levers=req.levers, preset=req.preset, horizon=req.horizon,
                          structural=req.structural, mode=req.mode, mc_seed=req.mc_seed)
    except ValueError as err:
        raise HTTPException(422, str(err)) from err
