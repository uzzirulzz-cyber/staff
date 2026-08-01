import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;

  const acq = await db.acquisition.findUnique({
    where: { id },
    include: { case: true, device: true },
  });
  if (!acq || acq.case.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (acq.status !== "complete") {
    return NextResponse.json(
      { error: "Acquisition must be complete before integrity verification" },
      { status: 400 }
    );
  }

  const updated = await db.acquisition.update({
    where: { id },
    data: {
      status: "verified",
      integrityVerifiedAt: new Date(),
      integrityVerifiedById: user.id,
    },
    include: {
      performedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: acq.caseId,
    action: "acquisition_integrity_verified",
    resourceType: "acquisition",
    resourceId: id,
    details: `Integrity verified for acquisition ${acq.id} (${acq.device?.evidenceBagId ?? ""})`,
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
