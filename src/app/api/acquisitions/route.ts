import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  const caseId = url.searchParams.get("caseId");

  if (!deviceId && !caseId) {
    return NextResponse.json({ error: "deviceId or caseId required" }, { status: 400 });
  }

  // Filter by org through case relation
  const where: { caseId?: string; deviceId?: string } = {};
  if (deviceId) where.deviceId = deviceId;
  if (caseId) where.caseId = caseId;

  const acquisitions = await db.acquisition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      performedBy: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, organizationId: true } },
    },
  });

  // Filter by organization
  const filtered = acquisitions.filter((a) => a.case.organizationId === user.organizationId);

  return NextResponse.json(
    filtered.map((a) => ({
      id: a.id,
      deviceId: a.deviceId,
      caseId: a.caseId,
      method: a.method,
      status: a.status,
      sha256: a.sha256,
      sha512: a.sha512,
      dataSizeMB: a.dataSizeMB,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      performedById: a.performedById,
      integrityVerifiedAt: a.integrityVerifiedAt?.toISOString() ?? null,
      integrityVerifiedById: a.integrityVerifiedById,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      performedBy: a.performedBy,
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as {
    deviceId: string;
    caseId: string;
    method: string;
    notes?: string;
  };

  // Validate ownership
  const device = await db.device.findFirst({
    where: { id: body.deviceId, organizationId: user.organizationId! },
  });
  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  // Mark any in_progress acquisitions as failed
  await db.acquisition.updateMany({
    where: { deviceId: body.deviceId, status: "in_progress" },
    data: { status: "failed" },
  });

  const acq = await db.acquisition.create({
    data: {
      deviceId: body.deviceId,
      caseId: body.caseId,
      method: body.method,
      status: "in_progress",
      notes: body.notes,
      performedById: user.id,
    },
    include: {
      performedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Update device connection status
  await db.device.update({
    where: { id: body.deviceId },
    data: { connectionStatus: "connected" },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: body.caseId,
    action: "acquisition_started",
    resourceType: "acquisition",
    resourceId: acq.id,
    details: `Started ${body.method} acquisition on device ${device.evidenceBagId}`,
  });

  return NextResponse.json({
    ...acq,
    startedAt: acq.startedAt.toISOString(),
    completedAt: acq.completedAt?.toISOString() ?? null,
    integrityVerifiedAt: acq.integrityVerifiedAt?.toISOString() ?? null,
    createdAt: acq.createdAt.toISOString(),
    updatedAt: acq.updatedAt.toISOString(),
  });
}
