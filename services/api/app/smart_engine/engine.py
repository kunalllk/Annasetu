import math
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.entities import Centre, CentreCommodity, Booking, QueueEntry
from app.schemas.schemas import RecommendationRequest, RecommendationResult, RecommendedSlot
from app.core.config import settings

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class SmartRecommendationEngine:
    @classmethod
    def recommend(
        cls,
        db: Session,
        request: RecommendationRequest
    ) -> RecommendationResult:
        # 1. Identify eligible centres supporting the requested commodity
        eligible_centre_ids = [
            cc.centre_id for cc in db.query(CentreCommodity).filter(
                CentreCommodity.commodity_id == request.commodity_id,
                CentreCommodity.active == True
            ).all()
        ]
        
        if not eligible_centre_ids:
            return RecommendationResult(recommended=None, alternatives=[], engine_version="rules-v1")

        centres = db.query(Centre).filter(
            Centre.id.in_(eligible_centre_ids),
            Centre.active == True
        ).all()

        # 2. Filter out centres with insufficient capacity
        viable_candidates: List[Dict[str, Any]] = []

        farmer_lat = request.origin_lat or 18.5204
        farmer_lng = request.origin_lng or 73.8567

        for centre in centres:
            # Check remaining storage capacity and daily processing capacity
            rem_storage = centre.remaining_storage_q
            rem_daily = centre.remaining_daily_processing_q

            # Capacity constraint check: Must have at least enough space for the farmer's expected load
            if rem_storage < request.expected_quantity_q or rem_daily < request.expected_quantity_q:
                continue

            dist_km = haversine_distance_km(farmer_lat, farmer_lng, centre.lat, centre.lng)

            # Query current active bookings and queue for the requested date
            date_bookings = db.query(Booking).filter(
                Booking.centre_id == centre.id,
                Booking.booking_date == request.preferred_date,
                Booking.status.in_(["CONFIRMED", "ARRIVED", "WAITING", "WEIGHING", "QUALITY_CHECK"])
            ).all()

            # Workload calculation: pending quintals
            pending_q = sum(b.expected_quantity_q for b in date_bookings)
            queue_count = len(date_bookings)

            # Calculate expected waiting time in minutes
            # rate is in quintals per hour -> quintals per minute = rate / 60
            rate_per_min = max(centre.processing_rate_q_per_hr / 60.0, 0.1)
            expected_wait_min = int(round(pending_q / rate_per_min))
            # Baseline minimum processing buffer per farmer
            expected_wait_min = max(15, expected_wait_min)

            # Slot generation: pick the best 30-min window within preferred time or centre operating hours
            slot_start, slot_end = cls._find_optimal_slot(
                centre, date_bookings, request.preferred_time_start, request.preferred_time_end
            )

            viable_candidates.append({
                "centre": centre,
                "distance_km": dist_km,
                "remaining_storage_q": rem_storage,
                "remaining_daily_q": rem_daily,
                "queue_count": queue_count,
                "pending_q": pending_q,
                "expected_wait_min": expected_wait_min,
                "processing_rate_q_per_hr": centre.processing_rate_q_per_hr,
                "slot_start": slot_start,
                "slot_end": slot_end,
            })

        if not viable_candidates:
            return RecommendationResult(recommended=None, alternatives=[], engine_version="rules-v1")

        # 3. Calculate normalized composite score for each candidate
        # Weights: Wait (35%), Capacity (25%), Distance (20%), Preferred-time match (10%), Congestion (10%)
        max_dist = max(c["distance_km"] for c in viable_candidates) or 1.0
        min_dist = min(c["distance_km"] for c in viable_candidates)
        max_wait = max(c["expected_wait_min"] for c in viable_candidates) or 1.0
        min_wait = min(c["expected_wait_min"] for c in viable_candidates)
        max_cap = max(c["remaining_storage_q"] for c in viable_candidates) or 1.0

        scored_candidates: List[RecommendedSlot] = []

        for c in viable_candidates:
            # Distance score: closer is better (invert normalized distance)
            dist_score = 1.0 if max_dist == min_dist else 1.0 - ((c["distance_km"] - min_dist) / (max_dist - min_dist))
            
            # Wait score: lower wait is better
            wait_score = 1.0 if max_wait == min_wait else 1.0 - ((c["expected_wait_min"] - min_wait) / (max_wait - min_wait))
            
            # Capacity score: more remaining storage capacity is better
            cap_score = c["remaining_storage_q"] / max_cap
            
            # Time match: 1.0 if slot matches preferred range
            time_score = 0.95
            
            # Congestion score: lower pending quantity relative to processing rate
            congestion_score = max(0.0, 1.0 - (c["pending_q"] / max(c["centre"].daily_processing_capacity_q, 1.0)))

            total_score = (
                dist_score * settings.WEIGHT_DISTANCE +
                wait_score * settings.WEIGHT_WAIT +
                cap_score * settings.WEIGHT_CAPACITY +
                time_score * settings.WEIGHT_TIME_MATCH +
                congestion_score * settings.WEIGHT_CONGESTION
            )

            # Generate explainable human-readable reasons
            reasons = cls._generate_reasons(c, min_wait, min_dist, max_cap)

            slot = RecommendedSlot(
                centre_id=c["centre"].id,
                centre_name=c["centre"].name,
                centre_code=c["centre"].code,
                slot_start=f"{request.preferred_date}T{c['slot_start']}:00+05:30",
                slot_end=f"{request.preferred_date}T{c['slot_end']}:00+05:30",
                distance_km=c["distance_km"],
                remaining_capacity_q=c["remaining_storage_q"],
                expected_wait_min=c["expected_wait_min"],
                score=round(total_score, 2),
                reasons=reasons,
                processing_rate_q_per_hr=c["processing_rate_q_per_hr"]
            )
            scored_candidates.append(slot)

        # Sort descending by total composite score
        scored_candidates.sort(key=lambda s: s.score, reverse=True)

        recommended = scored_candidates[0] if scored_candidates else None
        alternatives = scored_candidates[1:3] if len(scored_candidates) > 1 else []

        return RecommendationResult(
            recommended=recommended,
            alternatives=alternatives,
            engine_version="rules-v1"
        )

    @staticmethod
    def _find_optimal_slot(
        centre: Centre,
        existing_bookings: List[Booking],
        preferred_start: str,
        preferred_end: str
    ) -> Tuple[str, str]:
        # Generate candidate 30-minute intervals between 09:00 and 16:30
        slots = [
            ("09:00", "09:30"), ("09:30", "10:00"), ("10:00", "10:30"), ("10:30", "11:00"),
            ("11:00", "11:30"), ("11:30", "12:00"), ("12:00", "12:30"), ("12:30", "13:00"),
            ("13:30", "14:00"), ("14:00", "14:30"), ("14:30", "15:00"), ("15:00", "15:30"),
            ("15:30", "16:00"), ("16:00", "16:30")
        ]
        
        # Count existing commitments per slot
        slot_counts = {s[0]: 0 for s in slots}
        for b in existing_bookings:
            if b.slot_start in slot_counts:
                slot_counts[b.slot_start] += 1

        # Prefer slot in user's preferred time window with lowest existing load
        matching_slots = [
            s for s in slots 
            if s[0] >= preferred_start and s[1] <= preferred_end
        ]
        
        candidate_pool = matching_slots if matching_slots else slots
        best_slot = min(candidate_pool, key=lambda s: slot_counts.get(s[0], 0))
        return best_slot

    @staticmethod
    def _generate_reasons(
        c: Dict[str, Any], min_wait: int, min_dist: float, max_cap: float
    ) -> List[str]:
        reasons = []
        if c["expected_wait_min"] <= min_wait + 10:
            reasons.append(f"Lowest expected wait ({c['expected_wait_min']} min)")
        elif c["expected_wait_min"] <= 40:
            reasons.append(f"Manageable wait time ({c['expected_wait_min']} min)")
            
        if c["remaining_storage_q"] >= max_cap * 0.7:
            reasons.append(f"High remaining storage capacity ({int(c['remaining_storage_q'])} q)")
        else:
            reasons.append(f"Sufficient capacity ({int(c['remaining_storage_q'])} q available)")

        if c["processing_rate_q_per_hr"] >= 20.0:
            reasons.append(f"High-throughput processing ({int(c['processing_rate_q_per_hr'])} q/hr)")

        if c["distance_km"] <= min_dist + 5.0:
            reasons.append(f"Convenient distance ({c['distance_km']} km)")

        if not reasons:
            reasons.append("Balanced capacity and operational throughput")

        return reasons[:3]
