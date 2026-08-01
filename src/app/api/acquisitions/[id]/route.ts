import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json()) as {
    status?: string;
    sha256?: string;
    sha512?: string;
    dataSizeMB?: number;
    completedAt?: string;
  };

  const acq = await db.acquisition.findUnique({
    where: { id },
    include: { case: true, device: true },
  });
  if (!acq || acq.case.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.acquisition.update({
    where: { id },
    data: {
      ...(body.status != null ? { status: body.status } : {}),
      ...(body.sha256 != null ? { sha256: body.sha256 } : {}),
      ...(body.sha512 != null ? { sha512: body.sha512 } : {}),
      ...(body.dataSizeMB != null ? { dataSizeMB: body.dataSizeMB } : {}),
      ...(body.completedAt != null ? { completedAt: new Date(body.completedAt) } : {}),
    },
    include: {
      performedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // If completed successfully, mark device as acquired
  if (body.status === "complete" && acq.deviceId) {
    await db.device.update({
      where: { id: acq.deviceId },
      data: { connectionStatus: "acquired" },
    });
  }

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: acq.caseId,
    action: "acquisition_updated",
    resourceType: "acquisition",
    resourceId: id,
    details: `Acquisition ${acq.id} updated: ${Object.keys(body).join(", ")}`,
  });

  return NextResponse.json({
    ...updated,
    startedAt: updated.startedAt.toISOString(),
    completedAt: updated.completedAt?.toISOString() ?? null,
    integrityVerifiedAt: updated.integrityVerifiedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
