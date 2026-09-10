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
            "name": "Karnal Central Grain Mandi",
            "address": "APMC Market Complex, GT Road, Karnal 132001, Haryana",
            "lat": 29.6857, "lng": 76.9905,
            "storage_capacity_q": 6000.0, # 600 tonnes
            "occupied_committed_q": 5200.0, # 86% full! Congested
            "daily_processing_capacity_q": 300.0,
            "processed_today_q": 180.0,
            "processing_rate_q_per_hr": 8.0, # Slow throughput
            "commodities": ["WHEAT", "PADDY", "JOWAR", "BAJRA", "MAIZE"]
        },
        {
            "code": "CENTRE-B",
            "name": "Ujjain Multi-Commodity Agro Hub",
            "address": "Krishi Upaj Mandi Complex, Agar Road, Ujjain 456006, Madhya Pradesh",
            "lat": 23.1765, "lng": 75.7885,
            "storage_capacity_q": 5000.0, # 500 tonnes
            "occupied_committed_q": 1800.0, # 320 tonnes remaining! High capacity fit
            "daily_processing_capacity_q": 600.0, # 60 tonnes
            "processed_today_q": 350.0, # 35 tonnes
            "processing_rate_q_per_hr": 25.0, # Fast throughput!
            "commodities": ["WHEAT", "PADDY", "JOWAR", "BAJRA", "RAGI", "MAIZE"]
        },
        {
            "code": "CENTRE-C",
            "name": "Nizamabad Regional Mega Storage Depot",
            "address": "State Warehousing & APMC Logistics Park, Nizamabad 503001, Telangana",
            "lat": 18.6725, "lng": 78.0941,
            "storage_capacity_q": 15000.0, # 1,500 tonnes
            "occupied_committed_q": 4500.0,
            "daily_processing_capacity_q": 1000.0,
            "processed_today_q": 420.0,
            "processing_rate_q_per_hr": 30.0,
            "commodities": ["WHEAT", "PADDY", "MAIZE"]
        },
        {
            "code": "CENTRE-D",
            "name": "Alwar Krishi Upaj Mandi Yard",
            "address": "Matsya Industrial Area APMC Terminal, Alwar 301001, Rajasthan",
            "lat": 27.5530, "lng": 76.6346,
            "storage_capacity_q": 3500.0,
            "occupied_committed_q": 2900.0,
            "daily_processing_capacity_q": 350.0,
            "processed_today_q": 310.0, # Near full daily limit (90%)
            "processing_rate_q_per_hr": 12.0,
            "commodities": ["WHEAT", "JOWAR", "BAJRA"]
        },
        {
            "code": "CENTRE-E",
            "name": "Burdwan Coarse Grain & Rice Depot",
            "address": "FCI Complex & APMC Sub-Yard, Nababhat, Bardhaman 713101, West Bengal",
            "lat": 23.2324, "lng": 87.8615,
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
        display_name="Dr. Rajeshwar Sharma (Director General)",
        mobile_masked="+91 98XXX XX001",
        email="rajeshwar.sharma@annasetu.gov.in"
    )
    db.add(admin_user)

    # CSC Operator
    csc_user = User(
        id=str(uuid.uuid4()),
        role="CSC",
        display_name="Pravin Kumar (CSC Digital Seva Kendra)",
        mobile_masked="+91 98XXX XX002",
        email="csc.kiosk@annasetu.gov.in"
    )
    db.add(csc_user)

    # Centre B Staff (Primary Demo Staff - Ujjain)
    staff_b = User(
        id=str(uuid.uuid4()),
        role="STAFF",
        display_name="S. K. Verma (Senior Procurement Officer)",
        mobile_masked="+91 98XXX XX003",
        email="sk.verma@annasetu.gov.in"
    )
    db.add(staff_b)
    db.flush()

    staff_assign_b = StaffAssignment(
        user_id=staff_b.id,
        centre_id=centres["CENTRE-B"].id,
        active=True
    )
    db.add(staff_assign_b)

    # Centre A Staff (Karnal)
    staff_a = User(
        id=str(uuid.uuid4()),
        role="STAFF",
        display_name="Manpreet Singh Sodhi (Gate Inspector)",
        mobile_masked="+91 98XXX XX004",
        email="manpreet.sodhi@annasetu.gov.in"
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

    print("Seeding 35 Pan-India Farmers...")
    farmer_records = [
        ("Ramkishore Yadav", "Tarana", "Ujjain", "Madhya Pradesh", 23.2010, 75.8210),
        ("Harpreet Singh", "Nilokheri", "Karnal", "Haryana", 29.7210, 76.9520),
        ("Gurpreet Singh Gill", "Khanna", "Ludhiana", "Punjab", 30.7020, 76.2150),
        ("Venkata Subba Rao", "Armoor", "Nizamabad", "Telangana", 18.7910, 78.2910),
        ("Manoj Meena", "Behror", "Alwar", "Rajasthan", 27.8870, 76.2810),
        ("Subhash Mondal", "Memari", "Bardhaman", "West Bengal", 23.1810, 88.1120),
        ("Rajeshwar Patil", "Niphad", "Nashik", "Maharashtra", 20.0820, 74.1120),
        ("Annamalai Reddiar", "Kumbakonam", "Thanjavur", "Tamil Nadu", 10.9610, 79.3820),
        ("Manjunath Gowda", "Maddur", "Mandya", "Karnataka", 12.5840, 77.0420),
        ("Bhupendra Chaudhari", "Kadi", "Mehsana", "Gujarat", 23.2980, 72.3310),
        ("Dinesh Chandra Sharma", "Nawabganj", "Barabanki", "Uttar Pradesh", 26.9280, 81.1890),
        ("Birendra Prasad Singh", "Dumraon", "Buxar", "Bihar", 25.5640, 83.9770),
        ("Joginder Pal", "Pehowa", "Kurukshetra", "Haryana", 29.9820, 76.5820),
        ("Balwant Dhillon", "Baghapurana", "Moga", "Punjab", 30.8160, 75.1720),
        ("Shivram Patel", "Sonkatch", "Dewas", "Madhya Pradesh", 22.9670, 76.0530),
        ("K. Srirama Murthy", "Tenali", "Guntur", "Andhra Pradesh", 16.2430, 80.6400),
        ("Prabhat Ranjan Jena", "Attabira", "Bargarh", "Odisha", 21.3340, 83.6210),
        ("Dipankar Saikia", "Raha", "Nagaon", "Assam", 26.3480, 92.6840),
        ("Raghunath Soren", "Shikaripara", "Dumka", "Jharkhand", 24.2680, 87.2490),
        ("Sukhwinder Kaur", "Amloh", "Fatehgarh Sahib", "Punjab", 30.6420, 76.3880),
        ("Sunita Devi Kushwaha", "Dehri", "Rohtas", "Bihar", 24.9520, 84.0310),
        ("Laxmi Narayan Rathore", "Sangod", "Kota", "Rajasthan", 25.1800, 75.8340),
        ("Chandrashekhar Hegde", "Yellapur", "Uttara Kannada", "Karnataka", 14.6190, 74.8440),
        ("Karthikeyan Selvam", "Anaimalai", "Coimbatore", "Tamil Nadu", 10.6600, 77.0080),
        ("Devendra Solanki", "Petlad", "Anand", "Gujarat", 22.5640, 72.9280),
        ("Gajanan Deshmukh", "Morshi", "Amravati", "Maharashtra", 20.9320, 77.7520),
        ("Babu Lal Verma", "Ashta", "Sehore", "Madhya Pradesh", 23.2030, 77.0840),
        ("Mahendra Pratap Singh", "Maholi", "Sitapur", "Uttar Pradesh", 27.5720, 80.6790),
        ("Tapan Kumar Roy", "Dinhata", "Cooch Behar", "West Bengal", 26.3230, 89.4510),
        ("Santosh Kumar Sahu", "Abhanpur", "Raipur", "Chhattisgarh", 21.2510, 81.6290),
        ("Ravinder Reddy", "Miryalaguda", "Nalgonda", "Telangana", 16.8710, 79.5620),
        ("Choudhary Ranjeet Ram", "Pilibanga", "Hanumangarh", "Rajasthan", 29.5810, 74.3210),
        ("Amarjit Singh Sandhu", "Patti", "Tarn Taran", "Punjab", 31.4520, 74.9280),
        ("Kishore Naik", "Kuchinda", "Sambalpur", "Odisha", 21.4680, 83.9780),
        ("Pooja Shrikant Shinde", "Hatkanangle", "Kolhapur", "Maharashtra", 16.7050, 74.2430),
    ]

    farmers = []
    for idx, (name, village, dist, state_name, lat, lng) in enumerate(farmer_records):
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
            state=state_name,
            preferred_language="Hindi" if state_name in ["Madhya Pradesh", "Rajasthan", "Uttar Pradesh", "Bihar", "Chhattisgarh", "Haryana"] else "English",
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

    print("Seeding Today's Active Queue for Centre B (Ujjain Multi-Commodity Agro Hub)...")
    
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
            external_reference_masked=f"PFMS-2026-GOI-{90100+idx}",
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
