import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const session = await db.scanSession.findFirst({
    where: { id, case: { organizationId: user.organizationId! } },
    include: {
      device: { select: { id: true, name: true, make: true, model: true } },
    },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...session,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
}
