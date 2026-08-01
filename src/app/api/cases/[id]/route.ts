import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const c = await db.case.findFirst({
    where: { id, organizationId: user.organizationId! },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          devices: true,
          acquisitions: true,
          scanSessions: true,
          evidenceItems: true,
          deliveries: true,
        },
      },
    },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json()) as Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedToId: string | null;
    tags: string[];
  }>;

  const existing = await db.case.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.case.update({
    where: { id },
    data: {
      ...(body.title != null ? { title: body.title } : {}),
      ...(body.description != null ? { description: body.description } : {}),
      ...(body.status != null
        ? { status: body.status, closedAt: body.status === "closed" ? new Date() : null }
        : {}),
      ...(body.priority != null ? { priority: body.priority } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
      ...(body.tags != null ? { tags: JSON.stringify(body.tags) } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          devices: true,
          acquisitions: true,
          scanSessions: true,
          evidenceItems: true,
          deliveries: true,
        },
      },
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: id,
    action: "case_updated",
    resourceType: "case",
    resourceId: id,
    details: `Updated ${Object.keys(body).join(", ")}`,
  });

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    closedAt: updated.closedAt?.toISOString() ?? null,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const existing = await db.case.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.case.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: id,
    action: "case_deleted",
    resourceType: "case",
    resourceId: id,
    details: `Deleted case ${existing.caseNumber}`,
  });
  return new NextResponse(null, { status: 204 });
}
