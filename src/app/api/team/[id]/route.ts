import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrg();
  const { id } = await params;
  const body = (await req.json()) as { role?: string; name?: string };

  const target = await db.user.findFirst({
    where: { id, organizationId: user.organizationId! },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admins can change roles
  if (body.role !== undefined && user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  // Single-admin enforcement: the platform allows exactly one admin.
  // - An admin cannot promote another user to admin.
  // - An admin cannot demote themselves (would leave the org without an admin).
  if (body.role === "admin") {
    return NextResponse.json(
      { error: "Only one admin is permitted per platform. Admin role cannot be assigned." },
      { status: 403 }
    );
  }
  if (body.role !== undefined && target.role === "admin" && target.id === user.id) {
    return NextResponse.json(
      { error: "You cannot demote yourself. Transfer admin rights is not supported — the platform maintains a single admin." },
      { status: 403 }
    );
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.role != null ? { role: body.role } : {}),
    },
  });

  await writeAuditLog({
    userId: user.id,
    organizationId: user.organizationId!,
    action: "team_member_updated",
    resourceType: "user",
    resourceId: id,
    details: `Updated ${target.email}: ${Object.keys(body).join(", ")}`,
  });

  return NextResponse.json({
    ...updated,
    lastActive: updated.lastActive?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
