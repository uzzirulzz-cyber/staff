import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Returns the current user's organization with its license key (for the
// admin invite dialog). Only accessible to authenticated org members.
export async function GET() {
  const user = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: user.organizationId! },
    select: {
      id: true,
      name: true,
      licenseKey: true,
      licenseType: true,
      maxUsers: true,
      activatedAt: true,
      expiresAt: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...org,
    activatedAt: org.activatedAt.toISOString(),
    expiresAt: org.expiresAt?.toISOString() ?? null,
  });
}
