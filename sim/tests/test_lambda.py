import json

import pytest

from verdania_sim import lambda_handler


def event(path="/v1/simulate", method="POST", body=None, key="secret"):
    headers = {"content-type": "application/json"} | ({"x-sim-key": key} if key else {})
    return {"rawPath": path, "requestContext": {"http": {"method": method}}, "headers": headers,
            "body": json.dumps(body) if body is not None else None, "isBase64Encoded": False}


@pytest.fixture(autouse=True)
def key(monkeypatch):
    monkeypatch.setenv("SIM_API_KEY", "secret")


def call(ev):
    r = lambda_handler.handler(ev, None)
    return r["statusCode"], json.loads(r["body"])


def test_health_needs_no_key():
    assert call(event("/v1/health", "GET", key=None))[0] == 200


def test_rejects_missing_or_wrong_key(monkeypatch):
    assert call(event(body={}, key=None))[0] == 401
    assert call(event(body={}, key="wrong"))[0] == 401
    monkeypatch.delenv("SIM_API_KEY")
    assert call(event(body={}))[0] == 401  # fails closed without a configured key


def test_simulates():
    status, body = call(event(body={"preset": "C", "levers": {"bite": 0.6}, "horizon": 5}))
    assert status == 200
    assert body["inputs"]["levers"]["bite"] == 0.6 and len(body["years"]) == 6


def test_sensitivity_route():
    status, body = call(event("/v1/sensitivity", body={"preset": "C", "horizon": 5}))
    assert status == 200 and len(body["rows"]) == 23
    assert call(event("/v1/sensitivity", body={"structural": {"psi": 9}}))[0] == 422


@pytest.mark.parametrize("body", [
    {"levers": {"tau_top": 0.95}},
    {"horizon": 7},
    {"mode": "full"},
    {"unexpected": 1},
])
def test_rejects_invalid_requests(body):
    assert call(event(body=body))[0] == 422


def test_other_routes_and_bad_json():
    assert call(event("/v1/parameters", "GET"))[0] == 404
    bad = event()
    bad["body"] = "{nope"
    assert call(bad)[0] == 400
