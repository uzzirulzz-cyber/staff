import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/reverse-geocode?lat=X&lon=Y — reverse geocodes GPS coordinates
// to a human-readable location name using OpenStreetMap Nominatim (free,
// no API key). Returns city, region, country, display_name.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: { "User-Agent": "FORENSIQ/4.2.1" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Reverse geocode failed" }, { status: 502 });
    }

    const data = await res.json();
    const addr = data.address || {};

    const city = addr.city || addr.town || addr.village || addr.hamlet || null;
    const region = addr.state || addr.county || null;
    const country = addr.country || null;
    const road = addr.road || null;
    const postcode = addr.postcode || null;

    const locationName = [city, region, country].filter(Boolean).join(", ") || data.display_name || null;
    const detailedName = road ? `${road}, ${locationName}` : locationName;

    return NextResponse.json({
      locationName,
      detailedName,
      city,
      region,
      country,
      road,
      postcode,
      displayName: data.display_name || null,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    });
  } catch {
    return NextResponse.json(
      { error: "Reverse geocode failed", lat: parseFloat(lat ?? "0"), lon: parseFloat(lon ?? "0") },
      { status: 502 }
    );
  }
}
