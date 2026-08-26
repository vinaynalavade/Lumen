import pytest
from fastapi.testclient import TestClient
from app.models.organization import OrganizationRole
from app.models.manual_testing import TestCaseReviewStatus, TestCaseSeverity


def test_organization_crud_and_join_code(client: TestClient):
    # 1. Register user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": "alice.org@qa.io", "password": "Password123!", "full_name": "Alice Org Lead"},
    )
    assert reg_res.status_code == 201
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "alice.org@qa.io", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create organization
    org_res = client.post(
        "/api/v1/organizations",
        json={
            "name": "Acme Test Labs",
            "description": "Acme test organization",
            "create_default_workspace": True,
            "default_workspace_name": "Engineering QA",
        },
        headers=headers,
    )
    assert org_res.status_code == 201
    org_data = org_res.json()
    assert org_data["name"] == "Acme Test Labs"
    assert org_data["current_user_role"] == "OWNER"
    org_id = org_data["id"]

    # 3. Get Join Code
    code_res = client.get(f"/api/v1/organizations/{org_id}/join-code", headers=headers)
    assert code_res.status_code == 200
    join_code = code_res.json()["code"]
    assert join_code.startswith("LUMEN-")

    # 4. Register Bob and join via Join Code
    client.post(
        "/api/v1/auth/register",
        json={"email": "bob.org@qa.io", "password": "Password123!", "full_name": "Bob Tester"},
    )
    bob_login = client.post(
        "/api/v1/auth/login",
        json={"email": "bob.org@qa.io", "password": "Password123!"},
    )
    bob_headers = {"Authorization": f"Bearer {bob_login.json()['access_token']}"}

    join_res = client.post(
        "/api/v1/organizations/join-by-code",
        json={"join_code": join_code},
        headers=bob_headers,
    )
    assert join_res.status_code == 200
    assert join_res.json()["id"] == org_id
    assert join_res.json()["current_user_role"] == "MEMBER"

    # 5. Verify members list
    members_res = client.get(f"/api/v1/organizations/{org_id}/members", headers=headers)
    assert members_res.status_code == 200
    members = members_res.json()
    assert len(members) == 2


def test_organization_invite_token_flow(client: TestClient):
    # 1. Register admin
    client.post(
        "/api/v1/auth/register",
        json={"email": "admin.invite@qa.io", "password": "Password123!", "full_name": "Admin Invite"},
    )
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.invite@qa.io", "password": "Password123!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # 2. Create organization
    org_res = client.post(
        "/api/v1/organizations",
        json={"name": "Invites QA Org"},
        headers=admin_headers,
    )
    org_id = org_res.json()["id"]

    # 3. Create secure token invite
    invite_res = client.post(
        f"/api/v1/organizations/{org_id}/invites",
        json={"role": "ADMIN", "expires_in_days": 5, "max_uses": 2},
        headers=admin_headers,
    )
    assert invite_res.status_code == 201
    invite_token = invite_res.json()["token"]

    # 4. Public preview check (unauthenticated)
    preview_res = client.get(f"/api/v1/invites/{invite_token}")
    assert preview_res.status_code == 200
    assert preview_res.json()["is_valid"] is True
    assert preview_res.json()["organization_name"] == "Invites QA Org"
    assert preview_res.json()["role"] == "ADMIN"

    # 5. Register Carol and accept invite
    client.post(
        "/api/v1/auth/register",
        json={"email": "carol.invite@qa.io", "password": "Password123!", "full_name": "Carol Admin"},
    )
    carol_login = client.post(
        "/api/v1/auth/login",
        json={"email": "carol.invite@qa.io", "password": "Password123!"},
    )
    carol_headers = {"Authorization": f"Bearer {carol_login.json()['access_token']}"}

    accept_res = client.post(f"/api/v1/invites/{invite_token}/accept", headers=carol_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["current_user_role"] == "ADMIN"


def test_test_case_governance_review_and_execution_accountability(client: TestClient):
    # 1. Register QA Lead and Reviewer
    client.post(
        "/api/v1/auth/register",
        json={"email": "lead.gov@qa.io", "password": "Password123!", "full_name": "Lead Author"},
    )
    lead_login = client.post("/api/v1/auth/login", json={"email": "lead.gov@qa.io", "password": "Password123!"})
    lead_token = lead_login.json()["access_token"]
    lead_headers = {"Authorization": f"Bearer {lead_token}"}
    lead_id = lead_login.json()["user"]["id"]

    client.post(
        "/api/v1/auth/register",
        json={"email": "reviewer.gov@qa.io", "password": "Password123!", "full_name": "Senior Reviewer"},
    )
    reviewer_login = client.post("/api/v1/auth/login", json={"email": "reviewer.gov@qa.io", "password": "Password123!"})
    reviewer_token = reviewer_login.json()["access_token"]
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
    reviewer_id = reviewer_login.json()["user"]["id"]

    # 2. Setup Workspace & Project
    ws_res = client.post("/api/v1/workspaces", json={"name": "Governance Workspace"}, headers=lead_headers)
    ws_id = ws_res.json()["id"]

    # Add reviewer to workspace
    client.post(f"/api/v1/workspaces/{ws_id}/members", json={"email": "reviewer.gov@qa.io", "role": "MEMBER"}, headers=lead_headers)

    proj_res = client.post(f"/api/v1/workspaces/{ws_id}/projects", json={"name": "Gov Project", "key": "GOV"}, headers=lead_headers)
    proj_id = proj_res.json()["id"]

    # 3. Create Test Case with Severity & Draft Status
    tc_res = client.post(
        f"/api/v1/projects/{proj_id}/test-cases",
        json={
            "title": "Verify payment transaction signature",
            "priority": "HIGH",
            "severity": "CRITICAL",
            "status": "ACTIVE",
            "review_status": "DRAFT",
            "steps": [
                {"step_number": 1, "action": "Generate HMAC signature", "expected_result": "Signature generated", "test_data": "secret_key_123"},
                {"step_number": 2, "action": "Submit payload", "expected_result": "HTTP 200 OK", "test_data": '{"amount": 100}'},
            ],
        },
        headers=lead_headers,
    )
    assert tc_res.status_code == 201
    tc_data = tc_res.json()
    assert tc_data["severity"] == "CRITICAL"
    assert tc_data["review_status"] == "DRAFT"
    case_id = tc_data["id"]

    # 3b. Verify DRAFT test case CANNOT be executed in a test run (Requirement 4)
    blocked_draft_run = client.post(
        f"/api/v1/projects/{proj_id}/runs",
        json={"name": "Blocked Draft Run", "environment": "Staging", "test_case_ids": [case_id]},
        headers=lead_headers,
    )
    assert blocked_draft_run.status_code == 400
    assert "Only APPROVED test cases can be executed" in blocked_draft_run.json()["detail"]

    # 4. Author submits for review
    submit_res = client.post(
        f"/api/v1/test-cases/{case_id}/submit-review",
        json={"reviewer_id": reviewer_id, "comments": "Please review payment signature logic."},
        headers=lead_headers,
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["review_status"] == "IN_REVIEW"
    assert submit_res.json()["reviewer_id"] == reviewer_id

    # 4b. Verify IN_REVIEW test case CANNOT be executed in a test run
    blocked_review_run = client.post(
        f"/api/v1/projects/{proj_id}/runs",
        json={"name": "Blocked Review Run", "environment": "Staging", "test_case_ids": [case_id]},
        headers=lead_headers,
    )
    assert blocked_review_run.status_code == 400

    # 5. Reviewer requests changes
    changes_res = client.post(
        f"/api/v1/test-cases/{case_id}/request-changes",
        json={"comments": "Please add validation step for expired HMAC timestamps."},
        headers=reviewer_headers,
    )
    assert changes_res.status_code == 200
    assert changes_res.json()["review_status"] == "CHANGES_REQUESTED"

    # 5b. Test Reject endpoint
    reject_res = client.post(
        f"/api/v1/test-cases/{case_id}/reject",
        json={"comments": "Rejecting case pending security audit."},
        headers=reviewer_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["review_status"] == "REJECTED"

    # Verify REJECTED case CANNOT be executed
    blocked_reject_run = client.post(
        f"/api/v1/projects/{proj_id}/runs",
        json={"name": "Blocked Reject Run", "environment": "Staging", "test_case_ids": [case_id]},
        headers=lead_headers,
    )
    assert blocked_reject_run.status_code == 400

    # 6. Author updates and resubmits
    client.put(
        f"/api/v1/test-cases/{case_id}",
        json={
            "title": "Verify payment transaction signature with timestamp check",
            "steps": [
                {"step_number": 1, "action": "Generate HMAC signature", "expected_result": "Signature generated", "test_data": "secret_key_123"},
                {"step_number": 2, "action": "Validate timestamp freshness", "expected_result": "Within 5 min tolerance", "test_data": "ts=now"},
                {"step_number": 3, "action": "Submit payload", "expected_result": "HTTP 200 OK", "test_data": '{"amount": 100}'},
            ],
        },
        headers=lead_headers,
    )
    client.post(
        f"/api/v1/test-cases/{case_id}/submit-review",
        json={"reviewer_id": reviewer_id, "comments": "Added timestamp validation step."},
        headers=lead_headers,
    )

    # 7. Reviewer approves
    approve_res = client.post(
        f"/api/v1/test-cases/{case_id}/approve",
        json={"comments": "Looks complete. Approved for test run execution."},
        headers=reviewer_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["review_status"] == "APPROVED"

    # 8. Check review history audit log
    reviews_res = client.get(f"/api/v1/test-cases/{case_id}/reviews", headers=lead_headers)
    assert reviews_res.status_code == 200
    reviews = reviews_res.json()
    assert len(reviews) == 5  # Submit 1, Request Changes, Reject, Resubmit 2, Approve

    # 9. Create Test Run & Verify Execution Accountability
    run_res = client.post(
        f"/api/v1/projects/{proj_id}/runs",
        json={"name": "Gov Sanity Run", "environment": "Staging", "test_case_ids": [case_id]},
        headers=lead_headers,
    )
    assert run_res.status_code == 201
    run_data = run_res.json()
    item_id = run_data["items"][0]["id"]
    assert run_data["items"][0]["severity"] == "CRITICAL"

    # Assign executor to Bob
    assign_res = client.post(
        f"/api/v1/runs/{run_data['id']}/items/{item_id}/assign",
        json={"assigned_to_id": reviewer_id},
        headers=lead_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_to_id"] == reviewer_id

    # Execute item
    exec_res = client.post(
        f"/api/v1/runs/{run_data['id']}/items/{item_id}/execute",
        json={"status": "PASSED", "actual_result": "Signature verified with valid timestamp.", "duration_seconds": 15},
        headers=reviewer_headers,
    )
    assert exec_res.status_code == 200
    assert exec_res.json()["status"] == "PASSED"
    assert exec_res.json()["executed_by_id"] == reviewer_id
    assert exec_res.json()["execution_started_at"] is not None
    assert exec_res.json()["execution_completed_at"] is not None


def test_test_case_module_movement_and_bulk_move(client: TestClient):
    # 1. Login user
    client.post(
        "/api/v1/auth/register",
        json={"email": "mod.user@qa.io", "password": "Password123!", "full_name": "Module User"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "mod.user@qa.io", "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 2. Setup workspace, project, modules
    ws_res = client.post("/api/v1/workspaces", json={"name": "Module WS"}, headers=headers)
    ws_id = ws_res.json()["id"]

    proj_res = client.post(f"/api/v1/workspaces/{ws_id}/projects", json={"name": "Module Proj", "key": "MOD"}, headers=headers)
    proj_id = proj_res.json()["id"]

    m1_res = client.post(f"/api/v1/projects/{proj_id}/modules", json={"name": "Billing"}, headers=headers)
    m1_id = m1_res.json()["id"]

    m2_res = client.post(f"/api/v1/projects/{proj_id}/modules", json={"name": "Invoicing"}, headers=headers)
    m2_id = m2_res.json()["id"]

    # 3. Create unassigned test case
    tc1_res = client.post(
        f"/api/v1/projects/{proj_id}/test-cases",
        json={"title": "Unassigned Case 1", "module_id": None},
        headers=headers,
    )
    tc1_id = tc1_res.json()["id"]
    assert tc1_res.json()["module_id"] is None

    tc2_res = client.post(
        f"/api/v1/projects/{proj_id}/test-cases",
        json={"title": "Unassigned Case 2", "module_id": None},
        headers=headers,
    )
    tc2_id = tc2_res.json()["id"]

    # 4. Filter unassigned only
    unassigned_res = client.get(f"/api/v1/projects/{proj_id}/test-cases?unassigned_only=true", headers=headers)
    assert unassigned_res.status_code == 200
    assert len(unassigned_res.json()) == 2

    # 5. Move single test case to Billing
    move_res = client.put(f"/api/v1/test-cases/{tc1_id}/move-module", json={"target_module_id": m1_id}, headers=headers)
    assert move_res.status_code == 200
    assert move_res.json()["module_id"] == m1_id

    # 6. Bulk move cases to Invoicing
    bulk_res = client.post(
        f"/api/v1/projects/{proj_id}/test-cases/bulk-move",
        json={"test_case_ids": [tc1_id, tc2_id], "target_module_id": m2_id},
        headers=headers,
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["moved_count"] == 2

    # Verify both are now in Invoicing
    detail1 = client.get(f"/api/v1/test-cases/{tc1_id}", headers=headers)
    detail2 = client.get(f"/api/v1/test-cases/{tc2_id}", headers=headers)
    assert detail1.json()["module_id"] == m2_id
    assert detail2.json()["module_id"] == m2_id
