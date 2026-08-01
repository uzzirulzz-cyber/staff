import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireOrg();

  const [
    cases,
    activeCases,
    devices,
    acquiredDevices,
    scans,
    runningScans,
    evidence,
    selectedEvidence,
    deliveries,
    recentCasesRaw,
    recentScansRaw,
  ] = await Promise.all([
    db.case.count({ where: { organizationId: user.organizationId! } }),
    db.case.count({ where: { organizationId: user.organizationId!, status: { in: ["open", "active", "review"] } } }),
    db.device.count({ where: { organizationId: user.organizationId! } }),
    db.device.count({ where: { organizationId: user.organizationId!, connectionStatus: "acquired" } }),
    db.scanSession.count({ where: { case: { organizationId: user.organizationId! } } }),
    db.scanSession.count({ where: { case: { organizationId: user.organizationId! }, status: "running" } }),
    db.evidenceItem.count({ where: { case: { organizationId: user.organizationId! } } }),
    db.evidenceItem.count({ where: { case: { organizationId: user.organizationId! }, isSelected: true } }),
    db.delivery.count({ where: { organizationId: user.organizationId! } }),
    db.case.findMany({
      where: { organizationId: user.organizationId! },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            devices: true,
            scanSessions: true,
            evidenceItems: true,
          },
        },
      },
    }),
    db.scanSession.findMany({
      where: { case: { organizationId: user.organizationId! } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        device: { select: { id: true, name: true, make: true, model: true } },
      },
    }),
  ]);

  // Activity by day for last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const logs = await db.auditLog.findMany({
    where: { organizationId: user.organizationId!, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const activityByDay: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    activityByDay.push({
      day,
      count: logs.filter((l) => l.createdAt.toISOString().slice(0, 10) === day).length,
    });
  }

  return NextResponse.json({
    totals: {
      cases,
      activeCases,
      devices,
      acquiredDevices,
      scans,
      runningScans,
      evidence,
      selectedEvidence,
      deliveries,
    },
    recentCases: recentCasesRaw.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
    recentScans: recentScansRaw.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    activityByDay,
  });
}
