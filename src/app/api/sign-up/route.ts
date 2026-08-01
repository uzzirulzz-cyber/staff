import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Registration is DISABLED — only the single admin account exists.
// No users can sign up or register.
export async function POST() {
  return NextResponse.json(
    { error: "Registration is disabled. Only the admin account is authorized." },
    { status: 403 }
  );
}
