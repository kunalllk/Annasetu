import { NextRequest, NextResponse } from "next/server";
import { globalStore } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  try {
    // GET /health
    if (path === "health") {
      return NextResponse.json({
        status: "healthy",
        service: "AnnaSetu Procurement Platform API (Vercel Serverless)",
        version: "1.0.0",
        demo_mode: true,
      });
    }

    // GET /commodities
    if (path === "commodities") {
      return NextResponse.json({ data: globalStore.getCommodities() });
    }

    // GET /centres
    if (path === "centres") {
      return NextResponse.json({ data: globalStore.getCentres() });
    }

    // GET /centres/{id}
    if (path.startsWith("centres/")) {
      const id = slug[1];
      const centre = globalStore.getCentre(id);
      return NextResponse.json({ data: centre || null });
    }

    // GET /auth/demo-users
    if (path === "auth/demo-users") {
      return NextResponse.json({ data: globalStore.getUsers() });
    }

    // GET /farmers/{id}/bookings
    if (slug[0] === "farmers" && slug[2] === "bookings") {
      const farmerId = slug[1];
      return NextResponse.json({ data: globalStore.getFarmerBookings(farmerId) });
    }

    // GET /farmers/{id}/transactions
    if (slug[0] === "farmers" && slug[2] === "transactions") {
      const farmerId = slug[1];
      return NextResponse.json({ data: globalStore.getFarmerTransactions(farmerId) });
    }

    // GET /staff/dashboard
    if (path === "staff/dashboard") {
      const centreId = request.headers.get("X-Demo-Centre-Id") || "centre-b";
      return NextResponse.json({ data: globalStore.getStaffDashboard(centreId) });
    }

    // GET /staff/queue
    if (path === "staff/queue") {
      const centreId = request.headers.get("X-Demo-Centre-Id") || "centre-b";
      return NextResponse.json({ data: globalStore.getStaffQueue(centreId) });
    }

    // GET /notifications
    if (path === "notifications") {
      return NextResponse.json({ data: globalStore.state.notifications });
    }

    // GET /admin/centres
    if (path === "admin/centres") {
      return NextResponse.json({ data: globalStore.getCentres() });
    }

    // GET /admin/audit
    if (path === "admin/audit") {
      return NextResponse.json({ data: globalStore.getAuditLogs(50) });
    }

    // GET /analytics/centre
    if (path === "analytics/centre") {
      return NextResponse.json({
        data: {
          average_wait_min: 35,
          average_processing_min: 18,
          quantity_procured_q: 820,
          utilization_pct: 74.2,
          no_show_rate_pct: 6.4,
          payment_pending_count: 6,
          payment_completed_count: 6,
          disputes_open_count: 1,
          series: [
            { day: "Mon", procured_q: 280, target_q: 300 },
            { day: "Tue", procured_q: 320, target_q: 300 },
            { day: "Wed", procured_q: 350, target_q: 300 },
            { day: "Thu", procured_q: 310, target_q: 300 },
            { day: "Fri", procured_q: 340, target_q: 300 },
          ],
        },
      });
    }

    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ detail: { message: err.message || "Server Error" } }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body optional for reset/confirm
  }

  try {
    // POST /bookings/recommend
    if (path === "bookings/recommend") {
      return NextResponse.json({ data: globalStore.recommendBooking(body) });
    }

    // POST /bookings
    if (path === "bookings") {
      return NextResponse.json({ data: globalStore.createBooking(body) });
    }

    // POST /bookings/{id}/cancel
    if (slug[0] === "bookings" && slug[2] === "cancel") {
      const id = slug[1];
      return NextResponse.json({ data: globalStore.cancelBooking(id, body?.reason) });
    }

    // POST /staff/bookings/{id}/arrive
    if (slug[0] === "staff" && slug[1] === "bookings" && slug[3] === "arrive") {
      const id = slug[2];
      return NextResponse.json({ data: globalStore.markArrived(id, body?.arrival_note) });
    }

    // POST /staff/bookings/{id}/no-show
    if (slug[0] === "staff" && slug[1] === "bookings" && slug[3] === "no-show") {
      const id = slug[2];
      return NextResponse.json({ data: globalStore.markNoShow(id, body?.reason) });
    }

    // POST /staff/procurements/{booking_id}/weigh
    if (slug[0] === "staff" && slug[1] === "procurements" && slug[3] === "weigh") {
      const id = slug[2];
      return NextResponse.json({
        data: globalStore.recordWeighing(id, body.actual_quantity_q, body.operator_note),
      });
    }

    // POST /staff/procurements/{booking_id}/quality
    if (slug[0] === "staff" && slug[1] === "procurements" && slug[3] === "quality") {
      const id = slug[2];
      return NextResponse.json({
        data: globalStore.recordQuality(id, body.status, body.reason),
      });
    }

    // POST /staff/procurements/{booking_id}/complete
    if (slug[0] === "staff" && slug[1] === "procurements" && slug[3] === "complete") {
      const id = slug[2];
      return NextResponse.json({
        data: globalStore.completeProcurement(id, body?.completion_note),
      });
    }

    // POST /procurements/{id}/confirm-quantity
    if (slug[0] === "procurements" && slug[2] === "confirm-quantity") {
      const id = slug[1];
      return NextResponse.json({ data: globalStore.confirmQuantity(id) });
    }

    // POST /procurements/{id}/disputes
    if (slug[0] === "procurements" && slug[2] === "disputes") {
      const id = slug[1];
      return NextResponse.json({ data: globalStore.createDispute(id, body) });
    }

    // POST /simulation/run
    if (path === "simulation/run") {
      return NextResponse.json({
        data: globalStore.runSimulation(body.centre_id, body.action),
      });
    }

    // POST /simulation/reset
    if (path === "simulation/reset") {
      globalStore.reset();
      return NextResponse.json({
        data: {
          success: true,
          message: "AnnaSetu demonstration database has been reset to baseline state.",
        },
      });
    }

    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ detail: { message: err.message || "Operation Error" } }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body optional
  }

  try {
    // PATCH /admin/payments/{id}
    if (slug[0] === "admin" && slug[1] === "payments") {
      const id = slug[2];
      return NextResponse.json({
        data: globalStore.updatePaymentStatus(id, body.status || "COMPLETED"),
      });
    }

    // PATCH /admin/centres/{id}
    if (slug[0] === "admin" && slug[1] === "centres") {
      const id = slug[2];
      const centre = globalStore.getCentre(id);
      if (centre && body.storage_capacity_q) {
        centre.capacity.storage_capacity_q = Number(body.storage_capacity_q);
      }
      return NextResponse.json({ data: centre });
    }

    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ detail: { message: err.message || "Update Error" } }, { status: 400 });
  }
}
