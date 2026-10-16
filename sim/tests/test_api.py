from fastapi.testclient import TestClient

from verdania_sim.api import app

client = TestClient(app)


def test_requires_key(monkeypatch):
    monkeypatch.setenv("SIM_API_KEY", "secret")
    assert client.post("/v1/simulate", json={}).status_code == 401
    assert client.post("/v1/simulate", json={}, headers={"X-Sim-Key": "wrong"}).status_code == 401
    assert client.get("/v1/health").status_code == 200


def test_fails_closed_without_configured_key(monkeypatch):
    monkeypatch.delenv("SIM_API_KEY", raising=False)
    monkeypatch.delenv("SIM_DEV", raising=False)
    assert client.post("/v1/simulate", json={}).status_code == 503


def test_simulate(monkeypatch):
    monkeypatch.setenv("SIM_API_KEY", "secret")
    h = {"X-Sim-Key": "secret"}
    r = client.post("/v1/simulate", json={"preset": "B", "horizon": 5, "levers": {"bite": 0.55}}, headers=h)
    assert r.status_code == 200
    assert r.json()["inputs"]["levers"]["bite"] == 0.55
    assert client.post("/v1/simulate", json={"levers": {"bite": 0.99}}, headers=h).status_code == 422
    assert client.post("/v1/simulate", json={"horizon": 3}, headers=h).status_code == 422
    assert client.post("/v1/simulate", json={"model_version": "9.9.9"}, headers=h).status_code == 409
    assert client.get("/v1/parameters", headers=h).json()["model_version"] == "0.1.0"
