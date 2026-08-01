import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const d = await db.delivery.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delivery.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    caseId: d.caseId,
    action: "delivery_deleted",
    resourceType: "delivery",
    resourceId: id,
    details: `Deleted ${d.format.toUpperCase()} delivery`,
  });
  return new NextResponse(null, { status: 204 });
}
