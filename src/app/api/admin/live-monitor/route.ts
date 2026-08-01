import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/live-monitor — admin real-time access to ALL devices
// across ALL members. Returns live GPS, monitoring, encryption status,
// and evidence counts for every device in the organization.
export async function GET() {
  const user = await requireOrg();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const devices = await withRetry(() =>
    db.device.findMany({
      where: { organizationId: user.organizationId! },
      orderBy: { lastMonitoredAt: "desc" },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            createdBy: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        addedBy: { select: { id: true, name: true, email: true, role: true } },
        _count: {
          select: { acquisitions: true, scanSessions: true, evidenceItems: true },
        },
      },
    })
  );

  const now = Date.now();
  return NextResponse.json({
    devices: devices.map((d) => {
      const lastMonitored = d.lastMonitoredAt ? new Date(d.lastMonitoredAt).getTime() : 0;
      const secondsAgo = Math.floor((now - lastMonitored) / 1000);
      return {
        id: d.id,
        name: d.name,
        make: d.make,
        model: d.model,
        os: d.os,
        evidenceBagId: d.evidenceBagId,
        connectionStatus: d.connectionStatus,
        batteryPercent: d.batteryPercent,
        // GPS
        gpsLat: d.gpsLat,
        gpsLon: d.gpsLon,
        gpsAccuracy: d.gpsAccuracy,
        gpsLocationName: d.gpsLocationName,
        gpsCapturedAt: d.gpsCapturedAt?.toISOString() ?? null,
        // Monitoring
        monitoringEnabled: d.monitoringEnabled,
        monitoringIntervalSec: d.monitoringIntervalSec,
        lastMonitoredAt: d.lastMonitoredAt?.toISOString() ?? null,
        secondsSinceLastMonitor: secondsAgo,
        isLive: secondsAgo < 60, // updated within last minute = "live"
        // Encryption
        encryptionBotId: d.encryptionBotId,
        encryptionStatus: d.encryptionStatus,
        // Counts
        evidenceCount: d._count.evidenceItems,
        scanCount: d._count.scanSessions,
        acquisitionCount: d._count.acquisitions,
        // Ownership
        case: d.case,
        addedBy: d.addedBy,
        createdAt: d.createdAt.toISOString(),
      };
    }),
    timestamp: new Date().toISOString(),
    totalDevices: devices.length,
    liveDevices: devices.filter((d) => {
      const lastMonitored = d.lastMonitoredAt ? new Date(d.lastMonitoredAt).getTime() : 0;
      return (now - lastMonitored) / 1000 < 60;
    }).length,
  });
}
