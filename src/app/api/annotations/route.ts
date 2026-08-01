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

  const annotations = await db.annotation.findMany({
    where: { caseId, case: { organizationId: user.organizationId! } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    annotations.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = (await req.json()) as { caseId: string; content: string };
  if (!body.caseId || !body.content?.trim()) {
    return NextResponse.json({ error: "caseId and content required" }, { status: 400 });
  }

  // Validate case
  const c = await db.case.findFirst({
    where: { id: body.caseId, organizationId: user.organizationId! },
  });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const ann = await db.annotation.create({
    data: {
      caseId: body.caseId,
      userId: user.id,
      content: body.content.trim(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ...ann,
    createdAt: ann.createdAt.toISOString(),
    updatedAt: ann.updatedAt.toISOString(),
  });
}
