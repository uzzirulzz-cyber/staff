import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");

  const logs = await db.auditLog.findMany({
    where: {
      organizationId: user.organizationId!,
      ...(caseId ? { caseId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: caseId ? 200 : 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }))
  );
}
