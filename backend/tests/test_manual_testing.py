import pytest
from fastapi.testclient import TestClient


def test_complete_manual_testing_flow_with_rich_structure(client: TestClient):
    # 1. Register & Login
    reg_payload = {
        "email": "qa.specialist@lumen.qa",
        "password": "SecurePassword123!",
        "full_name": "QA Specialist",
        "professional_title": "Senior QA Engineer"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "qa.specialist@lumen.qa",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Workspace & Project
    ws_res = client.post("/api/v1/workspaces", json={"name": "E-Commerce QA"}, headers=headers)
    ws_id = ws_res.json()["id"]

    proj_res = client.post(
        f"/api/v1/workspaces/{ws_id}/projects",
        json={"name": "Storefront Web App", "key": "STORE"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # 3. Create Test Module / Folder
    mod_res = client.post(
        f"/api/v1/projects/{project_id}/modules",
        json={"name": "Authentication", "description": "Login, register and OAuth flows"},
        headers=headers,
    )
    assert mod_res.status_code == 201
    module_id = mod_res.json()["id"]

    # 4. Create Test Case with Steps, Preconditions, Global Test Data, Step-specific Test Data, Test Type, Tags (STORE-TC-1)
    case_payload = {
        "title": "Verify login with valid credentials",
        "module_id": module_id,
        "template_type": "STANDARD",
        "test_type": "SMOKE",
        "priority": "HIGH",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "review_status": "APPROVED",
        "tags": ["Auth", "Login", "Smoke", "Release-1.0"],
        "preconditions": "Active registered user account exists in authentication database",
        "test_data": "Global: validuser@lumen.qa / SecurePass123",
        "expected_result": "User lands on project cockpit with active token",
        "steps": [
            {
                "step_number": 1,
                "action": "Navigate to /login",
                "expected_result": "Login form rendered with email & password fields",
                "test_data": "URL: https://app.lumen.qa/login"
            },
            {
                "step_number": 2,
                "action": "Enter valid email and password",
                "expected_result": "Input fields populated without masking errors",
                "test_data": "validuser@lumen.qa / SecurePass123"
            },
            {
                "step_number": 3,
                "action": "Click 'Sign In'",
                "expected_result": "Redirected to /projects and JWT token stored in localStorage",
                "test_data": None
            }
        ]
    }
    tc_res = client.post(f"/api/v1/projects/{project_id}/test-cases", json=case_payload, headers=headers)
    assert tc_res.status_code == 201
    tc1 = tc_res.json()
    assert tc1["key"] == "STORE-TC-1"
    assert tc1["case_number"] == 1
    assert tc1["test_type"] == "SMOKE"
    assert "Smoke" in tc1["tags"]
    assert "Release-1.0" in tc1["tags"]
    assert tc1["preconditions"] == "Active registered user account exists in authentication database"
    assert tc1["test_data"] == "Global: validuser@lumen.qa / SecurePass123"
    assert len(tc1["steps"]) == 3
    assert tc1["steps"][0]["test_data"] == "URL: https://app.lumen.qa/login"
    assert tc1["steps"][1]["test_data"] == "validuser@lumen.qa / SecurePass123"
    case1_id = tc1["id"]

    # Create second case (STORE-TC-2) with NEGATIVE test type
    tc2_res = client.post(
        f"/api/v1/projects/{project_id}/test-cases",
        json={
            "title": "Verify password reset link with non-existent email",
            "module_id": module_id,
            "template_type": "SIMPLE",
            "test_type": "NEGATIVE",
            "priority": "MEDIUM",
            "severity": "MEDIUM",
            "status": "ACTIVE",
            "review_status": "APPROVED",
            "tags": ["Auth", "PasswordReset", "Negative"],
            "preconditions": "Email service is running",
            "test_data": "nonexistent@nowhere.com",
            "expected_result": "Generic confirmation displayed without leaking account existence"
        },
        headers=headers,
    )
    assert tc2_res.status_code == 201
    tc2 = tc2_res.json()
    assert tc2["key"] == "STORE-TC-2"
    assert tc2["test_type"] == "NEGATIVE"
    case2_id = tc2["id"]

    # 5. Filter Test Cases by Test Type & Tags
    filter_smoke = client.get(f"/api/v1/projects/{project_id}/test-cases?test_type=SMOKE", headers=headers)
    assert filter_smoke.status_code == 200
    assert len(filter_smoke.json()) == 1
    assert filter_smoke.json()[0]["key"] == "STORE-TC-1"

    filter_tag = client.get(f"/api/v1/projects/{project_id}/test-cases?tag=PasswordReset", headers=headers)
    assert filter_tag.status_code == 200
    assert len(filter_tag.json()) == 1
    assert filter_tag.json()[0]["key"] == "STORE-TC-2"

    # 6. Test Step Reordering on Edit
    reorder_res = client.put(
        f"/api/v1/test-cases/{case1_id}",
        json={
            "steps": [
                {"step_number": 1, "action": "Step 1 Reordered", "expected_result": "Result 1", "test_data": "Data 1"},
                {"step_number": 2, "action": "Step 2 Reordered", "expected_result": "Result 2", "test_data": "Data 2"}
            ]
        },
        headers=headers,
    )
    assert reorder_res.status_code == 200
    assert len(reorder_res.json()["steps"]) == 2
    assert reorder_res.json()["steps"][0]["action"] == "Step 1 Reordered"

    # 7. Create Test Suite
    suite_payload = {
        "name": "Auth Smoke Suite",
        "description": "Critical path smoke validation for auth module",
        "test_case_ids": [case1_id, case2_id]
    }
    suite_res = client.post(f"/api/v1/projects/{project_id}/suites", json=suite_payload, headers=headers)
    assert suite_res.status_code == 201
    suite = suite_res.json()
    assert suite["name"] == "Auth Smoke Suite"
    assert suite["test_case_count"] == 2
    suite_id = suite["id"]

    # 8. Create Test Run (Execution Session with Snapshots)
    run_payload = {
        "name": "Sprint 14 Release Validation",
        "environment": "Staging",
        "suite_id": suite_id
    }
    run_res = client.post(f"/api/v1/projects/{project_id}/runs", json=run_payload, headers=headers)
    assert run_res.status_code == 201
    run = run_res.json()
    assert run["name"] == "Sprint 14 Release Validation"
    assert run["total_items"] == 2
    assert run["untested_count"] == 2
    assert run["status"] == "IN_PROGRESS"
    run_id = run["id"]
    item1 = run["items"][0]
    item2 = run["items"][1]

    # Verify snapshot captured test_type, tags, preconditions, global test_data, and step test_data
    assert item1["test_type"] == "SMOKE"
    assert "Smoke" in item1["tags"]
    assert len(item1["step_results"]) == 2
    assert item1["step_results"][0]["test_data"] == "Data 1"

    # 9. Test Snapshot Immutability:
    # Modify source test case STORE-TC-1 (change title and replace steps completely)
    client.put(
        f"/api/v1/test-cases/{case1_id}",
        json={
            "title": "COMPLETELY CHANGED SOURCE TITLE",
            "test_type": "REGRESSION",
            "steps": [
                {"step_number": 1, "action": "Brand New Step", "expected_result": "Brand New Exp", "test_data": "Brand New Data"}
            ]
        },
        headers=headers,
    )

    # Verify the test run item still preserves the historical execution snapshot!
    run_snapshot_res = client.get(f"/api/v1/runs/{run_id}", headers=headers)
    assert run_snapshot_res.status_code == 200
    snap_item1 = run_snapshot_res.json()["items"][0]
    assert snap_item1["title"] == "Verify login with valid credentials"
    assert snap_item1["test_type"] == "SMOKE"
    assert len(snap_item1["step_results"]) == 2
    assert snap_item1["step_results"][0]["action"] == "Step 1 Reordered"
    assert snap_item1["step_results"][0]["test_data"] == "Data 1"

    # 10. Execute Test Run Item 1 (PASSED)
    exec_res1 = client.post(
        f"/api/v1/runs/{run_id}/items/{item1['id']}/execute",
        json={
            "status": "PASSED",
            "actual_result": "All credentials validated, JWT active session issued.",
            "duration_seconds": 18,
            "step_results": [
                {"step_number": 1, "status": "PASSED", "actual_result": "Page loaded"},
                {"step_number": 2, "status": "PASSED", "actual_result": "Inputs accepted"}
            ]
        },
        headers=headers,
    )
    assert exec_res1.status_code == 200
    assert exec_res1.json()["status"] == "PASSED"

    # 11. Execute Test Run Item 2 (FAILED with evidence)
    exec_res2 = client.post(
        f"/api/v1/runs/{run_id}/items/{item2['id']}/execute",
        json={
            "status": "FAILED",
            "actual_result": "HTTP 500 returned due to unhandled database connection pool timeout.",
            "notes": "Backend service timed out after 30s.",
            "duration_seconds": 32
        },
        headers=headers,
    )
    assert exec_res2.status_code == 200
    assert exec_res2.json()["status"] == "FAILED"

    # Add evidence log
    ev_res = client.post(
        f"/api/v1/runs/{run_id}/items/{item2['id']}/evidence",
        json={
            "evidence_type": "LOG_TEXT",
            "title": "DB Connection Pool Exhaustion Log",
            "content": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached"
        },
        headers=headers,
    )
    assert ev_res.status_code == 200
    assert ev_res.json()["title"] == "DB Connection Pool Exhaustion Log"

    # 12. Verify Run Completion & Progress
    final_run_res = client.get(f"/api/v1/runs/{run_id}", headers=headers)
    final_run = final_run_res.json()
    assert final_run["status"] == "COMPLETED"
    assert final_run["passed_count"] == 1
    assert final_run["failed_count"] == 1
    assert final_run["completion_percentage"] == 100.0


def test_viewer_rbac_restrictions_on_manual_testing(client: TestClient):
    # 1. Register Owner & create workspace/project
    client.post("/api/v1/auth/register", json={
        "email": "owner2@lumen.qa",
        "password": "Password123!",
        "full_name": "Project Owner"
    })
    owner_token = client.post("/api/v1/auth/login", json={
        "email": "owner2@lumen.qa",
        "password": "Password123!"
    }).json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    ws_id = client.post("/api/v1/workspaces", json={"name": "Viewer Security WS"}, headers=owner_headers).json()["id"]
    proj_id = client.post(
        f"/api/v1/workspaces/{ws_id}/projects",
        json={"name": "Protected Project", "key": "PROT"},
        headers=owner_headers
    ).json()["id"]

    # Owner creates a module and test case
    mod_id = client.post(
        f"/api/v1/projects/{proj_id}/modules",
        json={"name": "Core Module"},
        headers=owner_headers
    ).json()["id"]

    tc_id = client.post(
        f"/api/v1/projects/{proj_id}/test-cases",
        json={"title": "Protected Test Case", "module_id": mod_id, "review_status": "APPROVED"},
        headers=owner_headers
    ).json()["id"]

    suite_id = client.post(
        f"/api/v1/projects/{proj_id}/suites",
        json={"name": "Protected Suite", "test_case_ids": [tc_id]},
        headers=owner_headers
    ).json()["id"]

    run_id = client.post(
        f"/api/v1/projects/{proj_id}/runs",
        json={"name": "Protected Run", "suite_id": suite_id},
        headers=owner_headers
    ).json()["id"]
    item_id = client.get(f"/api/v1/runs/{run_id}", headers=owner_headers).json()["items"][0]["id"]

    # 2. Register Viewer and add to workspace
    client.post("/api/v1/auth/register", json={
        "email": "viewer2@lumen.qa",
        "password": "Password123!",
        "full_name": "Viewer Only"
    })
    viewer_token = client.post("/api/v1/auth/login", json={
        "email": "viewer2@lumen.qa",
        "password": "Password123!"
    }).json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    client.post(
        f"/api/v1/workspaces/{ws_id}/members",
        json={"email": "viewer2@lumen.qa", "role": "VIEWER"},
        headers=owner_headers
    )

    # 3. Viewer CAN read
    assert client.get(f"/api/v1/projects/{proj_id}/modules", headers=viewer_headers).status_code == 200
    assert client.get(f"/api/v1/projects/{proj_id}/test-cases", headers=viewer_headers).status_code == 200
    assert client.get(f"/api/v1/test-cases/{tc_id}", headers=viewer_headers).status_code == 200
    assert client.get(f"/api/v1/projects/{proj_id}/suites", headers=viewer_headers).status_code == 200
    assert client.get(f"/api/v1/projects/{proj_id}/runs", headers=viewer_headers).status_code == 200
    assert client.get(f"/api/v1/runs/{run_id}", headers=viewer_headers).status_code == 200

    # 4. Viewer CANNOT write (all 403 Forbidden)
    assert client.post(f"/api/v1/projects/{proj_id}/modules", json={"name": "Fail"}, headers=viewer_headers).status_code == 403
    assert client.put(f"/api/v1/modules/{mod_id}", json={"name": "Fail"}, headers=viewer_headers).status_code == 403
    assert client.delete(f"/api/v1/modules/{mod_id}", headers=viewer_headers).status_code == 403
    assert client.post(f"/api/v1/projects/{proj_id}/test-cases", json={"title": "Fail"}, headers=viewer_headers).status_code == 403
    assert client.put(f"/api/v1/test-cases/{tc_id}", json={"title": "Fail"}, headers=viewer_headers).status_code == 403
    assert client.delete(f"/api/v1/test-cases/{tc_id}", headers=viewer_headers).status_code == 403
    assert client.post(f"/api/v1/projects/{proj_id}/suites", json={"name": "Fail"}, headers=viewer_headers).status_code == 403
    assert client.post(f"/api/v1/projects/{proj_id}/runs", json={"name": "Fail", "suite_id": suite_id}, headers=viewer_headers).status_code == 403
    assert client.post(f"/api/v1/runs/{run_id}/items/{item_id}/execute", json={"status": "PASSED"}, headers=viewer_headers).status_code == 403
    assert client.post(f"/api/v1/runs/{run_id}/items/{item_id}/evidence", json={"title": "Fail", "content": "Fail"}, headers=viewer_headers).status_code == 403
