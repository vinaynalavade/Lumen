import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["app"] == "Lumen"


def test_user_registration_and_login(client: TestClient):
    # 1. Register
    reg_payload = {
        "email": "test@lumen.qa",
        "password": "SecurePassword123!",
        "full_name": "Test QA Engineer"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["email"] == "test@lumen.qa"
    assert data["full_name"] == "Test QA Engineer"

    # 2. Login
    login_payload = {
        "email": "test@lumen.qa",
        "password": "SecurePassword123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Read profile
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "test@lumen.qa"


def test_workspace_and_project_flow(client: TestClient):
    # Register & Login
    reg_payload = {
        "email": "lead@lumen.qa",
        "password": "SecurePassword123!",
        "full_name": "Lead QA"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "lead@lumen.qa",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Workspace
    ws_payload = {
        "name": "Fintech Platform QA",
        "description": "QA workspace for Payment & Billing engines"
    }
    ws_res = client.post("/api/v1/workspaces", json=ws_payload, headers=headers)
    assert ws_res.status_code == 201
    ws = ws_res.json()
    assert ws["name"] == "Fintech Platform QA"
    assert ws["slug"] == "fintech-platform-qa"
    assert ws["current_user_role"] == "OWNER"
    workspace_id = ws["id"]

    # List Workspaces
    ws_list_res = client.get("/api/v1/workspaces", headers=headers)
    assert ws_list_res.status_code == 200
    assert len(ws_list_res.json()) == 1

    # Create Project
    proj_payload = {
        "name": "Payments Service",
        "key": "PAY",
        "description": "Core payment gateway and card processing APIs"
    }
    proj_res = client.post(f"/api/v1/workspaces/{workspace_id}/projects", json=proj_payload, headers=headers)
    assert proj_res.status_code == 201
    proj = proj_res.json()
    assert proj["name"] == "Payments Service"
    assert proj["key"] == "PAY"
    assert proj["status"] == "ACTIVE"
    project_id = proj["id"]

    # List Projects in Workspace
    proj_list_res = client.get(f"/api/v1/workspaces/{workspace_id}/projects", headers=headers)
    assert proj_list_res.status_code == 200
    assert len(proj_list_res.json()) == 1

    # Project Summary
    sum_res = client.get(f"/api/v1/projects/{project_id}/summary", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["total_test_cases"] == 0
