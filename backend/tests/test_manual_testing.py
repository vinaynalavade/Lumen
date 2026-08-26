import pytest
from fastapi.testclient import TestClient


def test_complete_manual_testing_flow(client: TestClient):
    # 1. Register & Login
    reg_payload = {
        "email": "qa.engineer@lumen.qa",
        "password": "SecurePassword123!",
        "full_name": "QA Specialist"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "qa.engineer@lumen.qa",
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

    # 4. Create Test Case with Steps (STORE-TC-1)
    case_payload = {
        "title": "Verify login with valid credentials",
        "module_id": module_id,
        "template_type": "STANDARD",
        "priority": "HIGH",
        "status": "ACTIVE",
        "preconditions": "Active registered user account exists",
        "test_data": "user@lumen.qa / password123",
        "expected_result": "User lands on dashboard",
        "steps": [
            {
                "step_number": 1,
                "action": "Navigate to /login",
                "expected_result": "Login page rendered with email & password fields"
            },
            {
                "step_number": 2,
                "action": "Enter valid email and password",
                "expected_result": "Input fields populated"
            },
            {
                "step_number": 3,
                "action": "Click 'Sign In'",
                "expected_result": "Redirected to /dashboard and JWT token stored"
            }
        ]
    }
    tc_res = client.post(f"/api/v1/projects/{project_id}/test-cases", json=case_payload, headers=headers)
    assert tc_res.status_code == 201
    tc1 = tc_res.json()
    assert tc1["key"] == "STORE-TC-1"
    assert tc1["case_number"] == 1
    assert len(tc1["steps"]) == 3
    case1_id = tc1["id"]

    # Create second case (STORE-TC-2)
    tc2_res = client.post(
        f"/api/v1/projects/{project_id}/test-cases",
        json={
            "title": "Verify password reset link generation",
            "module_id": module_id,
            "priority": "MEDIUM",
            "template_type": "SIMPLE",
            "expected_result": "Reset token generated and email dispatched"
        },
        headers=headers,
    )
    assert tc2_res.status_code == 201
    assert tc2_res.json()["key"] == "STORE-TC-2"
    case2_id = tc2_res.json()["id"]

    # 5. Create Test Suite
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

    # 6. Create Test Run (Execution Instance with Snapshots)
    run_payload = {
        "name": "Sprint 14 Smoke Validation",
        "environment": "Staging",
        "suite_id": suite_id
    }
    run_res = client.post(f"/api/v1/projects/{project_id}/runs", json=run_payload, headers=headers)
    assert run_res.status_code == 201
    run = run_res.json()
    assert run["name"] == "Sprint 14 Smoke Validation"
    assert run["total_items"] == 2
    assert run["untested_count"] == 2
    assert run["status"] == "IN_PROGRESS"
    run_id = run["id"]
    item1 = run["items"][0]
    item2 = run["items"][1]

    # 7. Test Snapshot Immutability
    # Update the source test case to change title and add a 4th step
    client.put(
        f"/api/v1/test-cases/{case1_id}",
        json={
            "title": "MODIFIED TITLE AFTER RUN",
            "steps": [
                {"step_number": 1, "action": "A", "expected_result": "B"},
                {"step_number": 2, "action": "C", "expected_result": "D"},
                {"step_number": 3, "action": "E", "expected_result": "F"},
                {"step_number": 4, "action": "NEW STEP 4", "expected_result": "G"},
            ]
        },
        headers=headers,
    )
    # Verify the test run item still retains the original snapshot title and 3 steps
    run_detail_res = client.get(f"/api/v1/runs/{run_id}", headers=headers)
    assert run_detail_res.status_code == 200
    snapshot_item1 = run_detail_res.json()["items"][0]
    assert snapshot_item1["title"] == "Verify login with valid credentials"
    assert len(snapshot_item1["step_results"]) == 3

    # 8. Execute Test Run Item 1 (Mark as PASSED)
    exec_res1 = client.post(
        f"/api/v1/runs/{run_id}/items/{item1['id']}/execute",
        json={
            "status": "PASSED",
            "actual_result": "Login successful, redirected to dashboard without issues.",
            "duration_seconds": 15,
            "step_results": [
                {"step_number": 1, "status": "PASSED"},
                {"step_number": 2, "status": "PASSED"},
                {"step_number": 3, "status": "PASSED"}
            ]
        },
        headers=headers,
    )
    assert exec_res1.status_code == 200
    assert exec_res1.json()["status"] == "PASSED"

    # 9. Execute Test Run Item 2 (Mark as FAILED with evidence)
    exec_res2 = client.post(
        f"/api/v1/runs/{run_id}/items/{item2['id']}/execute",
        json={
            "status": "FAILED",
            "actual_result": "HTTP 500 Internal Server Error received on password reset request.",
            "notes": "Mailer daemon service was unreachable.",
            "duration_seconds": 25
        },
        headers=headers,
    )
    assert exec_res2.status_code == 200
    assert exec_res2.json()["status"] == "FAILED"

    # Attach Evidence Log
    ev_res = client.post(
        f"/api/v1/runs/{run_id}/items/{item2['id']}/evidence",
        json={
            "evidence_type": "LOG_TEXT",
            "title": "Mailer Daemon Error Trace",
            "content": "SMTPConnectionTimeout: Connection to smtp.internal:587 timed out after 10000ms"
        },
        headers=headers,
    )
    assert ev_res.status_code == 200
    assert ev_res.json()["title"] == "Mailer Daemon Error Trace"

    # 10. Verify Test Run Completion & Metrics
    run_final_res = client.get(f"/api/v1/runs/{run_id}", headers=headers)
    final_run = run_final_res.json()
    assert final_run["status"] == "COMPLETED"
    assert final_run["passed_count"] == 1
    assert final_run["failed_count"] == 1
    assert final_run["completion_percentage"] == 100.0

    # 11. Verify Test Case Execution History
    hist_res = client.get(f"/api/v1/test-cases/{case1_id}/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1
    assert history[0]["status"] == "PASSED"
    assert history[0]["test_run_name"] == "Sprint 14 Smoke Validation"

    # 12. Verify Project Summary Metrics
    sum_res = client.get(f"/api/v1/projects/{project_id}/summary", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["total_test_cases"] == 2
    assert sum_res.json()["total_test_runs"] == 1
