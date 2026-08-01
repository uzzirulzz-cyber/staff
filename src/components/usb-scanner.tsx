"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Usb, ScanLine, MapPin, CheckCircle2, Smartphone } from "lucide-react";

interface USBDeviceData {
  vendorId: number;
  productId: number;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
  usbVersion?: string;
  deviceClass?: number;
  deviceProtocol?: number;
  configurations?: number;
  interfaces?: number;
}

interface ScanResult {
  deviceId: string;
  evidenceBagId: string;
  vendorId: number;
  productId: number;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
}

export function USBScanner() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<USBDeviceData[]>([]);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [gps, setGps] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const hasWebUSB = typeof navigator !== "undefined" && "usb" in navigator;

  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    setResults([]);

    try {
      // 1. Request USB device via WebUSB API
      // @ts-expect-error - WebUSB types not in standard TS lib
      const nav = navigator as Navigator & { usb?: { requestDevice: (opts: { filters: unknown[] }) => Promise<USBDevice> } };
      if (!nav.usb) {
        toast.error("WebUSB not supported", {
          description: "Use Chrome or Edge on desktop. Connect your phone via USB cable first.",
        });
        setScanning(false);
        return;
      }

      // Request any USB device (empty filter = show all)
      const device = await nav.usb.requestDevice({ filters: [{}] });

      // Try to open the device and read descriptors
      const usbData: USBDeviceData = {
        vendorId: device.vendorId,
        productId: device.productId,
        manufacturerName: device.manufacturerName || undefined,
        productName: device.productName || undefined,
        serialNumber: device.serialNumber || undefined,
        usbVersion: `${device.usbVersionMajor}.${device.usbVersionMinor}.${device.usbVersionSubminor}`,
        deviceClass: device.deviceClass,
        configurations: device.configurations?.length,
        interfaces: device.configurations?.reduce((acc, c) => acc + (c.interfaces?.length ?? 0), 0),
      };

      setDevices([usbData]);
      toast.success(`USB device detected: ${usbData.manufacturerName ?? "Unknown"} ${usbData.productName ?? ""}`, {
        description: `VID: 0x${usbData.vendorId.toString(16).padStart(4, "0")} · PID: 0x${usbData.productId.toString(16).padStart(4, "0")}${usbData.serialNumber ? ` · S/N: ${usbData.serialNumber}` : ""}`,
      });

      // 2. Get GPS location
      let gpsLat: number | undefined;
      let gpsLon: number | undefined;
      let gpsName: string | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          });
        });
        gpsLat = pos.coords.latitude;
        gpsLon = pos.coords.longitude;
        // Reverse geocode
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${gpsLat}&lon=${gpsLon}`);
          if (res.ok) {
            const geo = await res.json();
            gpsName = geo.locationName;
          }
        } catch {}
        setGps({ lat: gpsLat!, lon: gpsLon!, name: gpsName ?? "Unknown" });
      } catch {
        // GPS denied — continue without it
      }

      // 3. Send to server
      const res = await fetch("/api/usb-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devices: [usbData],
          gpsLat,
          gpsLon,
          gpsLocationName: gpsName,
        }),
      });

      if (!res.ok) throw new Error("USB scan failed");
      const data = await res.json();

      if (data.scanned) {
        setResults(data.devices);
        toast.success("USB scan complete", {
          description: data.message,
          duration: 8000,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("No device selected") || msg.includes("NotFound")) {
        toast.error("No USB device selected", {
          description: "Connect your phone via USB cable and try again. Make sure to approve the USB connection on your phone.",
        });
      } else {
        toast.error("USB scan failed", { description: msg });
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="border-primary/30 ring-1 ring-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Usb className="h-4 w-4 text-primary" />
            USB Device Scanner
          </CardTitle>
          <Badge variant="outline" className={hasWebUSB ? "text-[9px] text-emerald-400 border-emerald-500/30" : "text-[9px] text-destructive border-destructive/30"}>
            {hasWebUSB ? "WebUSB Ready" : "WebUSB Not Available"}
          </Badge>
        </div>
        <CardDescription>
          Connect a phone via USB cable and scan for real hardware identifiers. Captures vendor ID, product ID, serial number, and GPS location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan button */}
        <Button
          className="w-full cursor-pointer"
          size="lg"
          disabled={scanning || !hasWebUSB}
          onClick={handleScan}
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning USB…
            </>
          ) : (
            <>
              <ScanLine className="h-4 w-4 mr-2" />
              Scan USB Device
            </>
          )}
        </Button>

        {!hasWebUSB && (
          <div className="text-[10px] text-muted-foreground text-center p-2 rounded-md bg-muted/30">
            WebUSB requires Chrome or Edge on desktop. Connect your phone via USB, then click scan.
            On your phone, allow USB access when prompted.
          </div>
        )}

        {/* Detected device */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground">
              Detected USB Device
            </div>
            {devices.map((d, i) => (
              <div key={i} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">{d.manufacturerName ?? "Unknown"} {d.productName ?? ""}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-forensic">
                  <div><span className="text-muted-foreground">Vendor ID:</span> 0x{d.vendorId.toString(16).padStart(4, "0")}</div>
                  <div><span className="text-muted-foreground">Product ID:</span> 0x{d.productId.toString(16).padStart(4, "0")}</div>
                  {d.serialNumber && <div className="col-span-2"><span className="text-muted-foreground">Serial:</span> {d.serialNumber}</div>}
                  {d.usbVersion && <div><span className="text-muted-foreground">USB:</span> {d.usbVersion}</div>}
                  {d.configurations != null && <div><span className="text-muted-foreground">Configs:</span> {d.configurations}</div>}
                  {d.interfaces != null && <div><span className="text-muted-foreground">Interfaces:</span> {d.interfaces}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GPS */}
        {gps && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-[10px] space-y-0.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="font-mono-forensic text-foreground">
                {gps.lat.toFixed(6)}, {gps.lon.toFixed(6)}
              </span>
            </div>
            <div className="pl-4.5 text-muted-foreground">{gps.name}</div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-emerald-400">
              Scan Complete — Real Data Captured
            </div>
            {results.map((r, i) => (
              <div key={i} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[10px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="font-medium text-emerald-400">Captured</span>
                </div>
                <div className="font-mono-forensic space-y-0.5">
                  <div><span className="text-muted-foreground">Evidence Bag:</span> {r.evidenceBagId}</div>
                  <div><span className="text-muted-foreground">Device:</span> {r.manufacturerName ?? "Unknown"} {r.productName ?? ""}</div>
                  {r.serialNumber && <div><span className="text-muted-foreground">Serial:</span> {r.serialNumber}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
