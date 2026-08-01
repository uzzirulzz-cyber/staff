import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireOrg();
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  const category = url.searchParams.get("category");
  const recoveryStatus = url.searchParams.get("recoveryStatus");
  const minConfidence = url.searchParams.get("minConfidence");
  const q = url.searchParams.get("q");
  const selectedOnly = url.searchParams.get("selectedOnly") === "true";

  if (!caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  const items = await db.evidenceItem.findMany({
    where: {
      caseId,
      case: { organizationId: user.organizationId! },
      ...(category ? { category } : {}),
      ...(recoveryStatus ? { recoveryStatus } : {}),
      ...(minConfidence ? { confidence: { gte: parseInt(minConfidence, 10) } } : {}),
      ...(q ? { fileName: { contains: q } } : {}),
      ...(selectedOnly ? { isSelected: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json(
    items.map((e) => ({
      ...e,
      createdAtDevice: e.createdAtDevice?.toISOString() ?? null,
      modifiedAtDevice: e.modifiedAtDevice?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      decodedContent: e.decodedContent ?? null,
    }))
  );
}
