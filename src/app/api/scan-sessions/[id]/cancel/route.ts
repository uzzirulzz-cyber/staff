import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const session = await db.scanSession.findFirst({
    where: { id, case: { organizationId: user.organizationId! } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.scanSession.update({
    where: { id },
    data: { status: "cancelled", completedAt: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: session.caseId,
    action: "scan_cancelled",
    resourceType: "scan_session",
    resourceId: id,
    details: `Scan session ${id} cancelled`,
  });

  return NextResponse.json({
    ...updated,
    startedAt: updated.startedAt.toISOString(),
    completedAt: updated.completedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
