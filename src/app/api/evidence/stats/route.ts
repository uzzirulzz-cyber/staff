import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  const items = await db.evidenceItem.findMany({
    where: { caseId, case: { organizationId: user.organizationId! } },
    select: {
      category: true,
      recoveryStatus: true,
      sizeBytes: true,
      isSelected: true,
    },
  });

  const byCategory: Record<string, number> = {};
  const byRecoveryStatus: Record<string, number> = {};
  let totalSizeBytes = 0;
  let selectedCount = 0;

  for (const it of items) {
    byCategory[it.category] = (byCategory[it.category] ?? 0) + 1;
    byRecoveryStatus[it.recoveryStatus] = (byRecoveryStatus[it.recoveryStatus] ?? 0) + 1;
    totalSizeBytes += it.sizeBytes ?? 0;
    if (it.isSelected) selectedCount += 1;
  }

  return NextResponse.json({
    total: items.length,
    byCategory,
    byRecoveryStatus,
    totalSizeBytes,
    selectedCount,
  });
}
