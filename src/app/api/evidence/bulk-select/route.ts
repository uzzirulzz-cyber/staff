import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as { ids: string[]; selected: boolean; caseId?: string };

  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  // Validate all items belong to user's org
  const items = await db.evidenceItem.findMany({
    where: { id: { in: body.ids } },
    include: { case: true },
  });
  const valid = items.filter((i) => i.case.organizationId === user.organizationId);
  if (valid.length !== body.ids.length) {
    return NextResponse.json({ error: "Some items not found" }, { status: 404 });
  }

  // Derive caseId from the first item if not provided
  const caseId = body.caseId ?? valid[0]?.caseId ?? null;

  await db.evidenceItem.updateMany({
    where: { id: { in: body.ids } },
    data: { isSelected: body.selected },
  });

  if (caseId) {
    await writeAuditLog({
      userId: user.id,
      organizationId: user.organizationId!,
      caseId,
      action: body.selected ? "evidence_bulk_selected" : "evidence_bulk_deselected",
      resourceType: "evidence",
      resourceId: caseId,
      details: `${body.selected ? "Selected" : "Deselected"} ${body.ids.length} evidence items`,
    });
  }

  return NextResponse.json({ updated: body.ids.length });
}
