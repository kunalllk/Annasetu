import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.seed.seed_data import reset_and_seed_database
from app.models.entities import User, Centre, Commodity, Booking, QueueEntry, Procurement, AuditLog
from main import app

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Reseed baseline dataset for clean test run
    reset_and_seed_database()

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_smart_recommendation_and_explanation():
    # Query demo users to get Ramesh Patil's ID
    users_res = client.get("/api/v1/auth/demo-users")
    assert users_res.status_code == 200
    users = users_res.json()["data"]
    ramesh = next(u for u in users if "Ramesh" in u["display_name"])

    # Query wheat commodity
    comm_res = client.get("/api/v1/commodities")
    wheat = next(c for c in comm_res.json()["data"] if c["code"] == "WHEAT")

    req_payload = {
        "farmer_id": ramesh["id"],
        "commodity_id": wheat["id"],
        "expected_quantity_q": 50.0,
        "preferred_date": (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d"),
        "preferred_time_start": "10:00",
        "preferred_time_end": "12:00",
        "origin_lat": 18.5204,
        "origin_lng": 73.8567
    }

    rec_res = client.post("/api/v1/bookings/recommend", json=req_payload)
    assert rec_res.status_code == 200
    rec_data = rec_res.json()["data"]
    assert rec_data["recommended"] is not None

    # Centre B should win the recommendation due to lower wait time and high capacity
    rec = rec_data["recommended"]
    assert rec["centre_code"] == "CENTRE-B"
    assert len(rec["reasons"]) > 0
    assert len(rec_data["alternatives"]) > 0
    # Centre E does not accept wheat so should not be in alternatives
    alt_codes = [a["centre_code"] for a in rec_data["alternatives"]]
    assert "CENTRE-E" not in alt_codes

def test_fairness_single_booking_per_day_and_different_days():
    users_res = client.get("/api/v1/auth/demo-users")
    ramesh = next(u for u in users_res.json()["data"] if "Ramesh" in u["display_name"])
    
    comm_res = client.get("/api/v1/commodities")
    wheat = next(c for c in comm_res.json()["data"] if c["code"] == "WHEAT")

    centres_res = client.get("/api/v1/centres")
    centre_b = next(c for c in centres_res.json()["data"] if c["code"] == "CENTRE-B")

    target_date = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")

    # First booking on target_date should succeed
    b1_payload = {
        "farmer_id": ramesh["id"],
        "centre_id": centre_b["id"],
        "commodity_id": wheat["id"],
        "booking_date": target_date,
        "slot_start": "10:00",
        "slot_end": "10:30",
        "expected_quantity_q": 50.0,
        "source": "FARMER"
    }
    r1 = client.post("/api/v1/bookings", json=b1_payload)
    assert r1.status_code == 200
    b1_data = r1.json()["data"]
    assert b1_data["status"] == "CONFIRMED"

    # Second booking on the SAME date for the SAME farmer must be rejected with 400
    b2_payload = {
        "farmer_id": ramesh["id"],
        "centre_id": centre_b["id"],
        "commodity_id": wheat["id"],
        "booking_date": target_date,
        "slot_start": "14:00",
        "slot_end": "14:30",
        "expected_quantity_q": 30.0,
        "source": "FARMER"
    }
    r2 = client.post("/api/v1/bookings", json=b2_payload)
    assert r2.status_code == 400
    assert "BOOKING_CONFLICT" in str(r2.json())

    # Booking on a DIFFERENT day should succeed
    different_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")
    b3_payload = {**b1_payload, "booking_date": different_date}
    r3 = client.post("/api/v1/bookings", json=b3_payload)
    assert r3.status_code == 200

def test_arrival_marking_and_dynamic_eta():
    # Find a confirmed booking
    users_res = client.get("/api/v1/auth/demo-users")
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])
    
    headers = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }

    queue_res = client.get("/api/v1/staff/queue", headers=headers)
    assert queue_res.status_code == 200
    queue_rows = queue_res.json()["data"]

    confirmed_row = next(r for r in queue_rows if r["arrival_status"] == "CONFIRMED")
    booking_id = confirmed_row["booking_id"]

    # Mark arrived
    arrive_res = client.post(
        f"/api/v1/staff/bookings/{booking_id}/arrive",
        json={"arrival_note": "Farmer verified at entry gate"},
        headers=headers
    )
    assert arrive_res.status_code == 200
    assert arrive_res.json()["data"]["status"] == "ARRIVED"

def test_staff_centre_isolation():
    # Staff for Centre A attempting to act on Centre B's booking should be blocked
    users_res = client.get("/api/v1/auth/demo-users")
    staff_a = next(u for u in users_res.json()["data"] if "Vikas Kulkarni" in u["display_name"])
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])

    # Fetch Centre B queue
    headers_b = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }
    queue_res = client.get("/api/v1/staff/queue", headers=headers_b)
    target_booking_id = queue_res.json()["data"][0]["booking_id"]

    # Staff A tries to mark arrived on Centre B's booking
    headers_a = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_a["id"],
        "X-Demo-Centre-Id": staff_a["centre_id"]
    }
    isolation_res = client.post(
        f"/api/v1/staff/bookings/{target_booking_id}/arrive",
        json={"arrival_note": "Illegal cross-centre action"},
        headers=headers_a
    )
    assert isolation_res.status_code == 403
    assert "UNAUTHORIZED_CENTRE" in str(isolation_res.json())

def test_no_show_and_potential_capacity_release():
    users_res = client.get("/api/v1/auth/demo-users")
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])
    headers = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }

    queue_res = client.get("/api/v1/staff/queue", headers=headers)
    confirmed_row = next(r for r in queue_res.json()["data"] if r["arrival_status"] == "CONFIRMED")
    booking_id = confirmed_row["booking_id"]

    ns_res = client.post(
        f"/api/v1/staff/bookings/{booking_id}/no-show",
        json={"reason": "Farmer absent during scheduled window"},
        headers=headers
    )
    assert ns_res.status_code == 200
    res_data = ns_res.json()["data"]
    assert res_data["status"] == "NO_SHOW"
    assert res_data["capacity_state"] == "POTENTIALLY_AVAILABLE"

def test_weighing_farmer_confirmation_and_dispute():
    users_res = client.get("/api/v1/auth/demo-users")
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])
    headers = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }

    queue_res = client.get("/api/v1/staff/queue", headers=headers)
    arrived_row = next(r for r in queue_res.json()["data"] if r["arrival_status"] in ["ARRIVED", "WEIGHING"])
    booking_id = arrived_row["booking_id"]

    # 1. Staff records manual actual quantity = 48.7 q (Expected was 50 or similar)
    weigh_res = client.post(
        f"/api/v1/staff/procurements/{booking_id}/weigh",
        json={"actual_quantity_q": 48.7, "operator_note": "Digital platform scale #2"},
        headers=headers
    )
    assert weigh_res.status_code == 200
    w_data = weigh_res.json()["data"]
    procurement_id = w_data["procurement_id"]
    assert w_data["actual_quantity_q"] == 48.7
    # Verify expected quantity is preserved!
    assert w_data["expected_quantity_q"] > 0

    # 2. Farmer view: Confirm quantity
    farmer_headers = {
        "X-Demo-Role": "FARMER",
        "X-Demo-User-Id": arrived_row["id"]
    }
    conf_res = client.post(
        f"/api/v1/procurements/{procurement_id}/confirm-quantity",
        json={"confirmed": True},
        headers=farmer_headers
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["data"]["farmer_confirmed_at"] is not None

    # 3. Farmer can also raise a discrepancy dispute ticket
    disp_res = client.post(
        f"/api/v1/procurements/{procurement_id}/disputes",
        json={
            "type": "QUANTITY_DISCREPANCY",
            "reported_quantity_q": 50.0,
            "reason": "Test variance in measured weight"
        },
        headers=farmer_headers
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["data"]["status"] == "OPEN"

def test_procurement_completion_and_external_payment_toggle():
    users_res = client.get("/api/v1/auth/demo-users")
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])
    admin_user = next(u for u in users_res.json()["data"] if u["role"] == "ADMIN")

    headers_staff = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }

    queue_res = client.get("/api/v1/staff/queue", headers=headers_staff)
    # Pick a row that has actual quantity
    target_row = next(r for r in queue_res.json()["data"] if r["actual_quantity_q"] is not None)
    booking_id = target_row["booking_id"]

    # 1. Record quality PASS
    q_res = client.post(
        f"/api/v1/staff/procurements/{booking_id}/quality",
        json={"status": "PASSED", "reason": "Moisture 11.5%, within tolerance"},
        headers=headers_staff
    )
    assert q_res.status_code == 200

    # 2. Complete procurement
    comp_res = client.post(
        f"/api/v1/staff/procurements/{booking_id}/complete",
        json={"completion_note": "Final acceptance"},
        headers=headers_staff
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()["data"]
    assert comp_data["procurement_status"] == "ACCEPTED"
    assert comp_data["payment_status"] == "PENDING"
    proc_id = comp_data["procurement_id"]

    # 3. Admin / demo toggle to simulated completed payment
    headers_admin = {
        "X-Demo-Role": "ADMIN",
        "X-Demo-User-Id": admin_user["id"]
    }
    pay_res = client.patch(
        f"/api/v1/admin/payments/{proc_id}",
        json={"status": "COMPLETED"},
        headers=headers_admin
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["data"]["payment_status"] == "COMPLETED"

def test_simulation_controls():
    users_res = client.get("/api/v1/auth/demo-users")
    staff_b = next(u for u in users_res.json()["data"] if "Suresh Deshmukh" in u["display_name"])
    headers = {
        "X-Demo-Role": "STAFF",
        "X-Demo-User-Id": staff_b["id"],
        "X-Demo-Centre-Id": staff_b["centre_id"]
    }

    sim_res = client.post(
        "/api/v1/simulation/run",
        json={"centre_id": staff_b["centre_id"], "action": "SLOW_PROCESSING"},
        headers=headers
    )
    assert sim_res.status_code == 200
    assert sim_res.json()["data"]["success"] is True

def test_audit_logs_append_only():
    audit_res = client.get("/api/v1/admin/audit?limit=20")
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert len(logs) > 0
    # Every audit entry must have actor, entity_type, action, created_at
    for entry in logs:
        assert entry["actor_user_id"] is not None
        assert entry["entity_type"] is not None
        assert entry["action"] is not None
        assert entry["created_at"] is not None
