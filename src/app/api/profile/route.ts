import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as {
    name?: string;
    mfaEnabled?: boolean;
    role?: string;
  };

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.mfaEnabled != null ? { mfaEnabled: body.mfaEnabled } : {}),
      ...(body.role != null ? { role: body.role } : {}),
    },
  });

  if (user.organizationId) {
    await writeAuditLog({
      userId: user.id,
      organizationId: user.organizationId,
      action: "profile_updated",
      resourceType: "user",
      resourceId: user.id,
      details: `Updated ${Object.keys(body).join(", ")}`,
    });
  }

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatar: updated.avatar,
      role: updated.role,
      organizationId: updated.organizationId,
      mfaEnabled: updated.mfaEnabled,
      lastActive: updated.lastActive?.toISOString() ?? null,
      tokenIdentifier: updated.tokenIdentifier,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
