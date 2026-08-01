import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import {
  setSessionCookie,
  writeAuditLog,
  isValidLicenseFormat,
  hashPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ActivateBody {
  mode: "create" | "join";
  orgName?: string;
  licenseKey: string;
  licenseType?: "standard" | "professional" | "enterprise";
  email: string;
  name: string;
  password?: string; // required for new users
}

export async function POST(req: Request) {
  const body = (await req.json()) as ActivateBody;

  if (!body.email || !body.licenseKey || !body.name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate license-key format (real format only — no demo keys accepted).
  if (!isValidLicenseFormat(body.licenseKey)) {
    return NextResponse.json(
      { error: "Invalid license key. Expected format: FORENSIQ-YYYY-XXXXXX-XXXXXX" },
      { status: 400 }
    );
  }

  const normalizedEmail = body.email.toLowerCase();

  // Look up the user — they must have signed up first.
  let user = await withRetry(() =>
    db.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    })
  );

  if (!user) {
    // Require a password to create the account inline.
    if (!body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: "Password (min 8 characters) is required to register" },
        { status: 400 }
      );
    }
    const passwordHash = await hashPassword(body.password);
    // The very first user in the entire database becomes the single
    // platform admin. All subsequent users are investigators.
    const userCount = await withRetry(() => db.user.count());
    const role = userCount === 0 ? "admin" : "investigator";
    user = await withRetry(() =>
      db.user.create({
      data: {
        email: normalizedEmail,
        name: body.name.trim(),
        passwordHash,
        role,
        mfaEnabled: false,
        lastActive: new Date(),
        tokenIdentifier: `email:${normalizedEmail}`,
      },
        include: { organization: true },
      })
    );
  } else {
    user = await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { name: body.name.trim() || user.name, lastActive: new Date() },
        include: { organization: true },
      })
    );
  }

  if (user.organizationId) {
    return NextResponse.json(
      { error: "This email is already registered with an organization. Sign in with your password instead, or use a different email to create a new account." },
      { status: 400 }
    );
  }

  let organization;
  if (body.mode === "create") {
    if (!body.orgName) {
      return NextResponse.json({ error: "Organization name required" }, { status: 400 });
    }
    // Ensure the license key isn't already in use by another org.
    const existingOrg = await withRetry(() =>
      db.organization.findUnique({
        where: { licenseKey: body.licenseKey },
      })
    );
    if (existingOrg) {
      return NextResponse.json(
        { error: "This license key is already activated. Use 'Join' instead." },
        { status: 400 }
      );
    }
    organization = await withRetry(() =>
      db.organization.create({
      data: {
        name: body.orgName.trim(),
        licenseKey: body.licenseKey,
        licenseType: body.licenseType || "professional",
        activatedById: user.id,
        maxUsers:
          body.licenseType === "enterprise"
            ? 50
            : body.licenseType === "standard"
            ? 5
            : 15,
      },
    }));
    await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      })
    );
    await writeAuditLog({
      userId: user.id,
      organizationId: organization.id,
      action: "organization_activated",
      resourceType: "organization",
      resourceId: organization.id,
      details: `Activated org "${organization.name}" with license ${body.licenseKey} (${organization.licenseType})`,
    });
  } else {
    // Join existing org by license key
    organization = await withRetry(() =>
      db.organization.findUnique({
        where: { licenseKey: body.licenseKey },
      })
    );
    if (!organization) {
      return NextResponse.json(
        { error: "No organization found with that license key" },
        { status: 404 }
      );
    }
    const memberCount = await withRetry(() =>
      db.user.count({
        where: { organizationId: organization.id },
      })
    );
    if (memberCount >= organization.maxUsers) {
      return NextResponse.json(
        { error: `Organization has reached its ${organization.maxUsers}-user limit` },
        { status: 400 }
      );
    }
    await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      })
    );
    await writeAuditLog({
      userId: user.id,
      organizationId: organization.id,
      action: "user_joined_organization",
      resourceType: "organization",
      resourceId: organization.id,
      details: `User ${user.email} joined organization "${organization.name}"`,
    });
  }

  await setSessionCookie(user.id);

  const freshUser = await withRetry(() =>
    db.user.findUnique({
      where: { id: user.id },
      include: { organization: true },
    })
  );

  return NextResponse.json({
    user: {
      id: freshUser!.id,
      email: freshUser!.email,
      name: freshUser!.name,
      avatar: freshUser!.avatar,
      role: freshUser!.role,
      organizationId: freshUser!.organizationId,
      mfaEnabled: freshUser!.mfaEnabled,
      lastActive: freshUser!.lastActive?.toISOString() ?? null,
      tokenIdentifier: freshUser!.tokenIdentifier,
      createdAt: freshUser!.createdAt.toISOString(),
      updatedAt: freshUser!.updatedAt.toISOString(),
    },
    organization: {
      id: organization.id,
      name: organization.name,
      licenseType: organization.licenseType,
    },
  });
}
