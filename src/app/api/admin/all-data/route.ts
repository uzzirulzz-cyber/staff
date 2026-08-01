import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Admin "All Data" endpoint — returns ALL cases, evidence, users, and
// activity across the entire organization. Only accessible to admins.
// Admins have full oversight of all members' work.
export async function GET() {
  const user = await requireOrg();
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const orgId = user.organizationId!;

  const [
    allCases,
    allUsers,
    allDevices,
    allScans,
    evidenceCount,
    selectedEvidenceCount,
    deliveriesCount,
    recentEvidence,
    recentActivity,
  ] = await Promise.all([
    withRetry(() =>
      db.case.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              devices: true,
              scanSessions: true,
              evidenceItems: true,
              deliveries: true,
            },
          },
        },
      })
    ),
    withRetry(() =>
      db.user.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mfaEnabled: true,
          lastActive: true,
          createdAt: true,
          _count: {
            select: {
              casesCreated: true,
              devicesAdded: true,
              acquisitions: true,
              scansInitiated: true,
              deliveriesCreated: true,
              auditLogs: true,
            },
          },
        },
      })
    ),
    withRetry(() => db.device.count({ where: { organizationId: orgId } })),
    withRetry(() =>
      db.scanSession.count({
        where: { case: { organizationId: orgId } },
      })
    ),
    withRetry(() =>
      db.evidenceItem.count({
        where: { case: { organizationId: orgId } },
      })
    ),
    withRetry(() =>
      db.evidenceItem.count({
        where: { case: { organizationId: orgId }, isSelected: true },
      })
    ),
    withRetry(() => db.delivery.count({ where: { organizationId: orgId } })),
    withRetry(() =>
      db.evidenceItem.findMany({
        where: { case: { organizationId: orgId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          case: { select: { id: true, caseNumber: true, title: true } },
        },
      })
    ),
    withRetry(() =>
      db.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      })
    ),
  ]);

  return NextResponse.json({
    totals: {
      cases: allCases.length,
      users: allUsers.length,
      devices: allDevices,
      scans: allScans,
      evidence: evidenceCount,
      selectedEvidence: selectedEvidenceCount,
      deliveries: deliveriesCount,
    },
    cases: allCases.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
    users: allUsers.map((u) => ({
      ...u,
      lastActive: u.lastActive?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    recentEvidence: recentEvidence.map((e) => ({
      ...e,
      createdAtDevice: e.createdAtDevice?.toISOString() ?? null,
      modifiedAtDevice: e.modifiedAtDevice?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
