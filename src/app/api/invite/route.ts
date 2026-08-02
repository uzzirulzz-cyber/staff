import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { parseInviteToken } from "@/lib/activation-link";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const parsed = parseInviteToken(token);

  if (!parsed) {
    return NextResponse.json({ error: "Invalid staff access link" }, { status: 400 });
  }

  const organization = await withRetry(() =>
    db.organization.findUnique({
      where: { id: parsed.organizationId },
      select: { id: true, name: true, licenseKey: true },
    })
  );

  if (!organization) {
    return NextResponse.json({ error: "Staff access link is no longer valid" }, { status: 404 });
  }

  return NextResponse.json({ organization });
}
