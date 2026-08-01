import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/devices/[id]/monitor — called every 30s by the auto-update
// mechanism. Updates the device's GPS location, battery, lastMonitoredAt,
// and returns the current device state for real-time display.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    gpsLat?: number;
    gpsLon?: number;
    gpsAccuracy?: number;
    gpsLocationName?: string;
    batteryPercent?: number;
  };

  const device = await withRetry(() =>
    db.device.findFirst({ where: { id, organizationId: user.organizationId! } })
  );
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Simulate real GPS drift (device moves slightly between updates)
  const drift = () => (Math.random() - 0.5) * 0.001;
  const newLat = body.gpsLat ?? (device.gpsLat ? device.gpsLat + drift() : 37.7749);
  const newLon = body.gpsLon ?? (device.gpsLon ? device.gpsLon + drift() : -122.4194);

  // Battery drains slightly between checks
  const currentBattery = device.batteryPercent ?? 80;
  const newBattery = body.batteryPercent ?? Math.max(1, currentBattery - Math.floor(Math.random() * 2));

  // Reverse geocode the GPS coordinates → location name
  let locationName = body.gpsLocationName ?? device.gpsLocationName;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLon}&zoom=14&addressdetails=1`,
      {
        headers: { "User-Agent": "FORENSIQ/4.2.1" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      const city = addr.city || addr.town || addr.village || addr.hamlet;
      const region = addr.state || addr.county;
      const country = addr.country;
      locationName = [city, region, country].filter(Boolean).join(", ") || geoData.display_name || locationName;
    }
  } catch {
    // Geocoding failure is non-fatal — keep existing location name
  }

  const updated = await withRetry(() =>
    db.device.update({
      where: { id },
      data: {
        gpsLat: newLat,
        gpsLon: newLon,
        gpsAccuracy: body.gpsAccuracy ?? Math.floor(Math.random() * 15 + 5),
        gpsLocationName: locationName,
        gpsCapturedAt: new Date(),
        lastMonitoredAt: new Date(),
        batteryPercent: newBattery,
        connectionStatus: "monitoring",
        monitoringEnabled: true,
      },
      include: {
        _count: {
          select: { acquisitions: true, scanSessions: true, evidenceItems: true },
        },
      },
    })
  );

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    connectionStatus: updated.connectionStatus,
    batteryPercent: updated.batteryPercent,
    gpsLat: updated.gpsLat,
    gpsLon: updated.gpsLon,
    gpsAccuracy: updated.gpsAccuracy,
    gpsLocationName: updated.gpsLocationName,
    gpsCapturedAt: updated.gpsCapturedAt?.toISOString() ?? null,
    lastMonitoredAt: updated.lastMonitoredAt?.toISOString() ?? null,
    monitoringEnabled: updated.monitoringEnabled,
    monitoringIntervalSec: updated.monitoringIntervalSec,
    encryptionBotId: updated.encryptionBotId,
    encryptionStatus: updated.encryptionStatus,
    evidenceCount: updated._count.evidenceItems,
    scanCount: updated._count.scanSessions,
    acquisitionCount: updated._count.acquisitions,
    timestamp: new Date().toISOString(),
  });
}

// GET — returns current monitoring state (for polling)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const device = await withRetry(() =>
    db.device.findFirst({
      where: { id, organizationId: user.organizationId! },
      include: {
        _count: {
          select: { acquisitions: true, scanSessions: true, evidenceItems: true },
        },
      },
    })
  );
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: device.id,
    name: device.name,
    make: device.make,
    model: device.model,
    connectionStatus: device.connectionStatus,
    batteryPercent: device.batteryPercent,
    gpsLat: device.gpsLat,
    gpsLon: device.gpsLon,
    gpsAccuracy: device.gpsAccuracy,
    gpsLocationName: device.gpsLocationName,
    gpsCapturedAt: device.gpsCapturedAt?.toISOString() ?? null,
    lastMonitoredAt: device.lastMonitoredAt?.toISOString() ?? null,
    monitoringEnabled: device.monitoringEnabled,
    monitoringIntervalSec: device.monitoringIntervalSec,
    encryptionBotId: device.encryptionBotId,
    encryptionStatus: device.encryptionStatus,
    evidenceCount: device._count.evidenceItems,
    scanCount: device._count.scanSessions,
    acquisitionCount: device._count.acquisitions,
    timestamp: new Date().toISOString(),
  });
}
