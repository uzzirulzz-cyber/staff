import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireOrg();
  const team = await db.user.findMany({
    where: { organizationId: user.organizationId! },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(
    team.map((u) => ({
      ...u,
      lastActive: u.lastActive?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }))
  );
}
