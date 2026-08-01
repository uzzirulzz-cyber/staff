"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BookOpen,
  Cable,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Cpu,
  Database,
  FileArchive,
  FileText,
  Fingerprint,
  FolderTree,
  HardDrive,
  Hash,
  KeyRound,
  Laptop,
  Loader2,
  type LucideIcon,
  MemoryStick,
  CardSim,
  MoreVertical,
  Network,
  Pencil,
  Plus,
  ScanLine,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Trash2,
  TriangleAlert,
  Usb,
  Wifi,
  Wrench,
  Zap,
  MapPin,
  Radio,
  Bot,
} from "lucide-react";

import {
  useCompleteAcquisition,
  useCreateAcquisition,
  useCreateDevice,
  useDeleteDevice,
  useDevices,
  useUpdateDevice,
  useVerifyAcquisition,
  useDeviceMonitor,
  useTriggerMonitor,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type {
  ApiAcquisition,
  ApiDevice,
  AcquisitionMethod,
  AcquisitionStatus,
  ConnectionMethod,
  ConnectionStatus,
  OS,
} from "@/lib/types";
import {
  cn,
  formatDateTime,
  formatRelative,
  generateHashSync,
} from "@/lib/utils";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ============================================================================
 * Static metadata for OS / connection / acquisition methods
 * ========================================================================== */

interface OsMeta {
  label: string;
  icon: LucideIcon;
  color: string; // text color
  bg: string; // bg tint
  ring: string; // ring color
}

const OS_META: Record<OS, OsMeta> = {
  ios: {
    label: "iOS",
    icon: Apple,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
  },
  android: {
    label: "Android",
    icon: Smartphone,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
  },
  windows: {
    label: "Windows",
    icon: Laptop,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/30",
  },
  macos: {
    label: "macOS",
    icon: Laptop,
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    ring: "ring-zinc-500/30",
  },
  linux: {
    label: "Linux",
    icon: Terminal,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
  },
  other: {
    label: "Other",
    icon: Cpu,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/30",
  },
};

interface ConnectionMethodMeta {
  label: string;
  icon: LucideIcon;
  desc: string;
  color: string;
  bg: string;
  ring: string;
}

const CONNECTION_METHOD_META: Record<ConnectionMethod, ConnectionMethodMeta> = {
  usb: {
    label: "USB",
    icon: Usb,
    desc: "Direct USB cable connection to the device. Fastest transfer; requires write-blocker for source devices.",
    color: "text-primary",
    bg: "bg-primary/10",
    ring: "ring-primary/30",
  },
  wifi: {
    label: "Wi-Fi",
    icon: Wifi,
    desc: "Wireless network acquisition. Useful when physical ports are unavailable or device is locked to dock.",
    color: "text-accent",
    bg: "bg-accent/10",
    ring: "ring-accent/30",
  },
  backup_file: {
    label: "Backup File",
    icon: FileArchive,
    desc: "Import an existing backup archive (iTunes backup, ADB backup, etc.) previously extracted from the device.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
  },
  sd_card: {
    label: "SD Card",
    icon: CardSim,
    desc: "Acquire removable storage media directly via a forensic card reader with hardware write-block.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/30",
  },
  forensic_image: {
    label: "Forensic Image",
    icon: HardDrive,
    desc: "Bit-for-bit physical image of raw storage. Most comprehensive; requires device-specific tooling.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
  },
};

interface AcquisitionMethodMeta {
  label: string;
  icon: LucideIcon;
  desc: string;
  dataTypes: string[];
  color: string;
  bg: string;
  ring: string;
}

const ACQUISITION_METHOD_META: Record<AcquisitionMethod, AcquisitionMethodMeta> = {
  logical: {
    label: "Logical",
    icon: FileText,
    desc: "Extracts active files accessible through the OS API. Fast, non-invasive, preserves metadata.",
    dataTypes: ["Contacts", "SMS / MMS", "Call logs", "Calendars", "Notes", "App data (active)"],
    color: "text-primary",
    bg: "bg-primary/10",
    ring: "ring-primary/30",
  },
  file_system: {
    label: "File System",
    icon: FolderTree,
    desc: "Full file system extraction including protected and hidden partitions. Recovers database files.",
    dataTypes: ["All active files", "SQLite databases", "Plists", "Hidden partitions", "App containers"],
    color: "text-accent",
    bg: "bg-accent/10",
    ring: "ring-accent/30",
  },
  physical: {
    label: "Physical",
    icon: HardDrive,
    desc: "Bit-by-bit image of raw storage. Most comprehensive — recovers deleted and orphaned data.",
    dataTypes: ["Deleted files", "Orphaned data", "Slack space", "Raw partitions", "Carvable artifacts"],
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
  },
  cloud: {
    label: "Cloud",
    icon: Cloud,
    desc: "Pull data from cloud accounts associated with the device (iCloud, Google, Microsoft).",
    dataTypes: ["Cloud backups", "Synced photos", "Cloud messages", "Account metadata", "Drive files"],
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
  },
  manual: {
    label: "Manual",
    icon: Wrench,
    desc: "Investigator-directed manual extraction. Screenshots, exports, on-device observations.",
    dataTypes: ["Screenshots", "Manual exports", "On-device UI observations", "Witness annotations"],
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
  },
};

/* ============================================================================
 * Connection status visual mapping
 * ========================================================================== */

interface StatusMeta {
  label: string;
  color: string; // text color
  bg: string; // bg tint
  dot: string; // bg solid color for dot
  bar: string; // top strip bg solid
}

const STATUS_META: Record<ConnectionStatus, StatusMeta> = {
  acquired: {
    label: "Acquired",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  connected: {
    label: "Connected",
    color: "text-primary",
    bg: "bg-primary/10",
    dot: "bg-primary",
    bar: "bg-primary",
  },
  monitoring: {
    label: "Monitoring",
    color: "text-accent",
    bg: "bg-accent/10",
    dot: "bg-accent",
    bar: "bg-accent",
  },
  disconnected: {
    label: "Disconnected",
    color: "text-muted-foreground",
    bg: "bg-muted",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground/50",
  },
};

/* ============================================================================
 * Acquisition status visual mapping
 * ========================================================================== */

interface AcquisitionStatusMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
}

const ACQUISITION_STATUS_META: Record<AcquisitionStatus, AcquisitionStatusMeta> = {
  pending: { label: "Pending", color: "text-muted-foreground", bg: "bg-muted/40", border: "border-border/60" },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  complete: { label: "Complete", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  verified: { label: "Verified", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  failed: { label: "Failed", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

/* ============================================================================
 * Hash validation
 * ========================================================================== */

const HEX_64 = /^[0-9a-fA-F]{64}$/;
const HEX_128 = /^[0-9a-fA-F]{128}$/;

/* ============================================================================
 * Small reusable presentational helpers
 * ========================================================================== */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle: string;
  accent: "primary" | "emerald" | "accent" | "amber";
}) {
  const accentMap = {
    primary: "text-primary bg-primary/10 ring-primary/20",
    emerald: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20",
    accent: "text-accent bg-accent/10 ring-accent/20",
    amber: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
  };
  return (
    <Card className="bg-card border-border/60 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums leading-none">{value}</div>
            <div className="mt-1.5 text-[11px] text-muted-foreground truncate">{subtitle}</div>
          </div>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1", accentMap[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BatteryIcon({ percent }: { percent: number | null }) {
  if (percent == null) return null;
  const Icon =
    percent >= 80 ? BatteryFull : percent >= 50 ? BatteryMedium : percent >= 20 ? BatteryLow : Battery;
  const color =
    percent >= 50 ? "text-emerald-500" : percent >= 20 ? "text-amber-400" : "text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", color)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{percent}%</span>
    </span>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              toast.success(`${label} copied`);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.error("Clipboard unavailable");
            }
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Hash className="h-3 w-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "Copied" : `Copy ${label}`}</TooltipContent>
    </Tooltip>
  );
}

/* ============================================================================
 * Acquisition Guide Panel — toggle reference
 * ========================================================================== */

function AcquisitionGuidePanel() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            Acquisition & Connection Reference
          </CardTitle>
          <CardDescription className="text-xs">
            A quick forensic reference for choosing the right acquisition and connection method.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid lg:grid-cols-2 gap-4 pt-0">
          {/* Acquisition methods */}
          <div>
            <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground mb-2">
              Acquisition Methods
            </div>
            <div className="space-y-2">
              {(Object.keys(ACQUISITION_METHOD_META) as AcquisitionMethod[]).map((key) => {
                const m = ACQUISITION_METHOD_META[key];
                return (
                  <div
                    key={key}
                    className={cn("rounded-md border p-2.5", m.bg, m.ring.replace("ring-", "border-"))}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className={cn("h-4 w-4 shrink-0", m.color)} />
                      <span className="text-xs font-semibold">{m.label}</span>
                      <Badge variant="outline" className="ml-auto text-[9px] font-mono-forensic py-0">
                        {key}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{m.desc}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.dataTypes.map((d) => (
                        <span
                          key={d}
                          className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection methods */}
          <div>
            <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground mb-2">
              Connection Methods
            </div>
            <div className="space-y-2">
              {(Object.keys(CONNECTION_METHOD_META) as ConnectionMethod[]).map((key) => {
                const m = CONNECTION_METHOD_META[key];
                return (
                  <div
                    key={key}
                    className={cn("rounded-md border border-border/60 p-2.5", m.bg)}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className={cn("h-4 w-4 shrink-0", m.color)} />
                      <span className="text-xs font-semibold">{m.label}</span>
                      <Badge variant="outline" className="ml-auto text-[9px] font-mono-forensic py-0">
                        {key}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================================
 * 3-Step Add Device Wizard Dialog
 * ========================================================================== */

interface AddDeviceFormState {
  name: string;
  make: string;
  model: string;
  os: OS;
  osVersion: string;
  serialNumber: string;
  imei: string;
  storageGB: string;
  batteryPercent: string;
  connectionMethod: ConnectionMethod;
  legalAuthorized: boolean;
  notes: string;
}

const EMPTY_FORM: AddDeviceFormState = {
  name: "",
  make: "",
  model: "",
  os: "android",
  osVersion: "",
  serialNumber: "",
  imei: "",
  storageGB: "",
  batteryPercent: "",
  connectionMethod: "usb",
  legalAuthorized: false,
  notes: "",
};

function AddDeviceWizard({
  open,
  onOpenChange,
  caseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<AddDeviceFormState>(EMPTY_FORM);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const createDevice = useCreateDevice();

  const reset = () => {
    setStep(1);
    setForm(EMPTY_FORM);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      // Delay reset so exit animation plays
      setTimeout(reset, 200);
    }
    onOpenChange(v);
  };

  const update = <K extends keyof AddDeviceFormState>(k: K, v: AddDeviceFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-detect connected device — simulates USB/forensic tool detection
  // and auto-fills the device information form
  const handleAutoDetect = () => {
    setAutoDetecting(true);
    toast.info("Scanning connected device…");
    setTimeout(() => {
      const devices = [
        { make: "Apple", model: "iPhone 15 Pro", os: "ios" as OS, osVersion: "17.4.1", serial: "F2LX" + Math.random().toString(36).slice(2, 10).toUpperCase(), imei: String(Math.floor(Math.random() * 9e14) + 1e15), storage: 256, battery: Math.floor(Math.random() * 40 + 60) },
        { make: "Apple", model: "iPhone 14", os: "ios" as OS, osVersion: "17.2", serial: "DMPW" + Math.random().toString(36).slice(2, 10).toUpperCase(), imei: String(Math.floor(Math.random() * 9e14) + 1e15), storage: 128, battery: Math.floor(Math.random() * 40 + 50) },
        { make: "Samsung", model: "Galaxy S24 Ultra", os: "android" as OS, osVersion: "14.0", serial: "RZ8M" + Math.random().toString(36).slice(2, 10).toUpperCase(), imei: String(Math.floor(Math.random() * 9e14) + 1e15), storage: 512, battery: Math.floor(Math.random() * 40 + 55) },
        { make: "Google", model: "Pixel 8 Pro", os: "android" as OS, osVersion: "14.0", serial: "Q3AS" + Math.random().toString(36).slice(2, 10).toUpperCase(), imei: String(Math.floor(Math.random() * 9e14) + 1e15), storage: 128, battery: Math.floor(Math.random() * 40 + 45) },
        { make: "Samsung", model: "Galaxy A54", os: "android" as OS, osVersion: "13.0", serial: "SM-A546" + Math.floor(Math.random() * 1000), imei: String(Math.floor(Math.random() * 9e14) + 1e15), storage: 128, battery: Math.floor(Math.random() * 40 + 50) },
      ];
      const detected = devices[Math.floor(Math.random() * devices.length)];
      setForm((f) => ({
        ...f,
        name: `${detected.make} ${detected.model} — seized ${new Date().toISOString().slice(0, 10)}`,
        make: detected.make,
        model: detected.model,
        os: detected.os,
        osVersion: detected.osVersion,
        serialNumber: detected.serial,
        imei: detected.imei,
        storageGB: String(detected.storage),
        batteryPercent: String(detected.battery),
      }));
      setAutoDetecting(false);
      toast.success(`Detected: ${detected.make} ${detected.model}`, {
        description: `OS: ${detected.os.toUpperCase()} ${detected.osVersion} · ${detected.storage}GB · Battery ${detected.battery}%`,
      });
    }, 1500);
  };

  const step1Valid = form.name.trim() && form.make.trim() && form.model.trim();
  const step3Valid = form.legalAuthorized;

  const handleActivate = async () => {
    if (!step3Valid) {
      toast.error("Legal authorization is required");
      return;
    }
    try {
      await createDevice.mutateAsync({
        caseId,
        name: form.name.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        os: form.os,
        osVersion: form.osVersion.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        imei: form.imei.trim() || undefined,
        storageGB: form.storageGB ? Number(form.storageGB) : undefined,
        batteryPercent: form.batteryPercent ? Number(form.batteryPercent) : undefined,
        connectionMethod: form.connectionMethod,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Device activated and connected", {
        description: `${form.make} ${form.model} added to evidence inventory`,
      });
      handleClose(false);
    } catch (e) {
      toast.error("Failed to activate device", { description: (e as Error).message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            Add Device — Acquisition Setup
          </DialogTitle>
          <DialogDescription>
            Three-step forensic workflow: identify, connect, and authorize.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {[
            { n: 1, label: "Device Info" },
            { n: 2, label: "Connection" },
            { n: 3, label: "Authorization" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-1 transition-colors",
                    step === s.n
                      ? "bg-primary text-primary-foreground ring-primary"
                      : step > s.n
                      ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/40"
                      : "bg-muted text-muted-foreground ring-border"
                  )}
                >
                  {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    step >= s.n ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={cn("h-px flex-1", step > s.n ? "bg-emerald-500/40" : "bg-border")} />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content with animation */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Auto-Detect Device — auto-fills all fields when device is connected */}
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1.5">
                      <Usb className="h-3.5 w-3.5 text-primary" />
                      Auto-Detect Connected Device
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Click to scan the connected device and auto-fill its information.
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer shrink-0"
                    disabled={autoDetecting}
                    onClick={handleAutoDetect}
                  >
                    {autoDetecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Detecting…
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Auto-Detect
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="d-name" className="text-xs">Device name *</Label>
                    <Input
                      id="d-name"
                      placeholder="Suspect iPhone 13 — seized 2026-01-12"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-make" className="text-xs">Make *</Label>
                    <Input
                      id="d-make"
                      placeholder="Apple"
                      value={form.make}
                      onChange={(e) => update("make", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-model" className="text-xs">Model *</Label>
                    <Input
                      id="d-model"
                      placeholder="iPhone 13 Pro"
                      value={form.model}
                      onChange={(e) => update("model", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Operating system *</Label>
                    <Select value={form.os} onValueChange={(v) => update("os", v as OS)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(OS_META) as OS[]).map((k) => {
                          const m = OS_META[k];
                          return (
                            <SelectItem key={k} value={k}>
                              <span className="flex items-center gap-2">
                                <m.icon className={cn("h-3.5 w-3.5", m.color)} />
                                {m.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-osver" className="text-xs">OS version</Label>
                    <Input
                      id="d-osver"
                      placeholder="17.4.1"
                      value={form.osVersion}
                      onChange={(e) => update("osVersion", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-serial" className="text-xs">Serial number</Label>
                    <Input
                      id="d-serial"
                      className="font-mono-forensic text-xs"
                      placeholder="F2LX1234ABCDEFG"
                      value={form.serialNumber}
                      onChange={(e) => update("serialNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-imei" className="text-xs">IMEI</Label>
                    <Input
                      id="d-imei"
                      className="font-mono-forensic text-xs"
                      placeholder="353918105123456"
                      value={form.imei}
                      onChange={(e) => update("imei", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-storage" className="text-xs">Storage (GB)</Label>
                    <Input
                      id="d-storage"
                      type="number"
                      placeholder="128"
                      value={form.storageGB}
                      onChange={(e) => update("storageGB", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-battery" className="text-xs">Battery %</Label>
                    <Input
                      id="d-battery"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="82"
                      value={form.batteryPercent}
                      onChange={(e) => update("batteryPercent", e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="text-xs text-muted-foreground">
                  Choose how the device will be connected to the forensic workstation for acquisition.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CONNECTION_METHOD_META) as ConnectionMethod[]).map((key) => {
                    const m = CONNECTION_METHOD_META[key];
                    const selected = form.connectionMethod === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update("connectionMethod", key)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-md border p-3 text-left transition-all cursor-pointer",
                          selected
                            ? cn(m.bg, "ring-1", m.ring, "border-transparent")
                            : "border-border/60 hover:border-border bg-card hover:bg-muted/40"
                        )}
                      >
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", m.bg)}>
                          <m.icon className={cn("h-4 w-4", m.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{m.label}</span>
                            {selected && <Check className="h-3 w-3 text-emerald-500" />}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {m.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Summary card */}
                <Card className="bg-muted/30 border-border/60">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Device summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 text-xs">
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 font-mono-forensic">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Name</span>
                        <span className="truncate text-right">{form.name || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Make / Model</span>
                        <span className="truncate text-right">{form.make} {form.model}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">OS</span>
                        <span>{OS_META[form.os].label} {form.osVersion}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Connection</span>
                        <span>{CONNECTION_METHOD_META[form.connectionMethod].label}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Storage</span>
                        <span>{form.storageGB ? `${form.storageGB} GB` : "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Battery</span>
                        <span>{form.batteryPercent ? `${form.batteryPercent}%` : "—"}</span>
                      </div>
                      {form.serialNumber && (
                        <div className="flex justify-between gap-2 col-span-2">
                          <span className="text-muted-foreground">Serial #</span>
                          <span className="truncate">{form.serialNumber}</span>
                        </div>
                      )}
                      {form.imei && (
                        <div className="flex justify-between gap-2 col-span-2">
                          <span className="text-muted-foreground">IMEI</span>
                          <span className="truncate">{form.imei}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Legal authorization */}
                <div className="rounded-md border border-border/60 p-3 space-y-2.5">
                  <Label htmlFor="legal-auth" className="text-xs flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      id="legal-auth"
                      checked={form.legalAuthorized}
                      onCheckedChange={(v) => update("legalAuthorized", v === true)}
                      className="mt-0.5"
                    />
                    <span className="leading-relaxed">
                      I confirm I have <span className="text-primary font-medium">legal authorization</span> to
                      acquire data from this device — including a valid warrant, consent, or exigent-circumstance
                      documentation on file for this case.
                    </span>
                  </Label>
                  <Separator />
                  <div className="space-y-1.5">
                    <Label htmlFor="d-notes" className="text-xs">Acquisition notes (optional)</Label>
                    <Textarea
                      id="d-notes"
                      placeholder="Reference warrant #, consent form, seizing officer, etc."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      rows={3}
                      className="resize-none text-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 1 ? handleClose(false) : setStep((s) => (s - 1) as 1 | 2 | 3))}
            disabled={createDevice.isPending}
            className="cursor-pointer"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              disabled={(step === 1 && !step1Valid) as boolean}
              className="cursor-pointer"
            >
              Continue
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={!step3Valid || createDevice.isPending}
              className="cursor-pointer"
            >
              {createDevice.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              )}
              {createDevice.isPending ? "Activating…" : "Activate Device"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Acquisition Dialog — choose method & start
 * ========================================================================== */

function AcquisitionDialog({
  device,
  open,
  onOpenChange,
  onStarted,
}: {
  device: ApiDevice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStarted: (acq: ApiAcquisition) => void;
}) {
  const [method, setMethod] = useState<AcquisitionMethod>("logical");
  const [notes, setNotes] = useState("");
  const createAcq = useCreateAcquisition();

  const reset = () => {
    setMethod("logical");
    setNotes("");
  };

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(reset, 200);
    onOpenChange(v);
  };

  const handleStart = async () => {
    if (!device) return;
    try {
      const acq = await createAcq.mutateAsync({
        deviceId: device.id,
        caseId: device.caseId,
        method,
        notes: notes.trim() || undefined,
      });
      toast.success("Acquisition started", {
        description: `${ACQUISITION_METHOD_META[method].label} acquisition is now in progress`,
      });
      handleClose(false);
      onStarted(acq);
    } catch (e) {
      toast.error("Failed to start acquisition", { description: (e as Error).message });
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            Acquire — {device.name}
          </DialogTitle>
          <DialogDescription>
            Select an acquisition method. A new in-progress acquisition will be opened and chain-of-custody
            recorded.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(ACQUISITION_METHOD_META) as AcquisitionMethod[]).map((key) => {
            const m = ACQUISITION_METHOD_META[key];
            const selected = method === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMethod(key)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border p-3 text-left transition-all cursor-pointer",
                  selected
                    ? cn(m.bg, "ring-1", m.ring, "border-transparent")
                    : "border-border/60 hover:border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <m.icon className={cn("h-4 w-4 shrink-0", m.color)} />
                  <span className="text-xs font-semibold">{m.label}</span>
                  {selected && <Check className="ml-auto h-3 w-3 text-emerald-500" />}
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {m.dataTypes.slice(0, 4).map((d) => (
                    <span
                      key={d}
                      className="rounded bg-background/60 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                    >
                      {d}
                    </span>
                  ))}
                  {m.dataTypes.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">+{m.dataTypes.length - 4}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="acq-notes" className="text-xs">Acquisition notes</Label>
          <Textarea
            id="acq-notes"
            placeholder="Tool used, investigator initials, environmental notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleClose(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleStart}
            disabled={createAcq.isPending}
            className="cursor-pointer"
          >
            {createAcq.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="mr-1 h-3.5 w-3.5" />
            )}
            {createAcq.isPending ? "Starting…" : "Start Acquisition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Complete & Hash Dialog — enter SHA-256/512, mark complete
 * ========================================================================== */

function CompleteHashDialog({
  acquisition,
  device,
  open,
  onOpenChange,
}: {
  acquisition: ApiAcquisition | null;
  device: ApiDevice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Lazy init from the acquisition prop. Parent remounts this component via
  // a `key` prop whenever the acquisition changes, so this runs fresh each time.
  const [sha256, setSha256] = useState(acquisition?.sha256 ?? "");
  const [sha512, setSha512] = useState(acquisition?.sha512 ?? "");
  const [dataSizeMB, setDataSizeMB] = useState(
    acquisition?.dataSizeMB != null ? String(acquisition.dataSizeMB) : ""
  );
  const completeAcq = useCompleteAcquisition();

  const handleClose = (v: boolean) => {
    onOpenChange(v);
  };

  const sha256Valid = HEX_64.test(sha256);
  const sha512Valid = sha512 === "" || HEX_128.test(sha512);
  const canSave = sha256Valid && sha512Valid && !!acquisition && !!device;

  const handleSave = async () => {
    if (!acquisition || !device) return;
    if (!sha256Valid) {
      toast.error("SHA-256 must be exactly 64 hex characters");
      return;
    }
    if (!sha512Valid) {
      toast.error("SHA-512 must be exactly 128 hex characters (or left empty)");
      return;
    }
    try {
      await completeAcq.mutateAsync({
        id: acquisition.id,
        caseId: device.caseId,
        deviceId: device.id,
        sha256: sha256.toLowerCase(),
        sha512: sha512 ? sha512.toLowerCase() : undefined,
        dataSizeMB: dataSizeMB ? Number(dataSizeMB) : undefined,
      });
      toast.success("Acquisition completed", {
        description: "Hash recorded. Device eligible for integrity verification.",
      });
      handleClose(false);
    } catch (e) {
      toast.error("Failed to complete acquisition", { description: (e as Error).message });
    }
  };

  if (!acquisition || !device) return null;

  const m = ACQUISITION_METHOD_META[acquisition.method];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-accent" />
            Complete & Hash Acquisition
          </DialogTitle>
          <DialogDescription>
            Record integrity hashes for the {m.label.toLowerCase()} acquisition of{" "}
            <span className="font-medium text-foreground">{device.name}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Acquisition context */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 font-mono-forensic">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <m.icon className={cn("h-3.5 w-3.5", m.color)} />
              {m.label}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono-forensic py-0">
              {acquisition.status}
            </Badge>
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground font-mono-forensic truncate">
            ACQ-ID: {acquisition.id}
          </div>
        </div>

        {/* SHA-256 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="sha256" className="text-xs flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              SHA-256 hash <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-mono-forensic tabular-nums",
                  sha256.length === 64 ? "text-emerald-500" : "text-muted-foreground"
                )}
              >
                {sha256.length}/64
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] cursor-pointer"
                onClick={() => setSha256(generateHashSync(64))}
              >
                <Hash className="mr-1 h-3 w-3" />
                Generate hash
              </Button>
            </div>
          </div>
          <Textarea
            id="sha256"
            className={cn(
              "font-mono-forensic text-[11px] leading-relaxed resize-none",
              sha256 && !sha256Valid && "border-destructive focus-visible:ring-destructive"
            )}
            placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
            value={sha256}
            onChange={(e) => setSha256(e.target.value)}
            rows={3}
          />
          {sha256 && !sha256Valid && (
            <div className="text-[10px] text-destructive flex items-center gap-1">
              <TriangleAlert className="h-3 w-3" />
              Must be exactly 64 hexadecimal characters (0-9, a-f).
            </div>
          )}
        </div>

        {/* SHA-512 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="sha512" className="text-xs flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              SHA-512 hash <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-mono-forensic tabular-nums",
                  sha512.length === 128 ? "text-emerald-500" : "text-muted-foreground"
                )}
              >
                {sha512.length}/128
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] cursor-pointer"
                onClick={() => setSha512(generateHashSync(128))}
              >
                <Hash className="mr-1 h-3 w-3" />
                Generate hash
              </Button>
            </div>
          </div>
          <Textarea
            id="sha512"
            className={cn(
              "font-mono-forensic text-[11px] leading-relaxed resize-none",
              sha512 && !sha512Valid && "border-destructive focus-visible:ring-destructive"
            )}
            placeholder="128 hex characters — leave blank to skip"
            value={sha512}
            onChange={(e) => setSha512(e.target.value)}
            rows={4}
          />
          {sha512 && !sha512Valid && (
            <div className="text-[10px] text-destructive flex items-center gap-1">
              <TriangleAlert className="h-3 w-3" />
              Must be exactly 128 hexadecimal characters.
            </div>
          )}
        </div>

        {/* Data size */}
        <div className="space-y-1.5">
          <Label htmlFor="size" className="text-xs flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            Data size (MB)
          </Label>
          <Input
            id="size"
            type="number"
            min={0}
            placeholder="4096"
            value={dataSizeMB}
            onChange={(e) => setDataSizeMB(e.target.value)}
            className="font-mono-forensic text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleClose(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave || completeAcq.isPending}
            className="cursor-pointer"
          >
            {completeAcq.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            )}
            {completeAcq.isPending ? "Saving…" : "Complete & Save Hash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Edit Device Dialog
 * ========================================================================== */

function EditDeviceDialog({
  device,
  open,
  onOpenChange,
}: {
  device: ApiDevice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Lazy init from device prop. Parent remounts via `key` when device changes.
  const [status, setStatus] = useState<ConnectionStatus>(
    device?.connectionStatus ?? "connected"
  );
  const [method, setMethod] = useState<ConnectionMethod>(
    device?.connectionMethod ?? "usb"
  );
  const [notes, setNotes] = useState(device?.notes ?? "");
  const updateDevice = useUpdateDevice(device?.caseId ?? "");

  const handleSave = async () => {
    if (!device) return;
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        connectionStatus: status,
        connectionMethod: method,
        notes: notes.trim() || undefined,
      });
      toast.success("Device updated");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to update device", { description: (e as Error).message });
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Edit Device
          </DialogTitle>
          <DialogDescription className="truncate">{device.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Connection status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ConnectionStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as ConnectionStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[k].dot)} />
                      {STATUS_META[k].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Connection method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as ConnectionMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CONNECTION_METHOD_META) as ConnectionMethod[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {CONNECTION_METHOD_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="text-xs">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateDevice.isPending} className="cursor-pointer">
            {updateDevice.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Delete Device confirmation
 * ========================================================================== */

function DeleteDeviceDialog({
  device,
  open,
  onOpenChange,
}: {
  device: ApiDevice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deleteDevice = useDeleteDevice(device?.caseId ?? "");

  const handleDelete = async () => {
    if (!device) return;
    try {
      await deleteDevice.mutateAsync(device.id);
      toast.success("Device removed", { description: device.evidenceBagId ?? device.name });
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to delete device", { description: (e as Error).message });
    }
  };

  if (!device) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Remove device from case?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">{device.name}</span> and all related acquisitions
            and evidence items. This action is recorded in the audit log and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteDevice.isPending}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
          >
            {deleteDevice.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Delete Device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ============================================================================
 * Acquisition history row (inside device accordion)
 * ========================================================================== */

function AcquisitionHistoryRow({
  acq,
  advanceMode,
  onVerify,
  onResume,
}: {
  acq: ApiAcquisition;
  advanceMode: boolean;
  onVerify: () => void;
  onResume: () => void;
}) {
  const m = ACQUISITION_METHOD_META[acq.method];
  const s = ACQUISITION_STATUS_META[acq.status];
  const verified = acq.status === "verified" || acq.integrityVerifiedAt != null;
  const canVerify = acq.status === "complete" && !verified;
  const canResume = acq.status === "in_progress";

  const shortHash = acq.sha256 ? `${acq.sha256.slice(0, 12)}…${acq.sha256.slice(-8)}` : "—";

  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded", m.bg)}>
            <m.icon className={cn("h-3.5 w-3.5", m.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium">{m.label}</span>
              <Badge variant="outline" className={cn("text-[9px] py-0", s.color, s.bg, s.border)}>
                {s.label}
              </Badge>
              {verified && (
                <Badge variant="outline" className="text-[9px] py-0 text-emerald-500 bg-emerald-500/10 border-emerald-500/30">
                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5">
              {formatDateTime(acq.startedAt)}
              {acq.completedAt && <> → {formatDateTime(acq.completedAt)}</>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canResume && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-[10px] cursor-pointer" onClick={onResume}>
                  <ArrowRight className="mr-1 h-3 w-3" />
                  Complete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Complete & hash this acquisition</TooltipContent>
            </Tooltip>
          )}
          {canVerify && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] cursor-pointer text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={onVerify}
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verify
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run integrity verification</TooltipContent>
            </Tooltip>
          )}
          {verified && (
            <div className="flex h-7 items-center justify-center rounded-md bg-emerald-500/10 px-2 text-[10px] text-emerald-500 ring-1 ring-emerald-500/30">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Integrity verified
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono-forensic">
        <div>
          <div className="text-muted-foreground">Method</div>
          <div className="truncate">{acq.method}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Data size</div>
          <div className="truncate">{acq.dataSizeMB != null ? `${acq.dataSizeMB} MB` : "—"}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground flex items-center gap-1">
            SHA-256
            {acq.sha256 && <CopyButton value={acq.sha256} label="SHA-256" />}
          </div>
          <div className="truncate text-foreground/80">
            {advanceMode ? acq.sha256 ?? "—" : shortHash}
          </div>
        </div>
        {advanceMode && acq.sha512 && (
          <div className="col-span-2 sm:col-span-4">
            <div className="text-muted-foreground flex items-center gap-1">
              SHA-512
              <CopyButton value={acq.sha512} label="SHA-512" />
            </div>
            <div className="break-all text-foreground/80 text-[9px] leading-relaxed">{acq.sha512}</div>
          </div>
        )}
        {advanceMode && (
          <div className="col-span-2 sm:col-span-4">
            <div className="text-muted-foreground">Acquisition ID</div>
            <div className="truncate text-foreground/80">{acq.id}</div>
          </div>
        )}
        {acq.notes && (
          <div className="col-span-2 sm:col-span-4">
            <div className="text-muted-foreground">Notes</div>
            <div className="text-foreground/80 not-italic">{acq.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Device card
 * ========================================================================== */

function DeviceCard({
  device,
  advanceMode,
  onAcquire,
  onEdit,
  onDelete,
  onVerifyAcq,
  onResumeAcq,
}: {
  device: ApiDevice;
  advanceMode: boolean;
  onAcquire: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVerifyAcq: (acq: ApiAcquisition) => void;
  onResumeAcq: (acq: ApiAcquisition) => void;
}) {
  const os = OS_META[device.os];
  const cm = device.connectionMethod ? CONNECTION_METHOD_META[device.connectionMethod] : null;
  const st = STATUS_META[device.connectionStatus];
  const acqs = device.acquisitions ?? [];
  const count = device._count;

  const verifiedCount = acqs.filter((a) => a.status === "verified" || a.integrityVerifiedAt).length;

  return (
    <Card className="bg-card border-border/60 overflow-hidden flex flex-col">
      {/* Status strip */}
      <div className={cn("h-1 w-full", st.bar)} />

      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1", os.bg, os.ring)}>
            <os.icon className={cn("h-4 w-4", os.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{device.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {device.make} {device.model}
                  {device.osVersion && <span className="font-mono-forensic"> · {os.label} {device.osVersion}</span>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 cursor-pointer">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-[10px] font-mono-forensic text-muted-foreground">
                    Device actions
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={onAcquire}>
                    <Fingerprint className="mr-2 h-3.5 w-3.5" /> Acquire…
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={onEdit}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {device.evidenceBagId && (
                <Badge variant="outline" className="text-[9px] font-mono-forensic py-0">
                  {device.evidenceBagId}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-[9px] py-0", st.color, st.bg)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1", st.dot)} />
                {st.label}
              </Badge>
              {cm && (
                <Badge variant="outline" className="text-[9px] py-0">
                  <cm.icon className={cn("h-2.5 w-2.5 mr-0.5", cm.color)} />
                  {cm.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Storage</span>
            <span className="ml-auto font-mono-forensic">{device.storageGB ? `${device.storageGB} GB` : "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BatteryIcon percent={device.batteryPercent} />
            <span className="ml-auto text-muted-foreground">
              {device.batteryPercent == null && "—"}
            </span>
          </div>
          {advanceMode && (
            <>
              <div className="flex items-center gap-1.5 col-span-2">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Serial</span>
                <span className="ml-auto font-mono-forensic truncate">
                  {device.serialNumber ?? "—"}
                </span>
              </div>
              {device.imei && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Network className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">IMEI</span>
                  <span className="ml-auto font-mono-forensic truncate">{device.imei}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md bg-muted/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground font-mono-forensic uppercase">Acq</div>
            <div className="text-sm font-semibold tabular-nums">{count?.acquisitions ?? 0}</div>
          </div>
          <div className="rounded-md bg-muted/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground font-mono-forensic uppercase">Scans</div>
            <div className="text-sm font-semibold tabular-nums">{count?.scanSessions ?? 0}</div>
          </div>
          <div className="rounded-md bg-muted/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground font-mono-forensic uppercase">Evidence</div>
            <div className="text-sm font-semibold tabular-nums">{count?.evidenceItems ?? 0}</div>
          </div>
        </div>

        {/* Location + Monitoring + Encryption — captured on connect */}
        <div className="space-y-1.5 rounded-md border border-border/40 bg-muted/20 p-2.5">
          {/* GPS Location — lat/lon first, then location name below */}
          {device.gpsLat != null && device.gpsLon != null && (
            <div className="text-[10px] space-y-0.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="font-mono-forensic text-foreground">
                  {device.gpsLat.toFixed(6)}, {device.gpsLon.toFixed(6)}
                </span>
              </div>
              {device.gpsLocationName && (
                <div className="pl-4.5 text-muted-foreground">
                  {device.gpsLocationName}
                </div>
              )}
            </div>
          )}
          {/* Monitoring status */}
          {device.monitoringEnabled && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Radio className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Monitoring:</span>
              <span className="text-emerald-500 font-medium">Active</span>
              <span className="text-muted-foreground">
                · every {Math.floor((device.monitoringIntervalSec ?? 300) / 60)}min
              </span>
              {device.lastMonitoredAt && (
                <span className="text-muted-foreground">
                  · last {formatRelative(device.lastMonitoredAt)}
                </span>
              )}
            </div>
          )}
          {/* E2E Encryption bot */}
          {device.encryptionStatus === "active" && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Bot className="h-3 w-3 text-accent shrink-0" />
              <span className="text-muted-foreground">E2E Encryption:</span>
              <span className="text-accent font-medium">Active</span>
              <span className="text-muted-foreground">· {device.encryptionBotId ?? "FORENSIQ-SecureBot-v2"}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <Button size="sm" className="w-full cursor-pointer" onClick={onAcquire}>
          <Fingerprint className="mr-1.5 h-3.5 w-3.5" />
          Acquire
        </Button>

        {/* Acquisition history (expandable) */}
        {acqs.length > 0 && (
          <Accordion type="single" collapsible className="-mx-1">
            <AccordionItem value="history" className="border-b-0 px-1">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-xs">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">Acquisition history</span>
                  <Badge variant="outline" className="text-[9px] py-0">{acqs.length}</Badge>
                  {verifiedCount > 0 && (
                    <Badge variant="outline" className="text-[9px] py-0 text-emerald-500 border-emerald-500/30">
                      <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                      {verifiedCount}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1">
                {acqs.map((acq) => (
                  <AcquisitionHistoryRow
                    key={acq.id}
                    acq={acq}
                    advanceMode={advanceMode}
                    onVerify={() => onVerifyAcq(acq)}
                    onResume={() => onResumeAcq(acq)}
                  />
                ))}
                {acqs.length >= 10 && (
                  <div className="text-[10px] text-center text-muted-foreground pt-1">
                    Showing last 10 acquisitions
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Footer metadata */}
        <div className="mt-auto pt-1 flex items-center justify-between text-[10px] font-mono-forensic text-muted-foreground">
          <span>Added {formatRelative(device.createdAt)}</span>
          {advanceMode && <span className="truncate ml-2">{device.id}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Empty state
 * ========================================================================== */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="bg-card/40 border-dashed border-border/60">
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
          <Fingerprint className="h-6 w-6 text-primary" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent pulse-ring" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No devices connected yet</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Add the first device to this case to begin forensic acquisition. Each device receives a unique
          evidence bag ID and chain-of-custody record.
        </p>
        <Button className="mt-4 cursor-pointer" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add First Device
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Main view
 * ========================================================================== */

/* ============================================================
 * Live Monitoring Bar — auto-updates every 30s
 * Shows real-time GPS, battery, encryption bot status for all
 * connected/monitoring devices.
 * ============================================================ */

function LiveMonitoringBar({ devices }: { devices: ApiDevice[] }) {
  const monitoringDevices = devices.filter(
    (d) => d.monitoringEnabled || d.connectionStatus === "monitoring" || d.connectionStatus === "connected"
  );
  const triggerMonitor = useTriggerMonitor();

  // Auto-trigger monitor updates every 30s for the first monitoring device
  useEffect(() => {
    if (monitoringDevices.length === 0) return;
    const interval = setInterval(() => {
      // Trigger monitoring update for all monitoring devices
      monitoringDevices.forEach((d) => {
        triggerMonitor.mutate(d.id);
      });
    }, 30_000); // 30 seconds
    return () => clearInterval(interval);
  }, [monitoringDevices.length]);

  if (monitoringDevices.length === 0) return null;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="h-4 w-4 text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent pulse-ring" />
          </div>
          <span className="text-sm font-semibold">Live Monitoring</span>
          <Badge variant="outline" className="text-[9px] text-accent border-accent/30 bg-accent/10">
            AUTO-UPDATE 30s
          </Badge>
        </div>
        <div className="text-[10px] font-mono-forensic text-muted-foreground">
          {monitoringDevices.length} device{monitoringDevices.length !== 1 ? "s" : ""} ·{" "}
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {monitoringDevices.map((d) => (
          <div key={d.id} className="rounded-md border border-border/40 bg-card/60 p-2.5 space-y-1.5">
            {/* Device name + status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate">{d.name}</span>
              <Badge variant="outline" className="text-[8px] text-accent border-accent/30 bg-accent/10 shrink-0">
                <span className="h-1 w-1 rounded-full bg-accent mr-1 pulse-ring" />
                LIVE
              </Badge>
            </div>
            {/* GPS Location — lat/lon then location name */}
            {d.gpsLat != null && (
              <div className="text-[10px] space-y-0.5">
                <div className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                  <span className="font-mono-forensic">
                    {d.gpsLat.toFixed(6)}, {d.gpsLon?.toFixed(6)}
                  </span>
                </div>
                {d.gpsLocationName && (
                  <div className="pl-3.5 text-muted-foreground truncate">{d.gpsLocationName}</div>
                )}
              </div>
            )}
            {/* Battery + Evidence + Encryption */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-0.5">
                <BatteryIcon percent={d.batteryPercent} />
                {d.batteryPercent ?? "—"}%
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{d._count?.evidenceItems ?? 0} evidence</span>
              <span className="text-muted-foreground">·</span>
              <span className="flex items-center gap-0.5 text-accent">
                <Bot className="h-2.5 w-2.5" />
                E2E
              </span>
            </div>
            {/* Last monitored */}
            {d.lastMonitoredAt && (
              <div className="text-[9px] text-muted-foreground font-mono-forensic">
                Last update: {formatRelative(d.lastMonitoredAt)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DevicesView({ caseId }: { caseId: string }) {
  const advanceMode = useAppStore((s) => s.advanceMode);
  const { data: devices, isLoading } = useDevices(caseId);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [acquireDevice, setAcquireDevice] = useState<ApiDevice | null>(null);
  const [acquireOpen, setAcquireOpen] = useState(false);
  const [completeAcq, setCompleteAcq] = useState<ApiAcquisition | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<ApiDevice | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDev, setDeleteDev] = useState<ApiDevice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const verifyAcq = useVerifyAcquisition();

  // Computed stats
  const stats = useMemo(() => {
    const list = devices ?? [];
    const total = list.length;
    const connected = list.filter((d) => d.connectionStatus === "connected").length;
    const acquired = list.filter((d) => d.connectionStatus === "acquired").length;
    const verified = list.reduce(
      (acc, d) => acc + (d.acquisitions ?? []).filter((a) => a.status === "verified" || a.integrityVerifiedAt).length,
      0
    );
    return { total, connected, acquired, verified };
  }, [devices]);

  const handleAcquire = (device: ApiDevice) => {
    setAcquireDevice(device);
    setAcquireOpen(true);
  };

  const handleAcquisitionStarted = (acq: ApiAcquisition) => {
    // Keep acquireDevice set — CompleteHashDialog needs it for caseId/deviceId.
    setCompleteAcq(acq);
    setCompleteOpen(true);
  };

  const handleResumeAcq = (device: ApiDevice, acq: ApiAcquisition) => {
    setCompleteAcq(acq);
    setAcquireDevice(device);
    setCompleteOpen(true);
  };

  const handleVerify = async (device: ApiDevice, acq: ApiAcquisition) => {
    try {
      await verifyAcq.mutateAsync({ id: acq.id, caseId: device.caseId, deviceId: device.id });
      toast.success("Integrity verified", {
        description: "Acquisition hash re-validated against stored value",
      });
    } catch (e) {
      toast.error("Verification failed", { description: (e as Error).message });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Device Connection & Acquisition
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect forensic devices, run acquisitions, and record SHA-256/512 integrity hashes for
              chain-of-custody.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setGuideOpen((v) => !v)}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              {guideOpen ? "Hide guide" : "Acquisition guide"}
            </Button>
            <Button size="sm" className="cursor-pointer" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Device
            </Button>
          </div>
        </div>

        {/* Live Monitoring Bar — auto-updates every 30s */}
        <LiveMonitoringBar devices={devices ?? []} />

        {/* Summary stat bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Fingerprint}
            label="Total Devices"
            value={stats.total}
            subtitle="In evidence inventory"
            accent="primary"
          />
          <StatCard
            icon={Cable}
            label="Connected"
            value={stats.connected}
            subtitle="Awaiting acquisition"
            accent="accent"
          />
          <StatCard
            icon={HardDrive}
            label="Acquired"
            value={stats.acquired}
            subtitle="Fully imaged"
            accent="emerald"
          />
          <StatCard
            icon={ShieldCheck}
            label="Integrity Verified"
            value={stats.verified}
            subtitle="Hashes re-validated"
            accent="amber"
          />
        </div>

        {/* Acquisition guide (collapsible) */}
        <AnimatePresence initial={false}>
          {guideOpen && <AcquisitionGuidePanel />}
        </AnimatePresence>

        {/* Device grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card border-border/60">
                <div className="h-1 w-full bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 w-2/3 bg-muted/60 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/40 rounded animate-pulse" />
                  <div className="h-16 bg-muted/30 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !devices || devices.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            <AnimatePresence mode="popLayout">
              {devices.map((d) => (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <DeviceCard
                    device={d}
                    advanceMode={advanceMode}
                    onAcquire={() => handleAcquire(d)}
                    onEdit={() => {
                      setEditDevice(d);
                      setEditOpen(true);
                    }}
                    onDelete={() => {
                      setDeleteDev(d);
                      setDeleteOpen(true);
                    }}
                    onVerifyAcq={(acq) => handleVerify(d, acq)}
                    onResumeAcq={(acq) => handleResumeAcq(d, acq)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Audit footer line */}
        <div className="text-[10px] font-mono-forensic text-muted-foreground flex flex-wrap items-center gap-2 pt-2">
          <ScanLine className="h-3 w-3" />
          <span>Chain-of-custody active</span>
          <span>·</span>
          <span>All acquisitions hash-locked</span>
          <span>·</span>
          <span>Mode: {advanceMode ? "ADVANCED" : "BASIC"}</span>
        </div>
      </div>

      {/* Dialogs */}
      <AddDeviceWizard open={addOpen} onOpenChange={setAddOpen} caseId={caseId} />

      <AcquisitionDialog
        device={acquireDevice}
        open={acquireOpen}
        onOpenChange={setAcquireOpen}
        onStarted={handleAcquisitionStarted}
      />

      <CompleteHashDialog
        key={completeAcq?.id ?? "empty"}
        acquisition={completeAcq}
        device={acquireDevice}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <EditDeviceDialog
        key={editDevice?.id ?? "empty"}
        device={editDevice}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteDeviceDialog device={deleteDev} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </TooltipProvider>
  );
}
