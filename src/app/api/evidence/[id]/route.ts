import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json()) as {
    sha256?: string;
    tags?: string[];
    isSelected?: boolean;
    notes?: string;
  };

  const item = await db.evidenceItem.findUnique({
    where: { id },
    include: { case: true },
  });
  if (!item || item.case.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.evidenceItem.update({
    where: { id },
    data: {
      ...(body.sha256 != null ? { sha256: body.sha256 } : {}),
      ...(body.tags != null ? { tags: JSON.stringify(body.tags) } : {}),
      ...(body.isSelected != null ? { isSelected: body.isSelected } : {}),
      ...(body.notes != null ? { notes: body.notes } : {}),
    },
  });

  if (body.sha256) {
    await writeAuditLog({
      userId: user.id,
      organizationId: user.organizationId!,
      caseId: item.caseId,
      action: "evidence_hashed",
      resourceType: "evidence",
      resourceId: id,
      details: `SHA-256 hash recorded for ${item.fileName}`,
    });
  }
  if (body.isSelected != null) {
    await writeAuditLog({
      userId: user.id,
      organizationId: user.organizationId!,
      caseId: item.caseId,
      action: body.isSelected ? "evidence_selected_for_export" : "evidence_deselected",
      resourceType: "evidence",
      resourceId: id,
      details: `${body.isSelected ? "Selected" : "Deselected"} ${item.fileName} for export`,
    });
  }

  return NextResponse.json({
    ...updated,
    createdAtDevice: updated.createdAtDevice?.toISOString() ?? null,
    modifiedAtDevice: updated.modifiedAtDevice?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const item = await db.evidenceItem.findUnique({
    where: { id },
    include: { case: true },
  });
  if (!item || item.case.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.evidenceItem.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: item.caseId,
    action: "evidence_deleted",
    resourceType: "evidence",
    resourceId: id,
    details: `Deleted evidence ${item.fileName}`,
  });
  return new NextResponse(null, { status: 204 });
}
