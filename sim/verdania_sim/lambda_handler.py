"""AWS Lambda entry point behind a Function URL. Same contract as api.py, without a web framework,
so the deployment bundle is this package plus NumPy.

Only interactive runs are served here; full mode (~12 s, mostly its 200 draws) belongs in a background
job. /v1/sensitivity serves full mode's one-at-a-time sensitivity on its own (about a second).
"""

import base64
import hmac
import json
import os

from . import engine
from .params import MODEL_VERSION

ALLOWED = {"preset", "levers", "horizon", "structural", "mode", "mc_seed", "model_version"}

# Warm-up during Lambda's init phase (full CPU, not billed per request): the population and the
# most common baseline are ready before the first visitor's request arrives.
engine.run(horizon=10)


def _resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(body)}


def handler(event, context):
    path = event.get("rawPath", "/")
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    if path == "/v1/health":
        return _resp(200, {"status": "ok", "model_version": MODEL_VERSION})

    expected = os.environ.get("SIM_API_KEY", "")
    given = (event.get("headers") or {}).get("x-sim-key", "")  # Function URLs lower-case header names
    if not expected or not hmac.compare_digest(given, expected):
        return _resp(401, {"detail": "invalid or missing X-Sim-Key"})
    if path not in ("/v1/simulate", "/v1/sensitivity") or method != "POST":
        return _resp(404, {"detail": "not found"})

    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode()
    try:
        req = json.loads(raw)
    except ValueError:
        return _resp(400, {"detail": "invalid JSON"})
    if not isinstance(req, dict) or set(req) - ALLOWED:
        return _resp(422, {"detail": "unexpected fields"})
    if req.get("model_version") not in (None, MODEL_VERSION):
        return _resp(409, {"detail": f"this engine runs model {MODEL_VERSION}"})
    if req.get("mode", "interactive") != "interactive":
        return _resp(422, {"detail": "only interactive mode is served here"})

    try:
        if path == "/v1/sensitivity":
            return _resp(200, engine.sensitivity(levers=req.get("levers") or {}, preset=req.get("preset"),
                                                 horizon=req.get("horizon", 10), structural=req.get("structural") or {}))
        result = engine.run(
            levers=req.get("levers") or {},
            preset=req.get("preset"),
            horizon=req.get("horizon", 10),
            structural=req.get("structural") or {},
            mode="interactive",
            mc_seed=int(req.get("mc_seed", engine.DEFAULT_MC_SEED)),
        )
    except (ValueError, TypeError) as err:
        return _resp(422, {"detail": str(err)})
    return _resp(200, result)
