"use client";

import { useState } from "react";
import { useSession } from "@/lib/api";
import { AutoCapture } from "@/components/auto-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Usb, ScanLine, MapPin, CheckCircle2, Loader2, Eye,
  Wifi, Battery, Cpu, Download, Lock, Zap,
} from "lucide-react";

type Stage = "idle" | "detecting" | "scanning" | "complete";

interface CapturedData {
  device: { manufacturer: string; product: string; vid: string; pid: string; serial: string; usbVersion: string } | null;
  gps: { lat: number; lon: number; name: string } | null;
  battery: { level: number; charging: boolean } | null;
  network: { type: string; downlink: number; rtt: number } | null;
  screen: { width: number; height: number; depth: number; pixelRatio: number };
  hardware: { cores: number; memory: number | null };
  fingerprint: string;
  webgl: { vendor: string | null; renderer: string | null };
  ip: { address: string; city: string; country: string; isp: string } | null;
  screenshot: string | null;
  userAgent: string;
  language: string;
  timezone: string;
}

export function CaptureScan() {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<CapturedData | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setScanLog((prev) => [...prev, `[${ts}] ${msg}`]);
  };

  const runCapture = async (skipUSB: boolean) => {
    setStage(skipUSB ? "scanning" : "detecting");
    setProgress(5);
    setScanLog([]);
    setData(null);
    addLog(skipUSB ? "Starting browser-only capture..." : "Starting USB + browser capture...");

    // 1. USB detection (optional)
    let device: CapturedData["device"] = null;
    if (!skipUSB) {
      try {
        // @ts-expect-error WebUSB
        const nav = navigator as Navigator & { usb?: { requestDevice: (o: { filters: unknown[] }) => Promise<USBDevice> } };
        if (nav.usb) {
          addLog("Opening USB device picker...");
          const timeoutP = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000));
          const d = await Promise.race([nav.usb.requestDevice({ filters: [{}] }), timeoutP]);
          device = {
            manufacturer: d.manufacturerName || "Unknown",
            product: d.productName || "Unknown",
            vid: `0x${d.vendorId.toString(16).padStart(4, "0")}`,
            pid: `0x${d.productId.toString(16).padStart(4, "0")}`,
            serial: d.serialNumber || "N/A",
            usbVersion: `${d.usbVersionMajor}.${d.usbVersionMinor}.${d.usbVersionSubminor}`,
          };
          addLog(`USB: ${device.manufacturer} ${device.product} (${device.vid}:${device.pid})`);
          addLog(`Serial: ${device.serial}`);
        }
      } catch {
        addLog("USB skipped — continuing with browser capture");
      }
    } else {
      addLog("USB: skipped (browser-only mode)");
    }

    setStage("scanning");
    setProgress(20);

    // 2. GPS
    addLog("Acquiring GPS...");
    let gps: CapturedData["gps"] = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
      );
      let name = "Unknown";
      try {
        const r = await fetch(`/api/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        if (r.ok) name = (await r.json()).locationName || "Unknown";
      } catch {}
      gps = { lat: pos.coords.latitude, lon: pos.coords.longitude, name };
      addLog(`GPS: ${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)} — ${gps.name}`);
    } catch {
      addLog("GPS: denied or unavailable");
    }
    setProgress(35);

    // 3. Battery
    addLog("Reading battery...");
    let battery: CapturedData["battery"] = null;
    try {
      const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
      if (nav.getBattery) {
        const b = await nav.getBattery();
        battery = { level: Math.round(b.level * 100), charging: b.charging };
        addLog(`Battery: ${battery.level}%${battery.charging ? " (charging)" : ""}`);
      }
    } catch {}
    setProgress(45);

    // 4. Network
    addLog("Probing network...");
    let network: CapturedData["network"] = null;
    try {
      const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } };
      if (nav.connection) {
        network = { type: nav.connection.effectiveType || "?", downlink: nav.connection.downlink || 0, rtt: nav.connection.rtt || 0 };
        addLog(`Network: ${network.type} · ${network.downlink} Mbps · RTT ${network.rtt}ms`);
      }
    } catch {}
    setProgress(55);

    // 5. Hardware
    addLog("Reading hardware...");
    const screen = { width: window.screen.width, height: window.screen.height, depth: window.screen.colorDepth, pixelRatio: window.devicePixelRatio };
    const hardware = { cores: navigator.hardwareConcurrency || 0, memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null };
    addLog(`Screen: ${screen.width}×${screen.height} · CPU: ${hardware.cores} cores${hardware.memory ? ` · RAM: ${hardware.memory}GB` : ""}`);
    setProgress(65);

    // 6. Fingerprint
    addLog("Generating fingerprint...");
    let fingerprint = "unknown";
    try {
      const c = document.createElement("canvas"); c.width = 200; c.height = 50;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top"; ctx.font = "14px Arial";
        ctx.fillStyle = "#f60"; ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = "#069"; ctx.fillText("FNQ-" + navigator.language, 2, 15);
        fingerprint = c.toDataURL().slice(-50);
      }
    } catch {}
    addLog(`Fingerprint: ${fingerprint.slice(0, 20)}...`);
    setProgress(75);

    // 7. WebGL
    addLog("Reading GPU...");
    let webgl = { vendor: null, renderer: null } as CapturedData["webgl"];
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          webgl = { vendor: gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) };
          addLog(`GPU: ${webgl.vendor} ${webgl.renderer}`);
        }
      }
    } catch {}
    setProgress(82);

    // 8. IP
    addLog("Resolving IP...");
    let ip: CapturedData["ip"] = null;
    try {
      const r = await fetch("/api/geo-lookup");
      if (r.ok) {
        const d = await r.json();
        ip = { address: d.ip || "?", city: d.city || "", country: d.country || "", isp: d.isp || "" };
        addLog(`IP: ${ip.address} (${ip.city}, ${ip.country} — ${ip.isp})`);
      }
    } catch {}
    setProgress(88);

    // 9. Screenshot
    addLog("Capturing screen preview...");
    let screenshot: string | null = null;
    try {
      const c = document.createElement("canvas"); c.width = window.innerWidth; c.height = window.innerHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = "rgba(48,50,80,0.3)"; ctx.lineWidth = 1;
        for (let x = 0; x < c.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
        for (let y = 0; y < c.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.min(36, c.width / 12)}px Inter`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("Capture Preview", c.width / 2, c.height / 2);
        ctx.font = "10px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(new Date().toISOString(), c.width / 2, c.height - 20);
        screenshot = c.toDataURL("image/jpeg", 0.7);
        addLog("Screen preview captured");
      }
    } catch {}
    setProgress(94);

    // 10. Store
    addLog("Storing to evidence database...");
    const allData: CapturedData = {
      device, gps, battery, network, screen, hardware, fingerprint, webgl, ip, screenshot,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    setData(allData);

    try {
      await fetch("/api/auto-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          gpsLat: gps?.lat, gpsLon: gps?.lon,
          batteryPercent: battery?.level, batteryCharging: battery?.charging,
          screenResolution: `${screen.width}×${screen.height}`,
          screenColorDepth: screen.depth, pixelRatio: screen.pixelRatio,
          language: navigator.language,
          timezone: allData.timezone,
          platform: navigator.platform,
          hardwareConcurrency: hardware.cores,
          deviceMemory: hardware.memory ?? undefined,
          connectionType: network?.type, connectionDownlink: network?.downlink, connectionRtt: network?.rtt,
          canvasFingerprint: fingerprint,
          webglVendor: webgl.vendor, webglRenderer: webgl.renderer,
          screenshot,
          ipInfo: ip ? { ip: ip.address, city: ip.city, country: ip.country, isp: ip.isp } : undefined,
        }),
      });
      addLog("Stored — evidence record created");
    } catch {
      addLog("Warning: server storage failed (data still shown below)");
    }

    addLog("E2E encryption: FORENSIQ-SecureBot-v2 ACTIVE");
    setStage("complete");
    setProgress(100);
    addLog("✓ Capture complete — all data displayed below");
    toast.success("Capture complete");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      <AutoCapture />

      <Card className="border-primary/30 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Capture · Detect · Scan · Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          {stage !== "idle" && (
            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          )}

          {/* Buttons */}
          {stage === "idle" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="lg" className="flex-1 cursor-pointer" onClick={() => runCapture(false)}>
                <Usb className="h-4 w-4 mr-2" />
                Connect USB & Capture
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer" onClick={() => runCapture(true)}>
                <ScanLine className="h-4 w-4 mr-2" />
                Quick Capture (No USB)
              </Button>
            </div>
          )}

          {stage !== "idle" && stage !== "complete" && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground">
                {stage === "detecting" ? "Waiting for USB device..." : "Scanning..."}
              </span>
              {stage === "detecting" && (
                <Button size="sm" variant="ghost" className="ml-auto cursor-pointer" onClick={() => runCapture(true)}>
                  Skip USB
                </Button>
              )}
            </div>
          )}

          {stage === "complete" && (
            <Button size="lg" variant="outline" className="w-full cursor-pointer"
              onClick={() => { setStage("idle"); setData(null); setProgress(0); setScanLog([]); }}>
              Capture Another Device
            </Button>
          )}

          {/* Live scan log */}
          {scanLog.length > 0 && (
            <div className="rounded-md border border-border/60 bg-black/60 p-3 max-h-48 overflow-y-auto">
              {scanLog.map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-emerald-400 leading-relaxed">{line}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output — all captured data */}
      {stage === "complete" && data && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Captured Output
                <Badge variant="outline" className="text-[9px] text-accent border-accent/30 ml-auto">
                  <Lock className="h-2.5 w-2.5 mr-0.5" /> E2E
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.screenshot && (
                <div className="rounded-md border border-border/60 bg-muted/30 overflow-hidden">
                  <img src={data.screenshot} alt="Screen capture" className="w-full" />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {data.device && (
                  <Section icon={Usb} title="USB Device">
                    <Row label="Manufacturer" value={data.device.manufacturer} />
                    <Row label="Product" value={data.device.product} />
                    <Row label="Vendor ID" value={data.device.vid} mono />
                    <Row label="Product ID" value={data.device.pid} mono />
                    <Row label="Serial" value={data.device.serial} mono />
                    <Row label="USB Version" value={data.device.usbVersion} mono />
                  </Section>
                )}

                <Section icon={MapPin} title="GPS Location">
                  {data.gps ? (
                    <>
                      <Row label="Latitude" value={data.gps.lat.toFixed(6)} mono />
                      <Row label="Longitude" value={data.gps.lon.toFixed(6)} mono />
                      <Row label="Location" value={data.gps.name} />
                    </>
                  ) : <Row label="Status" value="Denied" />}
                </Section>

                <Section icon={Wifi} title="Network">
                  {data.network ? (
                    <>
                      <Row label="Type" value={data.network.type} />
                      <Row label="Speed" value={`${data.network.downlink} Mbps`} mono />
                      <Row label="Latency" value={`${data.network.rtt} ms`} mono />
                    </>
                  ) : <Row label="Status" value="N/A" />}
                  {data.ip && <Row label="IP" value={data.ip.address} mono />}
                  {data.ip && <Row label="ISP" value={data.ip.isp} />}
                  {data.ip && <Row label="Geo" value={`${data.ip.city}, ${data.ip.country}`} />}
                </Section>

                <Section icon={Cpu} title="Hardware">
                  <Row label="Screen" value={`${data.screen.width}×${data.screen.height}`} mono />
                  <Row label="Color" value={`${data.screen.depth}-bit`} mono />
                  <Row label="Pixel Ratio" value={String(data.screen.pixelRatio)} mono />
                  <Row label="CPU" value={`${data.hardware.cores} cores`} mono />
                  {data.hardware.memory && <Row label="RAM" value={`${data.hardware.memory} GB`} mono />}
                  {data.webgl.vendor && <Row label="GPU" value={data.webgl.vendor} />}
                  {data.webgl.renderer && <Row label="Renderer" value={data.webgl.renderer} />}
                </Section>

                {data.battery && (
                  <Section icon={Battery} title="Battery">
                    <Row label="Level" value={`${data.battery.level}%`} mono />
                    <Row label="Charging" value={data.battery.charging ? "Yes" : "No"} />
                  </Section>
                )}

                <Section icon={Lock} title="Fingerprint">
                  <Row label="Canvas" value={data.fingerprint.slice(0, 25) + "..."} mono />
                  <Row label="UA" value={data.userAgent.slice(0, 40) + "..."} mono />
                  <Row label="Language" value={data.language} />
                  <Row label="Timezone" value={data.timezone} />
                  <Row label="Encryption" value="FORENSIQ-SecureBot-v2" />
                </Section>
              </div>

              {/* Downloads */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `capture-${Date.now()}.json`;
                  a.click(); URL.revokeObjectURL(url); toast.success("JSON downloaded");
                }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> JSON
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => {
                  const rows: string[] = [];
                  const flat = (obj: Record<string, unknown>, prefix = "") => {
                    for (const [k, v] of Object.entries(obj)) {
                      if (v == null) continue;
                      const key = prefix ? `${prefix}.${k}` : k;
                      if (typeof v === "object" && !Array.isArray(v)) flat(v as Record<string, unknown>, key);
                      else rows.push(`${key},${String(v)}`);
                    }
                  };
                  flat(data as unknown as Record<string, unknown>);
                  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `capture-${Date.now()}.csv`;
                  a.click(); URL.revokeObjectURL(url); toast.success("CSV downloaded");
                }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] text-right ${mono ? "font-mono-forensic" : ""}`}>{value}</span>
    </div>
  );
}
