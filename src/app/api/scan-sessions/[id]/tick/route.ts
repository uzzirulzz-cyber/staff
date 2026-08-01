import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";
import { tickScanSession } from "@/lib/scan-engine";

export const dynamic = "force-dynamic";

// POST /api/scan-sessions/[id]/tick — advance one simulated step
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const session = await db.scanSession.findFirst({
    where: { id, case: { organizationId: user.organizationId! } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await tickScanSession(id);
  return NextResponse.json(result);
}

// GET — auto-tick if running, return fresh session + emitted logs
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const session = await db.scanSession.findFirst({
    where: { id, case: { organizationId: user.organizationId! } },
    include: { device: { select: { id: true, name: true, make: true, model: true } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let logs: string[] = [];
  if (session.status === "running") {
    const result = await tickScanSession(id);
    logs = result.logs;
  }

  const fresh = await db.scanSession.findUnique({
    where: { id },
    include: { device: { select: { id: true, name: true, make: true, model: true } } },
  });

  return NextResponse.json({
    ...fresh,
    startedAt: fresh!.startedAt.toISOString(),
    completedAt: fresh!.completedAt?.toISOString() ?? null,
    createdAt: fresh!.createdAt.toISOString(),
    updatedAt: fresh!.updatedAt.toISOString(),
    logs,
  });
}
