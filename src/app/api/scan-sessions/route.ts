import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";
import { generateEvidenceTemplates } from "@/lib/scan-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");

  if (!caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  const scans = await db.scanSession.findMany({
    where: {
      caseId,
      case: { organizationId: user.organizationId! },
    },
    orderBy: { createdAt: "desc" },
    include: {
      device: { select: { id: true, name: true, make: true, model: true } },
    },
  });

  return NextResponse.json(
    scans.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as {
    caseId: string;
    deviceId?: string;
  };

  // Validate case
  const c = await db.case.findFirst({
    where: { id: body.caseId, organizationId: user.organizationId! },
  });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const session = await db.scanSession.create({
    data: {
      caseId: body.caseId,
      deviceId: body.deviceId || null,
      status: "running",
      stage: "analysis",
      stageProgress: 0,
      filesAnalyzed: 0,
      filesDiscovered: 0,
      filesRecoverable: 0,
      filesRecovered: 0,
      cpuUsage: 22,
      memUsage: 35,
      storageUsage: 12,
      initiatedById: user.id,
    },
    include: {
      device: { select: { id: true, name: true, make: true, model: true } },
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: body.caseId,
    action: "scan_started",
    resourceType: "scan_session",
    resourceId: session.id,
    details: `Started scan session on ${session.device?.name ?? "case-level data"}`,
  });

  return NextResponse.json({
    ...session,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
}

// Internal helper used by /api/scan-sessions/[id]/tick (defined in scan-engine.ts)
export { generateEvidenceTemplates };
