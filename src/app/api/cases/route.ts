import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireOrg();
  const cases = await db.case.findMany({
    where: { organizationId: user.organizationId! },
    orderBy: { updatedAt: "desc" },
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
  return NextResponse.json(
    cases.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    tags?: string[];
  };

  if (!body.title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  // Generate case number: FNQ-YYYY-NNNN
  const year = new Date().getFullYear();
  const count = await db.case.count({
    where: {
      organizationId: user.organizationId!,
      caseNumber: { startsWith: `FNQ-${year}-` },
    },
  });
  const caseNumber = `FNQ-${year}-${String(count + 1).padStart(4, "0")}`;

  const c = await db.case.create({
    data: {
      organizationId: user.organizationId!,
      caseNumber,
      title: body.title,
      description: body.description,
      status: body.status || "open",
      priority: body.priority || "medium",
      createdById: user.id,
      tags: JSON.stringify(body.tags || []),
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
    caseId: c.id,
    action: "case_created",
    resourceType: "case",
    resourceId: c.id,
    details: `Created case ${c.caseNumber}: ${c.title}`,
  });

  return NextResponse.json({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
  });
}
