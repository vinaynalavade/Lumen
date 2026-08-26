import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["app"] == "Lumen"


def test_user_registration_no_automatic_qa_title(client: TestClient):
    # 1. Register without job title
    reg_payload = {
        "email": "architect@company.com",
        "password": "SecurePassword123!",
        "full_name": "Sarah Connor"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["email"] == "architect@company.com"
    assert data["full_name"] == "Sarah Connor"
    # MUST NOT automatically assume QA Engineer
    assert data["professional_title"] is None

    # 2. Login & verify profile
    login_res = client.post("/api/v1/auth/login", json={
        "email": "architect@company.com",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["professional_title"] is None

    # 3. Update professional title (e.g. Solution Architect)
    update_res = client.put(
        "/api/v1/users/profile",
        json={"professional_title": "Solution Architect"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["professional_title"] == "Solution Architect"

    # Verify updated profile persists
    me_after = client.get("/api/v1/auth/me", headers=headers)
    assert me_after.json()["professional_title"] == "Solution Architect"


def test_workspace_and_project_flow_with_owner_role(client: TestClient):
    # Register & Login
    reg_payload = {
        "email": "lead@lumen.qa",
        "password": "SecurePassword123!",
        "full_name": "Alex Mercer",
        "professional_title": "Test Lead"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "lead@lumen.qa",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify professional title in token user
    assert login_res.json()["user"]["professional_title"] == "Test Lead"

    # Create Workspace -> Must automatically become OWNER
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
    assert ws_list_res.json()[0]["current_user_role"] == "OWNER"

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

    # Project Summary
    sum_res = client.get(f"/api/v1/projects/{project_id}/summary", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["total_test_cases"] == 0


def test_rbac_workspace_roles_and_permissions(client: TestClient):
    # 1. Create Owner User
    client.post("/api/v1/auth/register", json={
        "email": "owner@company.com",
        "password": "Password123!",
        "full_name": "Workspace Owner",
        "professional_title": "Engineering Manager"
    })
    owner_token = client.post("/api/v1/auth/login", json={
        "email": "owner@company.com",
        "password": "Password123!"
    }).json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # Create Workspace
    ws_res = client.post("/api/v1/workspaces", json={"name": "Security & RBAC Lab"}, headers=owner_headers)
    ws_id = ws_res.json()["id"]

    # 2. Register Viewer User
    client.post("/api/v1/auth/register", json={
        "email": "viewer@company.com",
        "password": "Password123!",
        "full_name": "Auditor Bob",
        "professional_title": "Business Analyst"
    })
    viewer_token = client.post("/api/v1/auth/login", json={
        "email": "viewer@company.com",
        "password": "Password123!"
    }).json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Add viewer to workspace with VIEWER role
    add_res = client.post(
        f"/api/v1/workspaces/{ws_id}/members",
        json={"email": "viewer@company.com", "role": "VIEWER"},
        headers=owner_headers,
    )
    assert add_res.status_code == 201
    assert add_res.json()["role"] == "VIEWER"

    # Viewer can READ workspace details
    view_ws_res = client.get(f"/api/v1/workspaces/{ws_id}", headers=viewer_headers)
    assert view_ws_res.status_code == 200
    assert view_ws_res.json()["current_user_role"] == "VIEWER"

    # Viewer CANNOT update workspace settings (403)
    edit_ws_res = client.put(
        f"/api/v1/workspaces/{ws_id}",
        json={"name": "Hacked Name"},
        headers=viewer_headers,
    )
    assert edit_ws_res.status_code == 403

    # Viewer CANNOT create projects (403)
    create_proj_res = client.post(
        f"/api/v1/workspaces/{ws_id}/projects",
        json={"name": "Forbidden Project", "key": "FORB"},
        headers=viewer_headers,
    )
    assert create_proj_res.status_code == 403

    # Owner creates a project
    proj_res = client.post(
        f"/api/v1/workspaces/{ws_id}/projects",
        json={"name": "Allowed Project", "key": "ALLOW"},
        headers=owner_headers,
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Viewer CANNOT create test cases in project (403)
    tc_fail_res = client.post(
        f"/api/v1/projects/{proj_id}/test-cases",
        json={"title": "Viewer Case Attempt"},
        headers=viewer_headers,
    )
    assert tc_fail_res.status_code == 403

    # Viewer CANNOT create test modules (403)
    mod_fail_res = client.post(
        f"/api/v1/projects/{proj_id}/modules",
        json={"name": "Viewer Module Attempt"},
        headers=viewer_headers,
    )
    assert mod_fail_res.status_code == 403
