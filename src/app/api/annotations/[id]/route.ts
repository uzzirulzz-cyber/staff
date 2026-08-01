import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const ann = await db.annotation.findUnique({
    where: { id },
    include: { case: true },
  });
  if (!ann || ann.case.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (ann.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  await db.annotation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
