import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  const deliveries = await db.delivery.findMany({
    where: { caseId, organizationId: user.organizationId! },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    deliveries.map((d) => ({
      ...d,
      completedAt: d.completedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as {
    caseId: string;
    format: string;
    itemCount: number;
    reportNotes?: string;
    fileName?: string;
    payload?: string; // base64 data URL
  };

  // Compute size from payload (base64 length / 1.37 ~ bytes / 1024 / 1024 = MB)
  const sizeBytes = body.payload ? Math.floor((body.payload.length - body.payload.indexOf(",") - 1) * 0.75) : 0;
  const fileSizeMB = sizeBytes ? Math.max(0.01, sizeBytes / (1024 * 1024)) : null;

  const delivery = await db.delivery.create({
    data: {
      caseId: body.caseId,
      organizationId: user.organizationId!,
      format: body.format,
      status: "complete",
      itemCount: body.itemCount,
      fileSizeMB,
      completedAt: new Date(),
      createdById: user.id,
      downloadUrl: body.payload || null,
      reportNotes: body.reportNotes,
      fileName: body.fileName,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: body.caseId,
    action: "delivery_generated",
    resourceType: "delivery",
    resourceId: delivery.id,
    details: `Generated ${body.format.toUpperCase()} delivery with ${body.itemCount} items (${fileSizeMB?.toFixed(2) ?? 0} MB)`,
  });

  return NextResponse.json({
    ...delivery,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
  });
}
