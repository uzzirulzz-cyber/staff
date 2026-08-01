import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json()) as {
    connectionStatus?: string;
    connectionMethod?: string;
    notes?: string;
  };

  const device = await db.device.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.device.update({
    where: { id },
    data: {
      ...(body.connectionStatus != null ? { connectionStatus: body.connectionStatus } : {}),
      ...(body.connectionMethod != null ? { connectionMethod: body.connectionMethod } : {}),
      ...(body.notes != null ? { notes: body.notes } : {}),
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: device.caseId,
    action: "device_updated",
    resourceType: "device",
    resourceId: id,
    details: `Updated device ${device.evidenceBagId}: ${Object.keys(body).join(", ")}`,
  });

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const device = await db.device.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.device.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: device.caseId,
    action: "device_removed",
    resourceType: "device",
    resourceId: id,
    details: `Removed device ${device.evidenceBagId}`,
  });
  return new NextResponse(null, { status: 204 });
}
