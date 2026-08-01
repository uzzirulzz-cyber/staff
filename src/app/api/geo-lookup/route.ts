import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/geo-lookup — looks up real geolocation from the visitor's IP
// address using a free IP geolocation API. Returns real city, region,
// country, ISP, and coordinates.
export async function GET(req: Request) {
  try {
    // Get the real client IP from headers (Vercel sets these)
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "";

    // Use ipapi.co for free IP geolocation (no API key needed)
    const url = clientIp && !clientIp.startsWith("127.") && !clientIp.startsWith("10.")
      ? `https://ipapi.co/${clientIp}/json/`
      : `https://ipapi.co/json/`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Geo lookup failed" }, { status: 502 });
    }

    const data = await response.json();

    return NextResponse.json({
      ip: data.ip || clientIp || "unknown",
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
      postal: data.postal || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || null,
      isp: data.org || null,
      asn: data.asn || null,
      // Real network info
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Geo lookup failed", ip: "unknown" },
      { status: 502 }
    );
  }
}
