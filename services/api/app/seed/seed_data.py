import random
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.entities import (
    User, FarmerProfile, Centre, StaffAssignment, Commodity, CentreCommodity,
    Booking, QueueEntry, Procurement, PaymentStatus, Dispute, Notification,
    AuditLog, SimulationEvent
)

def reset_and_seed_database(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    print("Cleaning existing database tables...")
    # Drop and recreate all tables for a clean reset
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Seeding commodities...")
    commodities_data = [
        {"code": "WHEAT", "name": "Wheat (Kanak)", "category": "Cereal", "msp": 2275.0},
        {"code": "PADDY", "name": "Paddy (Dhan - Common)", "category": "Cereal", "msp": 2183.0},
        {"code": "JOWAR", "name": "Jowar (Hybrid)", "category": "Coarse Grain / Millet", "msp": 3180.0},
        {"code": "BAJRA", "name": "Bajra", "category": "Millet", "msp": 2500.0},
        {"code": "RAGI", "name": "Ragi (Finger Millet)", "category": "Nutri-Cereal", "msp": 3846.0},
        {"code": "MAIZE", "name": "Maize (Makka)", "category": "Coarse Grain", "msp": 2090.0},
    ]
    commodities = {}
    for c in commodities_data:
        comm = Commodity(
            id=str(uuid.uuid4()),
            code=c["code"],
            name=c["name"],
            category=c["category"],
            default_unit="quintal",
            msp_inr_per_q=c["msp"],
            active=True
        )
        db.add(comm)
        commodities[c["code"]] = comm
    db.flush()

    print("Seeding 5 distinct procurement centres...")
    # Centre A: Close but congested
    # Centre B: Optimal, high-capacity, fast (Hero recommendation)
    # Centre C: Very high capacity, longer distance
    # Centre D: Moderate capacity, near full daily limit
    # Centre E: Specialist coarse grains/millets
    centres_data = [
        {
            "code": "CENTRE-A",
            "name": "Shivajinagar Mandi Depot",
            "address": "Gate 2, Agriculture APMC Yard, Shivajinagar, Pune 411005",
            "lat": 18.5314, "lng": 73.8446,
            "storage_capacity_q": 6000.0, # 600 tonnes
            "occupied_committed_q": 5200.0, # 86% full! Congested
            "daily_processing_capacity_q": 300.0,
            "processed_today_q": 180.0,
            "processing_rate_q_per_hr": 8.0, # Slow throughput
            "commodities": ["WHEAT", "PADDY", "JOWAR", "BAJRA", "MAIZE"]
        },
        {
            "code": "CENTRE-B",
            "name": "Hadapsar Agro Logistics Hub",
            "address": "Sector 4, Mega Food Park, Hadapsar, Pune 411028",
            "lat": 18.5089, "lng": 73.9259,
            "storage_capacity_q": 5000.0, # 500 tonnes
            "occupied_committed_q": 1800.0, # 320 tonnes remaining! High capacity fit
            "daily_processing_capacity_q": 600.0, # 60 tonnes
            "processed_today_q": 350.0, # 35 tonnes
            "processing_rate_q_per_hr": 25.0, # Fast throughput!
            "commodities": ["WHEAT", "PADDY", "JOWAR", "BAJRA", "RAGI", "MAIZE"]
        },
        {
            "code": "CENTRE-C",
            "name": "Baramati Regional Mega Depot",
            "address": "State Warehousing Complex, MIDC Phase II, Baramati 413133",
            "lat": 18.1517, "lng": 74.5771,
            "storage_capacity_q": 15000.0, # 1,500 tonnes
            "occupied_committed_q": 4500.0,
            "daily_processing_capacity_q": 1000.0,
            "processed_today_q": 420.0,
            "processing_rate_q_per_hr": 30.0,
            "commodities": ["WHEAT", "PADDY", "MAIZE"]
        },
        {
            "code": "CENTRE-D",
            "name": "Talegaon Grain Yard",
            "address": "Old Mumbai-Pune Highway, Talegaon Dabhade 410506",
            "lat": 18.7289, "lng": 73.6841,
            "storage_capacity_q": 3500.0,
            "occupied_committed_q": 2900.0,
            "daily_processing_capacity_q": 350.0,
            "processed_today_q": 310.0, # Near full daily limit (90%)
            "processing_rate_q_per_hr": 12.0,
            "commodities": ["WHEAT", "JOWAR", "BAJRA"]
        },
        {
            "code": "CENTRE-E",
            "name": "Saswad Millets & Coarse Grain Center",
            "address": "APMC Sub-Yard, Dive Ghat Road, Saswad 412301",
            "lat": 18.3444, "lng": 74.0311,
            "storage_capacity_q": 4000.0,
            "occupied_committed_q": 1200.0,
            "daily_processing_capacity_q": 400.0,
            "processed_today_q": 150.0,
            "processing_rate_q_per_hr": 16.0,
            "commodities": ["JOWAR", "BAJRA", "RAGI", "MAIZE"] # NO WHEAT!
        },
    ]

    centres = {}
    for cd in centres_data:
        centre = Centre(
            id=str(uuid.uuid4()),
            code=cd["code"],
            name=cd["name"],
            address=cd["address"],
            lat=cd["lat"],
            lng=cd["lng"],
            operating_start="09:00",
            operating_end="17:00",
            storage_capacity_q=cd["storage_capacity_q"],
            occupied_committed_q=cd["occupied_committed_q"],
            daily_processing_capacity_q=cd["daily_processing_capacity_q"],
            processed_today_q=cd["processed_today_q"],
            processing_rate_q_per_hr=cd["processing_rate_q_per_hr"],
            active=True
        )
        db.add(centre)
        db.flush()
        centres[cd["code"]] = centre

        for comm_code in cd["commodities"]:
            cc = CentreCommodity(
                centre_id=centre.id,
                commodity_id=commodities[comm_code].id,
                active=True
            )
            db.add(cc)
    db.flush()

    print("Seeding Administrative, Staff and CSC Users...")
    # Admin
    admin_user = User(
        id=str(uuid.uuid4()),
        role="ADMIN",
        display_name="Dr. Rajesh Sharma",
        mobile_masked="+91 98XXX XX001",
        email="rajesh.sharma@annasetu.gov.in"
    )
    db.add(admin_user)

    # CSC Operator
    csc_user = User(
        id=str(uuid.uuid4()),
        role="CSC",
        display_name="Pravin Chavan (MahaSeva CSC)",
        mobile_masked="+91 98XXX XX002",
        email="csc.haveli@annasetu.gov.in"
    )
    db.add(csc_user)

    # Centre B Staff (Primary Demo Staff)
    staff_b = User(
        id=str(uuid.uuid4()),
        role="STAFF",
        display_name="Suresh Deshmukh (Procurement Officer)",
        mobile_masked="+91 98XXX XX003",
        email="suresh.deshmukh@annasetu.gov.in"
    )
    db.add(staff_b)
    db.flush()

    staff_assign_b = StaffAssignment(
        user_id=staff_b.id,
        centre_id=centres["CENTRE-B"].id,
        active=True
    )
    db.add(staff_assign_b)

    # Centre A Staff
    staff_a = User(
        id=str(uuid.uuid4()),
        role="STAFF",
        display_name="Vikas Kulkarni (Gate Inspector)",
        mobile_masked="+91 98XXX XX004",
        email="vikas.kulkarni@annasetu.gov.in"
    )
    db.add(staff_a)
    db.flush()

    staff_assign_a = StaffAssignment(
        user_id=staff_a.id,
        centre_id=centres["CENTRE-A"].id,
        active=True
    )
    db.add(staff_assign_a)
    db.flush()

    print("Seeding 35 Farmers...")
    farmer_names = [
        ("Ramesh Patil", "Khed", "Pune", 18.5204, 73.8567), # Main demo farmer
        ("Suresh Gaikwad", "Hadapsar", "Pune", 18.5080, 73.9240),
        ("Ananda Shinde", "Manchar", "Pune", 18.9958, 73.9422),
        ("Sunita More", "Shirur", "Pune", 18.8256, 74.3750),
        ("Tukaram Jadhav", "Bhor", "Pune", 18.1524, 73.8441),
        ("Dilip Pawar", "Daund", "Pune", 18.4650, 74.5820),
        ("Baburao Kadam", "Saswad", "Pune", 18.3440, 74.0300),
        ("Mahadev Shinde", "Junnar", "Pune", 19.2083, 73.8767),
        ("Kishor Salunkhe", "Baramati", "Pune", 18.1500, 74.5800),
        ("Vandana Jagtap", "Purandar", "Pune", 18.2800, 74.0100),
        ("Ganesh Bhosale", "Haveli", "Pune", 18.5100, 73.8900),
        ("Sanjay Thorat", "Talegaon", "Pune", 18.7300, 73.6900),
        ("Santosh Chavan", "Chakan", "Pune", 18.7600, 73.8600),
        ("Nitin Ghadge", "Wagholi", "Pune", 18.5800, 73.9800),
        ("Prakash Darekar", "Loni Kalbhor", "Pune", 18.4900, 74.0200),
        ("Shantaram Kale", "Uruli Kanchan", "Pune", 18.4800, 74.1300),
        ("Ashok Nikam", "Khadakwasla", "Pune", 18.4400, 73.7600),
        ("Pandurang More", "Rajgurunagar", "Pune", 18.8600, 73.8900),
        ("Bhagwan Dhore", "Alandi", "Pune", 18.6700, 73.8900),
        ("Chandrakant Kokare", "Narayangaon", "Pune", 19.1200, 73.9700),
        ("Bapu Jagdale", "Otur", "Pune", 19.2600, 73.9200),
        ("Subhash Sonawane", "Ghogargaon", "Pune", 18.9000, 74.2000),
        ("Popat Raut", "Malegaon Khurd", "Pune", 18.1800, 74.4500),
        ("Ravindra Adsul", "Someshwar", "Pune", 18.2100, 74.2800),
        ("Namdev Giramkar", "Supa", "Pune", 18.3300, 74.4100),
        ("Laxman Bhujbal", "Morgaon", "Pune", 18.2700, 74.3100),
        ("Dattatray Wagh", "Jejuri", "Pune", 18.2700, 74.1600),
        ("Bhimrao Londhe", "Yavat", "Pune", 18.4700, 74.2900),
        ("Kalyanrao Kolhe", "Kedgaon", "Pune", 18.4500, 74.3900),
        ("Vitthal Thite", "Kashti", "Pune", 18.5200, 74.5200),
        ("Maruti Bankar", "Belwandi", "Pune", 18.6200, 74.6100),
        ("Vishnu Tambe", "Pabal", "Pune", 18.8300, 74.0500),
        ("Dnyaneshwar Gore", "Shikrapur", "Pune", 18.7000, 74.1200),
        ("Tanaji Gholap", "Koregaon Bhima", "Pune", 18.6600, 74.0600),
        ("Sitaram Phadtare", "Nira", "Pune", 18.1000, 74.2100)
    ]

    farmers = []
    for idx, (name, village, dist, lat, lng) in enumerate(farmer_names):
        last4 = f"{1000 + idx}"
        mobile_last3 = f"{100 + idx}"
        f_user = User(
            id=str(uuid.uuid4()),
            role="FARMER",
            display_name=name,
            mobile_masked=f"+91 98XXX XX{mobile_last3}",
            email=f"farmer{idx+1}@annasetu.demo"
        )
        db.add(f_user)
        db.flush()

        profile = FarmerProfile(
            user_id=f_user.id,
            demo_gov_id_hash=f"hash_{f_user.id[:12]}",
            demo_gov_id_masked=f"XXXX-XXXX-{last4}",
            village=village,
            district=dist,
            state="Maharashtra",
            preferred_language="English",
            lat=lat,
            lng=lng
        )
        db.add(profile)
        farmers.append(f_user)
    db.flush()

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    two_days_ago_str = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

    print("Seeding Today's Active Queue for Centre B (Hadapsar Agro Logistics Hub)...")
    
    # 1. Currently Serving farmer at Centre B
    b_serving = Booking(
        id=str(uuid.uuid4()),
        booking_number="BK-2026-0901",
        farmer_id=farmers[6].id, # Baburao Kadam
        centre_id=centres["CENTRE-B"].id,
        commodity_id=commodities["WHEAT"].id,
        booking_date=today_str,
        slot_start="09:30",
        slot_end="10:00",
        expected_quantity_q=45.0,
        source="FARMER",
        status="WEIGHING"
    )
    db.add(b_serving)
    db.flush()

    qe_serving = QueueEntry(
        id=str(uuid.uuid4()),
        booking_id=b_serving.id,
        arrival_at=datetime.now(timezone.utc) - timedelta(minutes=25),
        queue_position=1,
        queue_status="SERVING",
        estimated_wait_min=0,
        eta_at=datetime.now(timezone.utc),
        serving_started_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    db.add(qe_serving)

    proc_serving = Procurement(
        id=str(uuid.uuid4()),
        booking_id=b_serving.id,
        expected_quantity_q=45.0,
        procurement_status="PENDING"
    )
    db.add(proc_serving)

    # 2. Arrived & Waiting Farmers at Centre B (Queue positions 2, 3, 4)
    waiting_data = [
        (farmers[1], "WHEAT", "10:00", "10:30", 50.0, 18, 2), # Suresh Gaikwad
        (farmers[2], "WHEAT", "10:30", "11:00", 60.0, 12, 3), # Ananda Shinde
        (farmers[3], "PADDY", "11:00", "11:30", 40.0, 5, 4),  # Sunita More
    ]
    for farmer, comm_code, s_start, s_end, exp_q, arr_min_ago, pos in waiting_data:
        b = Booking(
            id=str(uuid.uuid4()),
            booking_number=f"BK-2026-090{pos}",
            farmer_id=farmer.id,
            centre_id=centres["CENTRE-B"].id,
            commodity_id=commodities[comm_code].id,
            booking_date=today_str,
            slot_start=s_start,
            slot_end=s_end,
            expected_quantity_q=exp_q,
            source="FARMER",
            status="ARRIVED"
        )
        db.add(b)
        db.flush()

        qe = QueueEntry(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            arrival_at=datetime.now(timezone.utc) - timedelta(minutes=arr_min_ago),
            queue_position=pos,
            queue_status="WAITING",
            estimated_wait_min=pos * 15,
            eta_at=datetime.now(timezone.utc) + timedelta(minutes=pos * 15)
        )
        db.add(qe)

        proc = Procurement(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            expected_quantity_q=exp_q,
            procurement_status="PENDING"
        )
        db.add(proc)

    # 3. Confirmed Future Bookings for Today (Positions 5, 6, 7, 8)
    confirmed_today = [
        (farmers[4], "WHEAT", "11:30", "12:00", 55.0, 5),
        (farmers[5], "WHEAT", "12:00", "12:30", 48.0, 6),
        (farmers[7], "JOWAR", "13:30", "14:00", 35.0, 7),
        (farmers[8], "WHEAT", "14:00", "14:30", 50.0, 8),
    ]
    for farmer, comm_code, s_start, s_end, exp_q, pos in confirmed_today:
        b = Booking(
            id=str(uuid.uuid4()),
            booking_number=f"BK-2026-090{pos}",
            farmer_id=farmer.id,
            centre_id=centres["CENTRE-B"].id,
            commodity_id=commodities[comm_code].id,
            booking_date=today_str,
            slot_start=s_start,
            slot_end=s_end,
            expected_quantity_q=exp_q,
            source="FARMER",
            status="CONFIRMED"
        )
        db.add(b)
        db.flush()

        qe = QueueEntry(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            queue_position=pos,
            queue_status="WAITING",
            estimated_wait_min=pos * 18,
            eta_at=datetime.now(timezone.utc) + timedelta(minutes=pos * 18)
        )
        db.add(qe)

    print("Seeding 3 No-Show scenarios for testing and demonstration...")
    # One marked NO_SHOW yesterday, one today, one ready at Centre A
    no_show_bookings = [
        (farmers[9], centres["CENTRE-B"], commodities["WHEAT"], today_str, "09:00", "09:30", 40.0, "Farmer absent when called"),
        (farmers[10], centres["CENTRE-A"], commodities["PADDY"], yesterday_str, "14:00", "14:30", 65.0, "Vehicle breakdown reported post cutoff"),
        (farmers[11], centres["CENTRE-D"], commodities["WHEAT"], yesterday_str, "10:00", "10:30", 50.0, "Did not report at gate"),
    ]
    for idx, (farmer, centre, comm, bdate, s_start, s_end, exp_q, reason) in enumerate(no_show_bookings):
        ns_booking = Booking(
            id=str(uuid.uuid4()),
            booking_number=f"BK-NOSHOW-{101+idx}",
            farmer_id=farmer.id,
            centre_id=centre.id,
            commodity_id=comm.id,
            booking_date=bdate,
            slot_start=s_start,
            slot_end=s_end,
            expected_quantity_q=exp_q,
            source="FARMER",
            status="NO_SHOW"
        )
        db.add(ns_booking)
        db.flush()

        qe = QueueEntry(
            id=str(uuid.uuid4()),
            booking_id=ns_booking.id,
            queue_status="NO_SHOW",
            estimated_wait_min=0
        )
        db.add(qe)

        AuditLog_entry = AuditLog(
            id=str(uuid.uuid4()),
            actor_user_id=staff_b.id,
            actor_role="STAFF",
            centre_id=centre.id,
            entity_type="booking",
            entity_id=ns_booking.id,
            action="NO_SHOW_MARKED",
            old_value_json='{"status": "CONFIRMED"}',
            new_value_json='{"status": "NO_SHOW", "capacity_state": "POTENTIALLY_AVAILABLE"}',
            reason=reason,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        db.add(AuditLog_entry)

    print("Seeding 12 Completed Procurements with Payment Statuses & Transparency Records...")
    completed_configs = [
        (farmers[12], centres["CENTRE-B"], commodities["WHEAT"], 50.0, 48.7, "COMPLETED", True), # Classic demo match
        (farmers[13], centres["CENTRE-B"], commodities["WHEAT"], 60.0, 59.2, "COMPLETED", True),
        (farmers[14], centres["CENTRE-B"], commodities["PADDY"], 40.0, 39.5, "COMPLETED", True),
        (farmers[15], centres["CENTRE-B"], commodities["JOWAR"], 30.0, 30.0, "COMPLETED", True),
        (farmers[16], centres["CENTRE-A"], commodities["WHEAT"], 45.0, 44.1, "COMPLETED", True),
        (farmers[17], centres["CENTRE-A"], commodities["PADDY"], 70.0, 68.4, "COMPLETED", True),
        (farmers[18], centres["CENTRE-B"], commodities["WHEAT"], 55.0, 53.8, "PENDING", False),
        (farmers[19], centres["CENTRE-B"], commodities["WHEAT"], 50.0, 49.0, "PENDING", False),
        (farmers[20], centres["CENTRE-C"], commodities["WHEAT"], 100.0, 98.2, "PENDING", False),
        (farmers[21], centres["CENTRE-C"], commodities["MAIZE"], 80.0, 79.1, "PENDING", False),
        (farmers[22], centres["CENTRE-D"], commodities["BAJRA"], 35.0, 34.2, "PENDING", False),
        (farmers[23], centres["CENTRE-E"], commodities["RAGI"], 25.0, 24.8, "PENDING", False),
    ]

    for idx, (farmer, centre, comm, exp_q, act_q, pay_status, farmer_conf) in enumerate(completed_configs):
        b = Booking(
            id=str(uuid.uuid4()),
            booking_number=f"BK-CMPL-{201+idx}",
            farmer_id=farmer.id,
            centre_id=centre.id,
            commodity_id=comm.id,
            booking_date=two_days_ago_str if pay_status == "COMPLETED" else yesterday_str,
            slot_start="10:00",
            slot_end="10:30",
            expected_quantity_q=exp_q,
            source="FARMER",
            status="COMPLETED"
        )
        db.add(b)
        db.flush()

        qe = QueueEntry(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            queue_status="COMPLETED",
            estimated_wait_min=0,
            completed_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(qe)

        proc = Procurement(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            expected_quantity_q=exp_q,
            actual_quantity_q=act_q,
            quantity_recorded_at=datetime.now(timezone.utc) - timedelta(days=1, hours=2),
            farmer_confirmed_at=datetime.now(timezone.utc) - timedelta(days=1, hours=1) if farmer_conf else None,
            quality_status="PASSED",
            quality_reason="Moisture 11.2%, Foreign matter <0.5% (FAQ Standard)",
            procurement_status="ACCEPTED",
            completed_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(proc)
        db.flush()

        payment = PaymentStatus(
            id=str(uuid.uuid4()),
            procurement_id=proc.id,
            status=pay_status,
            source="PFMS_GOV_EXTERNAL",
            external_reference_masked=f"PFMS-2026-MAHA-{3001+idx}",
            updated_by="PFMS_INTEGRATION_GATEWAY" if pay_status == "COMPLETED" else "SYSTEM_SYNC",
            last_synced_at=datetime.now(timezone.utc)
        )
        db.add(payment)

        # Audit log for completed procurement
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_user_id=staff_b.id,
            actor_role="STAFF",
            centre_id=centre.id,
            entity_type="procurement",
            entity_id=proc.id,
            action="PROCUREMENT_COMPLETED",
            old_value_json='{"status": "QUALITY_CHECK"}',
            new_value_json=f'{{"status": "ACCEPTED", "actual_q": {act_q}, "payment_status": "{pay_status}"}}',
            reason="Physical batch weighed and passed quality inspection",
            created_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(audit)

    print("Seeding 3 Discrepancy / Complaint Tickets...")
    discrepancy_cases = [
        (farmers[24], centres["CENTRE-B"], commodities["WHEAT"], 50.0, 47.2, 50.0, "Weighbridge showed 49.8q at gate; recorded weight 47.2q differs significantly.", "OPEN"),
        (farmers[25], centres["CENTRE-A"], commodities["PADDY"], 60.0, 56.5, 59.0, "Tare weight of tractor trolley was miscalculated by weighing staff.", "UNDER_REVIEW"),
        (farmers[26], centres["CENTRE-B"], commodities["JOWAR"], 40.0, 38.0, 39.5, "Bag count variance of 3 bags.", "RESOLVED")
    ]

    for idx, (farmer, centre, comm, exp_q, act_q, rep_q, reason, d_status) in enumerate(discrepancy_cases):
        b = Booking(
            id=str(uuid.uuid4()),
            booking_number=f"BK-DISP-{301+idx}",
            farmer_id=farmer.id,
            centre_id=centre.id,
            commodity_id=comm.id,
            booking_date=yesterday_str,
            slot_start="14:00",
            slot_end="14:30",
            expected_quantity_q=exp_q,
            source="FARMER",
            status="QUALITY_CHECK" if d_status != "RESOLVED" else "COMPLETED"
        )
        db.add(b)
        db.flush()

        proc = Procurement(
            id=str(uuid.uuid4()),
            booking_id=b.id,
            expected_quantity_q=exp_q,
            actual_quantity_q=act_q,
            quantity_recorded_at=datetime.now(timezone.utc) - timedelta(hours=12),
            quality_status="PASSED",
            procurement_status="PENDING" if d_status != "RESOLVED" else "ACCEPTED"
        )
        db.add(proc)
        db.flush()

        disp = Dispute(
            id=str(uuid.uuid4()),
            procurement_id=proc.id,
            farmer_id=farmer.id,
            type="QUANTITY_DISCREPANCY",
            reported_quantity_q=rep_q,
            reason=reason,
            status=d_status,
            resolution_note="Re-weighed secondary tare bag sample; verified acceptable calibration." if d_status == "RESOLVED" else None,
            resolved_by="Suresh Deshmukh (Centre Manager)" if d_status == "RESOLVED" else None,
            resolved_at=datetime.now(timezone.utc) - timedelta(hours=2) if d_status == "RESOLVED" else None
        )
        db.add(disp)

    print("Seeding Initial In-App Notifications for Main Demo Farmer (Ramesh Patil)...")
    ramesh = farmers[0] # Ramesh Patil
    notifs = [
        ("BOOKING_REMINDER", "Procurement Window Open for Rabi Season", "Wheat and Jowar procurement slots are now active across Pune district centres. Book your slot on AnnaSetu."),
        ("CAPACITY_ALERT", "High Capacity Available at Hadapsar Agro Hub", "Centre B (Hadapsar Agro Logistics Hub) reports 320 tonnes of available storage capacity and fast processing.")
    ]
    for etype, title, body in notifs:
        n = Notification(
            id=str(uuid.uuid4()),
            user_id=ramesh.id,
            channel="IN_APP",
            event_type=etype,
            title=title,
            body=body,
            delivery_status="SENT"
        )
        db.add(n)

    db.commit()
    print("Database seeding completed successfully!")
    print(f"Summary: 5 Centres, 6 Commodities, 35 Farmers, 12 Today's Queue items, 12 Completed, 3 No-shows, 3 Disputes.")

    if close_db:
        db.close()

if __name__ == "__main__":
    reset_and_seed_database()
