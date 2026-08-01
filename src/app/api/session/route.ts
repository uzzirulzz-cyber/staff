import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, organization: null });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      organizationId: user.organizationId,
      mfaEnabled: user.mfaEnabled,
      lastActive: user.lastActive?.toISOString() ?? null,
      tokenIdentifier: user.tokenIdentifier,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          licenseType: user.organization.licenseType,
        }
      : null,
  });
}
