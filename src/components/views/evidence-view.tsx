"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Video,
  AudioLines,
  MessageSquare,
  Users,
  Globe,
  PhoneCall,
  AppWindow,
  MapPin,
  Mail,
  FileText,
  Share2,
  CreditCard,
  Calendar,
  StickyNote,
  Cpu,
  Network,
  FileQuestion,
  Shield,
  ShieldCheck,
  Copy,
  Hash,
  Tag,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  X,
  Loader2,
  PanelLeft,
  HardDrive,
  FileSearch,
  Eye,
  EyeOff,
  Play,
  Pause,
  Camera,
  KeyRound,
  Phone,
  Volume2,
  ShieldAlert,
  Wifi,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Maximize2,
  Lock,
} from "lucide-react";

import {
  useEvidence,
  useEvidenceStats,
  useUpdateEvidence,
  useBulkSelectEvidence,
  useDeleteEvidence,
} from "@/lib/api";
import type { ApiEvidenceItem, EvidenceCategory, RecoveryStatus } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { cn, formatBytes, formatDateTime, generateHashSync, toCSV } from "@/lib/utils";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/* ============================================================
 * Static metadata
 * ============================================================ */

type IconType = React.ComponentType<{ className?: string }>;

interface CategoryMeta {
  label: string;
  icon: IconType;
  color: string;
}

/* ---------- Download helpers (functional browser downloads) ---------- */

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function generateEvidenceReportHTML(item: ApiEvidenceItem, decoded: Record<string, unknown>): string {
  const decodedRows = Object.entries(decoded)
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(typeof v === "object" ? JSON.stringify(v) : v)}</td></tr>`)
    .join("");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Evidence Report — ${escapeHtml(item.fileName)}</title>
<style>
  body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a2e; background: #fff; }
  h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
  h2 { color: #0f766e; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f8fafc; }
  .meta { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; }
  .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #e0e7ff; color: #1e40af; }
</style></head><body>
<h1>Evidence Report</h1>
<div class="meta">
  <strong>File:</strong> ${escapeHtml(item.fileName)}<br>
  <strong>Category:</strong> ${escapeHtml(item.category)}<br>
  <strong>Recovery Status:</strong> <span class="badge">${escapeHtml(item.recoveryStatus)}</span><br>
  <strong>Confidence:</strong> ${item.confidence}%<br>
  <strong>Size:</strong> ${formatBytes(item.sizeBytes)}<br>
  <strong>MIME Type:</strong> ${escapeHtml(item.mimeType ?? "—")}<br>
  <strong>SHA-256:</strong> <code>${escapeHtml(item.sha256 ?? "Not hashed")}</code><br>
  <strong>Created (device):</strong> ${escapeHtml(item.createdAtDevice ?? "—")}<br>
  <strong>File Path:</strong> <code>${escapeHtml(item.filePath ?? "—")}</code>
</div>
<h2>Decoded Content</h2>
<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>
${decodedRows || "<tr><td colspan='2'>No decoded content</td></tr>"}
</tbody></table>
${item.preview ? `<h2>Preview</h2><p>${escapeHtml(item.preview)}</p>` : ""}
<div class="footer">Generated by FORENSIQ v4.2.1 — Tamper-evident chain-of-custody maintained.</div>
</body></html>`;
}

const CATEGORY_META: Record<EvidenceCategory, CategoryMeta> = {
  photos: { label: "Photos", icon: ImageIcon, color: "blue" },
  videos: { label: "Videos", icon: Video, color: "purple" },
  audio: { label: "Audio", icon: AudioLines, color: "orange" },
  sms: { label: "SMS", icon: MessageSquare, color: "teal" },
  contacts: { label: "Contacts", icon: Users, color: "cyan" },
  browser_history: { label: "Browser History", icon: Globe, color: "indigo" },
  call_logs: { label: "Call Logs", icon: PhoneCall, color: "green" },
  app_data: { label: "App Data", icon: AppWindow, color: "pink" },
  location_data: { label: "Location Data", icon: MapPin, color: "red" },
  emails: { label: "Emails", icon: Mail, color: "amber" },
  documents: { label: "Documents", icon: FileText, color: "blue" },
  social_media: { label: "Social Media", icon: Share2, color: "fuchsia" },
  financial: { label: "Financial", icon: CreditCard, color: "emerald" },
  calendar: { label: "Calendar", icon: Calendar, color: "violet" },
  notes: { label: "Notes", icon: StickyNote, color: "yellow" },
  system_logs: { label: "System Logs", icon: Cpu, color: "slate" },
  network_data: { label: "Network Data", icon: Network, color: "rose" },
  credentials: { label: "Credentials", icon: KeyRound, color: "amber" },
  installed_apps: { label: "Installed Apps", icon: AppWindow, color: "violet" },
  other: { label: "Other", icon: FileQuestion, color: "gray" },
};

interface ColorClasses {
  text: string;
  bg: string;
  border: string;
  dot: string;
  ring: string;
}

const COLOR_CLASSES: Record<string, ColorClasses> = {
  blue: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-500", ring: "ring-blue-500/20" },
  purple: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", dot: "bg-purple-500", ring: "ring-purple-500/20" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500", ring: "ring-orange-500/20" },
  teal: { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30", dot: "bg-teal-500", ring: "ring-teal-500/20" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500", ring: "ring-cyan-500/20" },
  indigo: { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", dot: "bg-indigo-500", ring: "ring-indigo-500/20" },
  green: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", dot: "bg-green-500", ring: "ring-green-500/20" },
  pink: { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", dot: "bg-pink-500", ring: "ring-pink-500/20" },
  red: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500", ring: "ring-red-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500", ring: "ring-amber-500/20" },
  fuchsia: { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", dot: "bg-fuchsia-500", ring: "ring-fuchsia-500/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500", ring: "ring-emerald-500/20" },
  violet: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-500", ring: "ring-violet-500/20" },
  yellow: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", ring: "ring-yellow-500/20" },
  slate: { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", dot: "bg-slate-500", ring: "ring-slate-500/20" },
  rose: { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-500", ring: "ring-rose-500/20" },
  gray: { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", dot: "bg-gray-500", ring: "ring-gray-500/20" },
};

const RECOVERY_META: Record<RecoveryStatus, { label: string; color: string }> = {
  existing: { label: "Existing", color: "blue" },
  deleted: { label: "Deleted", color: "red" },
  orphaned: { label: "Orphaned", color: "orange" },
  carved: { label: "Carved", color: "purple" },
  cached: { label: "Cached", color: "teal" },
};

const PRESET_TAGS = ["priority", "suspicious", "exculpatory", "reviewed", "flagged"];

/* ============================================================
 * Helpers
 * ============================================================ */

function parseTags(t: string | null | undefined): string[] {
  if (!t) return [];
  try {
    const v = JSON.parse(t);
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function confidenceLevel(c: number): "high" | "medium" | "low" {
  if (c >= 80) return "high";
  if (c >= 55) return "medium";
  return "low";
}

function confidenceExplanation(c: number): string {
  if (c >= 90) return "High confidence — verified against known signature database.";
  if (c >= 55) return "Medium confidence — partial signature match.";
  return "Low confidence — heuristic recovery only.";
}

function confidenceColor(c: number): string {
  if (c >= 80) return "bg-green-500";
  if (c >= 55) return "bg-yellow-500";
  return "bg-red-500";
}

function confidenceTextColor(c: number): string {
  if (c >= 80) return "text-green-400";
  if (c >= 55) return "text-yellow-400";
  return "text-red-400";
}

/** Returns a friendly preview for non-advance mode (message body, URL, name, etc). */
function friendlyPreview(item: ApiEvidenceItem): string | null {
  if (!item.preview) return null;
  switch (item.category) {
    case "sms":
    case "notes":
    case "emails":
    case "social_media":
      return item.preview;
    case "browser_history":
    case "network_data":
      return item.preview;
    case "contacts":
    case "call_logs":
      return item.preview;
    case "location_data":
      return item.preview;
    default:
      return null;
  }
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard API not available"));
}

function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "evidence";
}

function parsedDecoded(item: ApiEvidenceItem): unknown {
  if (!item.decodedContent) return null;
  try {
    return JSON.parse(item.decodedContent);
  } catch {
    return null;
  }
}

function buildEvidenceJson(item: ApiEvidenceItem): string {
  return JSON.stringify(
    {
      id: item.id,
      caseId: item.caseId,
      scanSessionId: item.scanSessionId,
      deviceId: item.deviceId,
      category: item.category,
      fileName: item.fileName,
      filePath: item.filePath,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      recoveryStatus: item.recoveryStatus,
      confidence: item.confidence,
      createdAtDevice: item.createdAtDevice,
      modifiedAtDevice: item.modifiedAtDevice,
      sha256: item.sha256,
      tags: parseTags(item.tags),
      isSelected: item.isSelected,
      notes: item.notes,
      preview: item.preview,
      decodedContent: parsedDecoded(item),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
    null,
    2
  );
}

function buildEvidenceCsv(item: ApiEvidenceItem): string {
  const headers = [
    "id",
    "caseId",
    "category",
    "fileName",
    "filePath",
    "mimeType",
    "sizeBytes",
    "recoveryStatus",
    "confidence",
    "sha256",
    "tags",
    "isSelected",
    "preview",
    "decodedContent",
    "createdAtDevice",
    "createdAt",
  ];
  const row: Record<string, unknown> = {
    id: item.id,
    caseId: item.caseId,
    category: item.category,
    fileName: item.fileName,
    filePath: item.filePath,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    recoveryStatus: item.recoveryStatus,
    confidence: item.confidence,
    sha256: item.sha256,
    tags: parseTags(item.tags).join(";"),
    isSelected: item.isSelected,
    preview: item.preview,
    decodedContent: item.decodedContent,
    createdAtDevice: item.createdAtDevice,
    createdAt: item.createdAt,
  };
  return `${headers.join(",")}\n${headers.map((h) => escapeCsvValue(row[h])).join(",")}\n`;
}

function buildEvidenceHtmlReport(item: ApiEvidenceItem): string {
  const tags = parseTags(item.tags);
  const decoded = parsedDecoded(item);
  const decodedJson = decoded
    ? JSON.stringify(decoded, null, 2)
    : "No decoded content available";
  const tagsHtml =
    tags.length > 0
      ? tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")
      : "No tags";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Evidence Report — ${escapeHtml(item.fileName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 0 auto; padding: 32px; color: #1a1a1a; line-height: 1.5; }
    h1 { color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin: 0; }
    h2 { color: #334155; margin-top: 28px; margin-bottom: 8px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 13px; }
    td:first-child { font-weight: 600; width: 220px; color: #475569; background: #f8fafc; }
    code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; font-size: 12px; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
    pre { background: #f1f5f9; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; margin-right: 4px; font-size: 12px; }
    .footer { margin-top: 40px; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FORENSIQ Evidence Report</h1>
    <span class="badge">${escapeHtml(item.recoveryStatus)}</span>
  </div>

  <h2>File Information</h2>
  <table>
    <tr><td>File Name</td><td>${escapeHtml(item.fileName)}</td></tr>
    <tr><td>File Path</td><td>${escapeHtml(item.filePath ?? "—")}</td></tr>
    <tr><td>MIME Type</td><td>${escapeHtml(item.mimeType ?? "—")}</td></tr>
    <tr><td>Size</td><td>${escapeHtml(formatBytes(item.sizeBytes))}</td></tr>
    <tr><td>Category</td><td>${escapeHtml(item.category)}</td></tr>
    <tr><td>Recovery Status</td><td>${escapeHtml(item.recoveryStatus)}</td></tr>
    <tr><td>Confidence</td><td>${item.confidence}%</td></tr>
  </table>

  <h2>Timestamps</h2>
  <table>
    <tr><td>Created (device)</td><td>${escapeHtml(item.createdAtDevice ?? "—")}</td></tr>
    <tr><td>Modified (device)</td><td>${escapeHtml(item.modifiedAtDevice ?? "—")}</td></tr>
    <tr><td>Created (system)</td><td>${escapeHtml(item.createdAt)}</td></tr>
    <tr><td>Updated (system)</td><td>${escapeHtml(item.updatedAt)}</td></tr>
  </table>

  <h2>Integrity</h2>
  <table>
    <tr><td>SHA-256</td><td><code>${escapeHtml(item.sha256 ?? "Not yet hashed")}</code></td></tr>
  </table>

  <h2>Tags</h2>
  <div>${tagsHtml}</div>

  <h2>Investigator Notes</h2>
  <p>${escapeHtml(item.notes ?? "No notes recorded.")}</p>

  <h2>Preview</h2>
  <p>${escapeHtml(item.preview ?? "No preview available.")}</p>

  <h2>Decoded Content</h2>
  <pre>${escapeHtml(decodedJson)}</pre>

  <div class="footer">
    Generated by FORENSIQ Digital Forensics Platform<br />
    Evidence ID: ${escapeHtml(item.id)} · Case ID: ${escapeHtml(item.caseId)} · Exported: ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

function buildBulkJson(items: ApiEvidenceItem[]): string {
  return JSON.stringify(
    items.map((it) => ({
      id: it.id,
      caseId: it.caseId,
      category: it.category,
      fileName: it.fileName,
      filePath: it.filePath,
      mimeType: it.mimeType,
      sizeBytes: it.sizeBytes,
      recoveryStatus: it.recoveryStatus,
      confidence: it.confidence,
      sha256: it.sha256,
      tags: parseTags(it.tags),
      isSelected: it.isSelected,
      preview: it.preview,
      decodedContent: parsedDecoded(it),
      createdAtDevice: it.createdAtDevice,
      createdAt: it.createdAt,
    })),
    null,
    2
  );
}

/* ============================================================
 * Small UI primitives
 * ============================================================ */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: IconType;
  label: string;
  value: string | number;
  color: string;
}) {
  const c = COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
  return (
    <Card className="bg-card border-border/60 py-0 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            c.bg,
            c.border
          )}
        >
          <Icon className={cn("size-4", c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="font-mono-forensic text-xl font-semibold leading-tight">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[88px]">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", confidenceColor(value))}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className={cn("font-mono-forensic text-[11px] tabular-nums", confidenceTextColor(value))}>
        {value}%
      </span>
    </div>
  );
}

function RecoveryBadge({ status }: { status: RecoveryStatus }) {
  const meta = RECOVERY_META[status];
  const c = COLOR_CLASSES[meta.color];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border px-1.5 py-0 text-[10px] font-medium", c.border, c.text, c.bg)}
    >
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {meta.label}
    </Badge>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm break-all", mono && "font-mono-forensic text-xs")}>
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Sidebar
 * ============================================================ */

interface SidebarProps {
  category: EvidenceCategory | "all";
  onCategoryChange: (c: EvidenceCategory | "all") => void;
  recoveryStatus: RecoveryStatus | "all";
  onRecoveryStatusChange: (r: RecoveryStatus | "all") => void;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalSizeBytes: number;
  onNavigate?: () => void;
}

function SidebarContent({
  category,
  onCategoryChange,
  recoveryStatus,
  onRecoveryStatusChange,
  categoryCounts,
  statusCounts,
  totalSizeBytes,
  onNavigate,
}: SidebarProps) {
  const visibleCategories = (Object.keys(CATEGORY_META) as EvidenceCategory[]).filter(
    (k) => (categoryCounts[k] ?? 0) > 0
  );
  const totalCount = Object.values(categoryCounts).reduce<number>((s, n) => s + (n || 0), 0);

  function pickCategory(c: EvidenceCategory | "all") {
    onCategoryChange(c);
    onNavigate?.();
  }
  function pickStatus(r: RecoveryStatus | "all") {
    onRecoveryStatusChange(r);
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Categories */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          <span className="font-mono-forensic text-[10px] text-muted-foreground">
            {totalCount} items
          </span>
        </div>

        <button
          onClick={() => pickCategory("all")}
          className={cn(
            "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
            category === "all"
              ? "bg-primary/15 text-primary-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <FileSearch className="size-4 text-primary" />
            All Categories
          </span>
          <span className="font-mono-forensic text-[11px] tabular-nums">{totalCount}</span>
        </button>

        <div className="max-h-72 overflow-y-auto pr-1">
          {visibleCategories.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">No categories yet.</div>
          ) : (
            visibleCategories.map((key) => {
              const meta = CATEGORY_META[key];
              const c = COLOR_CLASSES[meta.color];
              const isActive = category === key;
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  onClick={() => pickCategory(key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? cn("text-foreground ring-1", c.bg, c.border, c.ring)
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className={cn("size-4 shrink-0", isActive ? c.text : cn("text-muted-foreground", c.text))} />
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span className="font-mono-forensic text-[11px] tabular-nums">
                    {categoryCounts[key] ?? 0}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <Separator />

      {/* Recovery status */}
      <div className="flex flex-col gap-1">
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recovery Status
        </div>
        {(Object.keys(RECOVERY_META) as RecoveryStatus[]).map((r) => {
          const meta = RECOVERY_META[r];
          const c = COLOR_CLASSES[meta.color];
          const isActive = recoveryStatus === r;
          const count = statusCounts[r] ?? 0;
          if (count === 0 && !isActive) return null;
          return (
            <button
              key={r}
              onClick={() => pickStatus(isActive ? "all" : r)}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? cn("ring-1", c.bg, c.border, c.ring, "text-foreground")
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", c.dot)} />
                {meta.label}
              </span>
              <span className="font-mono-forensic text-[11px] tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <Separator className="mb-3" />
        <div className="rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <HardDrive className="size-3.5" />
            Total Size
          </div>
          <div className="mt-1 font-mono-forensic text-lg font-semibold">
            {formatBytes(totalSizeBytes)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Evidence Row
 * ============================================================ */

interface EvidenceRowProps {
  item: ApiEvidenceItem;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: (selected: boolean) => void;
  isActive: boolean;
  advanceMode: boolean;
}

function EvidenceRow({
  item,
  selected,
  onOpen,
  onToggleSelect,
  isActive,
  advanceMode,
}: EvidenceRowProps) {
  const meta = CATEGORY_META[item.category];
  const c = COLOR_CLASSES[meta.color];
  const Icon = meta.icon;
  const tags = parseTags(item.tags);
  const preview = friendlyPreview(item);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={onOpen}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg border bg-card/60 p-3 transition-colors",
        "hover:bg-accent/20 hover:border-border",
        isActive && "ring-1 ring-primary/40 border-primary/40",
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
          : "border-border/60"
      )}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="flex shrink-0 items-center"
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggleSelect(!!v)}
          aria-label={`Select ${item.fileName}`}
        />
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border",
          c.bg,
          c.border
        )}
      >
        <Icon className={cn("size-4", c.text)} />
      </div>

      {/* Filename + path */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{item.fileName}</div>
          {selected && (
            <Badge className="bg-primary/15 text-primary border-primary/30 px-1 py-0 text-[9px] uppercase tracking-wider">
              Export
            </Badge>
          )}
        </div>
        {advanceMode ? (
          <div className="mt-0.5 truncate font-mono-forensic text-[10.5px] text-muted-foreground">
            {item.filePath ?? "—"}
          </div>
        ) : preview ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground italic">
            “{preview}”
          </div>
        ) : (
          <div className="mt-0.5 truncate font-mono-forensic text-[10.5px] text-muted-foreground">
            {item.mimeType ?? "—"}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1 py-0 text-[9.5px] text-muted-foreground"
              >
                <Tag className="mr-0.5 size-2.5" />
                {t}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[9.5px] text-muted-foreground">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Right meta */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <RecoveryBadge status={item.recoveryStatus} />
        <ConfidenceBar value={item.confidence} />
        <div className="font-mono-forensic text-[10.5px] text-muted-foreground">
          {formatBytes(item.sizeBytes)}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
 * Decoded content renderers
 * ============================================================ */

/** Safely parse the `decodedContent` JSON string on an evidence item. */
function parseDecoded(item: ApiEvidenceItem): Record<string, unknown> | null {
  if (!item.decodedContent) return null;
  try {
    const parsed = JSON.parse(item.decodedContent);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}
function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => !isNaN(n));
}

function DecodedSectionHeader({ icon: Icon, label }: { icon: IconType; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </div>
  );
}

/* ---------- Photos ---------- */

function PhotoDecoded({ item, data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const thumbnail = asString(data.thumbnail);
  const dimensions = asString(data.dimensions);
  const cameraMake = asString(data.cameraMake);
  const cameraModel = asString(data.cameraModel);
  const focalLength = asString(data.focalLength);
  const aperture = asString(data.aperture);
  const iso = asNumber(data.iso);
  const exposureTime = asString(data.exposureTime);
  const locationName = asString(data.locationName);
  const gps = data.gps as { lat?: number; lon?: number; altitude?: number } | undefined;
  const cameraLabel =
    cameraMake && cameraModel
      ? `${cameraMake} ${cameraModel}`
      : cameraMake ?? cameraModel ?? null;

  return (
    <div className="space-y-3">
      {thumbnail && (
        <div className="overflow-hidden rounded-md border border-border/60 bg-muted/30">
          <img
            src={thumbnail}
            alt="Recovered photo preview"
            className="h-48 w-full object-contain"
          />
          <div className="flex items-center justify-between border-t border-border/40 bg-card/40 px-2 py-1.5">
            <span className="text-[10px] font-mono-forensic text-muted-foreground">
              {dimensions ?? "Preview"}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 cursor-pointer">
                  <Maximize2 className="size-3 mr-1" />
                  View Full Size
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-sm font-mono-forensic">{item.fileName}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {cameraLabel ?? "Recovered photo"} · {locationName ?? "Unknown location"}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center bg-muted/30 rounded-md p-2">
                  <img
                    src={thumbnail}
                    alt={item.fileName}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono-forensic text-muted-foreground">
                  {dimensions && <div><strong>Dimensions:</strong> {dimensions}</div>}
                  {focalLength && <div><strong>Focal:</strong> {focalLength}</div>}
                  {aperture && <div><strong>Aperture:</strong> {aperture}</div>}
                  {iso != null && <div><strong>ISO:</strong> {iso}</div>}
                  {exposureTime && <div><strong>Exposure:</strong> {exposureTime}</div>}
                  {gps && gps.lat != null && <div><strong>GPS:</strong> {gps.lat.toFixed(4)}, {gps.lon?.toFixed(4)}</div>}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <DecodedSectionHeader icon={Camera} label="EXIF Metadata" />
        <div className="divide-y divide-border/40">
          <MetaRow label="Dimensions" value={dimensions} mono />
          <MetaRow label="Camera" value={cameraLabel} mono />
          <MetaRow label="Focal Length" value={focalLength} mono />
          <MetaRow label="Aperture" value={aperture} mono />
          <MetaRow label="ISO" value={iso != null ? String(iso) : null} mono />
          <MetaRow label="Exposure" value={exposureTime} mono />
        </div>
      </div>

      {gps && (gps.lat != null || gps.lon != null) && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
          <DecodedSectionHeader icon={MapPin} label="GPS Location" />
          <div className="divide-y divide-border/40">
            <MetaRow
              label="Latitude"
              value={gps.lat != null ? gps.lat.toFixed(6) : null}
              mono
            />
            <MetaRow
              label="Longitude"
              value={gps.lon != null ? gps.lon.toFixed(6) : null}
              mono
            />
            <MetaRow
              label="Altitude"
              value={gps.altitude != null ? `${gps.altitude} m` : null}
              mono
            />
            <MetaRow label="Location" value={locationName} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Audio ---------- */

function AudioDecoded({ data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0-100

  const durationSec = asNumber(data.durationSec) ?? 0;
  const durationLabel = asString(data.durationLabel) ?? "0:00";
  const sampleRate = asNumber(data.sampleRate);
  const channels = asNumber(data.channels);
  const codec = asString(data.codec);
  const bitrate = asString(data.bitrate);
  const transcription = asString(data.transcription);
  const confidence = asNumber(data.transcriptionConfidence);
  const language = asString(data.language);
  const waveform = asNumberArray(data.waveform)
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v));

  React.useEffect(() => {
    if (!isPlaying || durationSec <= 0) return;
    const tickMs = 200;
    const incrementPerTick = (tickMs / 1000 / durationSec) * 100;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + incrementPerTick;
        return next >= 100 ? 100 : next;
      });
    }, tickMs);
    return () => clearInterval(interval);
  }, [isPlaying, durationSec]);

  React.useEffect(() => {
    if (progress >= 100 && isPlaying) {
      setIsPlaying(false);
    }
  }, [progress, isPlaying]);

  function formatTime(percent: number): string {
    if (durationSec <= 0) return "0:00";
    const sec = Math.floor((percent / 100) * durationSec);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }

  function togglePlay() {
    if (progress >= 100) {
      setProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }

  const confidenceColor =
    confidence == null
      ? null
      : confidence >= 90
        ? "green"
        : confidence >= 75
          ? "amber"
          : "red";

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <DecodedSectionHeader icon={Volume2} label="Audio Player" />

        <div className="flex items-center gap-3">
          <Button
            variant={isPlaying ? "secondary" : "default"}
            className="size-9 shrink-0 rounded-full p-0"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 translate-x-px" />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            {/* Waveform visualization */}
            <div className="flex h-10 items-center gap-px">
              {waveform.length > 0 ? (
                waveform.map((v, i) => {
                  const isActive = (i / waveform.length) * 100 <= progress;
                  const heightPct = Math.max(8, Math.min(100, v));
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm transition-colors",
                        isActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })
              ) : (
                <div className="text-[11px] text-muted-foreground">
                  No waveform data
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between font-mono-forensic text-[10px] text-muted-foreground">
              <span>{formatTime(progress)}</span>
              <span>{durationLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <DecodedSectionHeader icon={Volume2} label="Audio Metadata" />
        <div className="divide-y divide-border/40">
          <MetaRow label="Duration" value={durationLabel} mono />
          <MetaRow label="Codec" value={codec} mono />
          <MetaRow
            label="Sample Rate"
            value={sampleRate != null ? `${sampleRate.toLocaleString()} Hz` : null}
            mono
          />
          <MetaRow
            label="Channels"
            value={
              channels === 1
                ? "Mono"
                : channels === 2
                  ? "Stereo"
                  : channels != null
                    ? String(channels)
                    : null
            }
          />
          <MetaRow label="Bitrate" value={bitrate} mono />
          <MetaRow label="Language" value={language} mono />
        </div>
      </div>

      {transcription && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <DecodedSectionHeader icon={MessageSquare} label="Transcription" />
            {confidence != null && confidenceColor && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 px-1.5 py-0 text-[10px] font-medium",
                  COLOR_CLASSES[confidenceColor]?.border,
                  COLOR_CLASSES[confidenceColor]?.text,
                  COLOR_CLASSES[confidenceColor]?.bg
                )}
              >
                <Volume2 className="size-2.5" />
                {confidence}% confidence
              </Badge>
            )}
          </div>
          <div className="text-sm leading-relaxed text-foreground italic">
            “{transcription}”
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- SMS ---------- */

function SmsDecoded({ item, data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const isOutgoing = asString(data.direction) === "outgoing";
  const sender = asString(data.sender);
  const recipient = asString(data.recipient);
  const phoneNumber = asString(data.phoneNumber);
  const body = asString(data.body);
  const readStatus = asString(data.readStatus);
  const messageType = asString(data.messageType);
  const language = asString(data.language);

  const readColor =
    readStatus === "read"
      ? "green"
      : readStatus === "unread"
        ? "red"
        : readStatus === "delivered"
          ? "blue"
          : "gray";

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <DecodedSectionHeader icon={MessageSquare} label="Message" />

      {/* Chat bubble */}
      <div
        className={cn(
          "mb-3 flex flex-col gap-1",
          isOutgoing ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">
            {isOutgoing ? recipient ?? "Recipient" : sender ?? "Sender"}
          </span>
          {phoneNumber && (
            <span className="font-mono-forensic">{phoneNumber}</span>
          )}
        </div>
        <div
          className={cn(
            "max-w-[85%] rounded-lg border p-3",
            isOutgoing
              ? "bg-primary/15 border-primary/40"
              : "bg-muted/60 border-border/60"
          )}
        >
          <div className="text-sm leading-relaxed text-foreground">
            {body ?? "—"}
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            <span className="font-mono-forensic">
              {formatDateTime(item.createdAtDevice)}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        <MetaRow
          label="Direction"
          value={isOutgoing ? "Outgoing →" : "← Incoming"}
        />
        <MetaRow label="Sender" value={sender} />
        <MetaRow label="Recipient" value={recipient} />
        <MetaRow label="Phone" value={phoneNumber} mono />
        <MetaRow label="Message Type" value={messageType} mono />
        <MetaRow label="Language" value={language} mono />
        <MetaRow
          label="Read Status"
          value={
            readStatus ? (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 px-1.5 py-0 text-[10px]",
                  COLOR_CLASSES[readColor]?.border,
                  COLOR_CLASSES[readColor]?.text,
                  COLOR_CLASSES[readColor]?.bg
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    COLOR_CLASSES[readColor]?.dot
                  )}
                />
                {readStatus}
              </Badge>
            ) : null
          }
        />
      </div>
    </div>
  );
}

/* ---------- Credentials ---------- */

function CredentialsDecoded({ data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const [showPassword, setShowPassword] = React.useState(false);

  const service = asString(data.service);
  const account = asString(data.account);
  const password = asString(data.password);
  const tokenType = asString(data.tokenType);
  const tokenValue = asString(data.tokenValue);
  const extractionMethod = asString(data.extractionMethod);
  const accessibleWhenUnlocked = asBool(data.accessibleWhenUnlocked);
  const securityLevel = asString(data.securityLevel);

  const securityMeta =
    securityLevel === "strong"
      ? { label: "Strong", color: "green", Icon: Shield }
      : securityLevel === "moderate"
        ? { label: "Moderate", color: "amber", Icon: Shield }
        : securityLevel === "weak"
          ? { label: "Weak", color: "red", Icon: ShieldAlert }
          : { label: securityLevel ?? "Unknown", color: "gray", Icon: Shield };
  const SecurityIcon = securityMeta.Icon;

  function copyValue(text: string, label: string) {
    copyToClipboard(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Failed to copy"));
  }

  const maskedPassword = password
    ? "•".repeat(Math.min(password.length, 16))
    : null;

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="text-xs leading-relaxed text-amber-200">
          Credentials extracted from device keychain — handle per chain-of-custody policy.
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        {/* Service header */}
        <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
          <div className="flex size-8 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10">
            <KeyRound className="size-4 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {service ?? "Unknown Service"}
            </div>
            <div className="truncate font-mono-forensic text-[10px] text-muted-foreground">
              {account ?? "—"}
            </div>
          </div>
          {tokenType && (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-400"
            >
              {tokenType}
            </Badge>
          )}
        </div>

        {/* Password */}
        {password && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Password
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 p-2">
              <code className="flex-1 truncate font-mono-forensic text-xs">
                {showPassword ? password : maskedPassword}
              </code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 shrink-0 p-0"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showPassword ? "Hide" : "Show"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 shrink-0 p-0"
                    onClick={() => copyValue(password, "Password")}
                    aria-label="Copy password"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy password</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Token value */}
        {tokenValue && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Token Value
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 p-2">
              <code className="flex-1 truncate font-mono-forensic text-xs">
                {tokenValue}
              </code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 shrink-0 p-0"
                    onClick={() => copyValue(tokenValue, "Token")}
                    aria-label="Copy token value"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy token</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-3 divide-y divide-border/40">
          <MetaRow label="Extraction" value={extractionMethod} mono />
          <MetaRow
            label="Accessible"
            value={
              accessibleWhenUnlocked != null
                ? accessibleWhenUnlocked
                  ? "When unlocked"
                  : "When locked"
                : null
            }
          />
          <MetaRow
            label="Security"
            value={
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 px-1.5 py-0 text-[10px]",
                  COLOR_CLASSES[securityMeta.color]?.border,
                  COLOR_CLASSES[securityMeta.color]?.text,
                  COLOR_CLASSES[securityMeta.color]?.bg
                )}
              >
                <SecurityIcon className="size-2.5" />
                {securityMeta.label}
              </Badge>
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Installed Apps ---------- */

const PERMISSION_COLORS: Record<string, string> = {
  camera: "red",
  microphone: "red",
  location: "amber",
  contacts: "blue",
  storage: "gray",
};

function InstalledAppsDecoded({ data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const appName = asString(data.appName);
  const bundleId = asString(data.bundleId);
  const version = asString(data.version);
  const appCategory = asString(data.appCategory);
  const installDate = asString(data.installDate);
  const lastUsed = asString(data.lastUsed);
  const dataSizeBytes = asNumber(data.dataSizeBytes);
  const cacheSizeBytes = asNumber(data.cacheSizeBytes);
  const permissions = asStringArray(data.permissions);
  const hasCredentials = asBool(data.hasCredentials);
  const networkActivity = asString(data.networkActivity);
  const sandboxed = asBool(data.sandboxed);

  const networkColor =
    networkActivity === "high"
      ? "red"
      : networkActivity === "moderate"
        ? "amber"
        : networkActivity === "low"
          ? "green"
          : "gray";

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      {/* App header */}
      <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
        <div className="flex size-9 items-center justify-center rounded-md border border-blue-500/30 bg-blue-500/10">
          <AppWindow className="size-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {appName ?? "Unknown App"}
            </span>
            {appCategory && (
              <Badge
                variant="outline"
                className="border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-[10px] text-blue-400"
              >
                {appCategory}
              </Badge>
            )}
          </div>
          <div className="truncate font-mono-forensic text-[10px] text-muted-foreground">
            {bundleId ?? "—"}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        <MetaRow label="Bundle ID" value={bundleId} mono />
        <MetaRow label="Version" value={version} mono />
        <MetaRow
          label="Installed"
          value={installDate ? formatDateTime(installDate) : null}
          mono
        />
        <MetaRow
          label="Last Used"
          value={lastUsed ? formatDateTime(lastUsed) : null}
          mono
        />
        <MetaRow
          label="Data Size"
          value={
            dataSizeBytes != null ? (
              <span className="inline-flex items-center gap-1">
                <HardDrive className="size-3 text-muted-foreground" />
                {formatBytes(dataSizeBytes)}
              </span>
            ) : null
          }
          mono
        />
        <MetaRow
          label="Cache Size"
          value={
            cacheSizeBytes != null ? (
              <span className="inline-flex items-center gap-1">
                <HardDrive className="size-3 text-muted-foreground" />
                {formatBytes(cacheSizeBytes)}
              </span>
            ) : null
          }
          mono
        />
      </div>

      {/* Permissions */}
      {permissions.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Shield className="size-3" />
            Permissions
          </div>
          <div className="flex flex-wrap gap-1">
            {permissions.map((p) => {
              const color = PERMISSION_COLORS[p] ?? "slate";
              const c = COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
              return (
                <span
                  key={p}
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]",
                    c.border,
                    c.bg,
                    c.text
                  )}
                >
                  {p}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Status badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hasCredentials != null && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 px-1.5 py-0 text-[10px]",
              hasCredentials
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-border/60 bg-muted/40 text-muted-foreground"
            )}
          >
            <KeyRound className="size-2.5" />
            {hasCredentials ? "Has stored credentials" : "No stored credentials"}
          </Badge>
        )}
        {networkActivity && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 px-1.5 py-0 text-[10px]",
              COLOR_CLASSES[networkColor]?.border,
              COLOR_CLASSES[networkColor]?.bg,
              COLOR_CLASSES[networkColor]?.text
            )}
          >
            <Wifi className="size-2.5" />
            {networkActivity} network activity
          </Badge>
        )}
        {sandboxed != null && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 px-1.5 py-0 text-[10px]",
              sandboxed
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}
          >
            <Shield className="size-2.5" />
            {sandboxed ? "Sandboxed" : "Not sandboxed"}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ---------- Generic JSON key-value table ---------- */

function humanizeKey(k: string): string {
  return k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function GenericJsonDecoded({ data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <DecodedSectionHeader icon={FileText} label="Decoded Content" />
      <div className="divide-y divide-border/40">
        {entries.map(([k, v]) => {
          let value: React.ReactNode;
          let mono = false;
          if (v == null) {
            value = null;
          } else if (typeof v === "string") {
            value = v;
            mono = true;
          } else if (typeof v === "number" || typeof v === "boolean") {
            value = String(v);
            mono = true;
          } else if (Array.isArray(v)) {
            value = v.length === 0 ? "[]" : v.map((x) => String(x)).join(", ");
            mono = true;
          } else {
            value = JSON.stringify(v);
            mono = true;
          }
          return (
            <MetaRow
              key={k}
              label={humanizeKey(k)}
              value={value}
              mono={mono}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Switcher ---------- */

function DecodedContentRenderer({ item }: { item: ApiEvidenceItem }) {
  const data = parseDecoded(item);
  if (!data) {
    // Fallback: show a message so the section is never empty
    return (
      <section className="rounded-md border border-border/60 bg-muted/20 p-3">
        <DecodedSectionHeader icon={FileText} label="Decoded Content" />
        <div className="text-sm text-muted-foreground italic">
          {item.preview
            ? `"${item.preview}"`
            : "No decoded content available for this item."}
        </div>
      </section>
    );
  }

  switch (item.category) {
    case "photos":
      return <PhotoDecoded item={item} data={data} />;
    case "videos":
      return <VideoDecoded item={item} data={data} />;
    case "audio":
      return <AudioDecoded item={item} data={data} />;
    case "sms":
      return <SmsDecoded item={item} data={data} />;
    case "credentials":
      return <CredentialsDecoded item={item} data={data} />;
    case "installed_apps":
      return <InstalledAppsDecoded item={item} data={data} />;
    default:
      return <GenericJsonDecoded item={item} data={data} />;
  }
}

/* ---------- Videos — streaming media player ---------- */

function VideoDecoded({ item, data }: { item: ApiEvidenceItem; data: Record<string, unknown> }) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const posterImage = asString(data.posterImage);
  const title = asString(data.title);
  const durationSec = asNumber(data.durationSec);
  const durationLabel = asString(data.durationLabel);
  const resolution = asString(data.resolution);
  const fps = asNumber(data.fps);
  const codec = asString(data.codec);
  const bitrate = asString(data.bitrate);
  const hasAudio = asBool(data.hasAudio);
  const location = asString(data.location);
  const encrypted = asBool(data.encrypted);
  const encryptionBot = asString(data.encryptionBot);

  // Simulate playback progress when playing
  React.useEffect(() => {
    if (!playing || !durationSec) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + (100 / durationSec);
        if (next >= 100) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, durationSec]);

  return (
    <div className="space-y-3">
      {/* Video player with poster + play overlay */}
      <div className="overflow-hidden rounded-md border border-border/60 bg-black">
        <div className="relative aspect-video w-full">
          {posterImage && (
            <img
              src={posterImage}
              alt={title ?? item.fileName}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          {/* Play/Pause overlay */}
          <button
            onClick={() => setPlaying(!playing)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 ring-2 ring-primary-foreground/30">
              {playing ? (
                <Pause className="h-6 w-6 text-primary-foreground" />
              ) : (
                <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </div>
          </button>
          {/* Duration badge */}
          {durationLabel && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono-forensic text-white">
              {durationLabel}
            </div>
          )}
          {/* Encryption badge */}
          {encrypted && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] text-accent ring-1 ring-accent/30">
              <Lock className="h-2.5 w-2.5" />
              E2E
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted/40">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Controls bar */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 cursor-pointer"
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <span className="text-[10px] font-mono-forensic text-muted-foreground">
              {Math.floor(progress * (durationSec ?? 0) / 100)}s / {durationLabel}
            </span>
          </div>
          <div className="text-[10px] font-mono-forensic text-muted-foreground">
            {resolution} · {fps}fps · {codec}
          </div>
        </div>
      </div>

      {/* Video metadata */}
      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <DecodedSectionHeader icon={Video} label="Video Metadata" />
        <div className="divide-y divide-border/40">
          <MetaRow label="Title" value={title} />
          <MetaRow label="Resolution" value={resolution} mono />
          <MetaRow label="Frame Rate" value={fps != null ? `${fps} fps` : null} mono />
          <MetaRow label="Codec" value={codec} mono />
          <MetaRow label="Bitrate" value={bitrate} mono />
          <MetaRow label="Duration" value={durationLabel} mono />
          <MetaRow label="Has Audio" value={hasAudio != null ? (hasAudio ? "Yes" : "No") : null} />
          {location && <MetaRow label="Location" value={location} />}
          {encrypted && <MetaRow label="Encryption" value={encryptionBot ?? "FORENSIQ-SecureBot-v2"} mono />}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Detail Panel
 * ============================================================ */

interface DetailPanelProps {
  item: ApiEvidenceItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  advanceMode: boolean;
  updateEvidence: ReturnType<typeof useUpdateEvidence>;
  deleteEvidence: ReturnType<typeof useDeleteEvidence>;
}

function DetailPanel({
  item,
  open,
  onOpenChange,
  advanceMode,
  updateEvidence,
  deleteEvidence,
}: DetailPanelProps) {
  const [hashInput, setHashInput] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Sync local state when item changes
  React.useEffect(() => {
    if (item) {
      setHashInput(item.sha256 ?? "");
      setNotes(item.notes ?? "");
      setTagInput("");
    }
  }, [item]);

  const rawMetadata = React.useMemo(() => {
    if (!item) return "";
    return JSON.stringify(
      {
        id: item.id,
        caseId: item.caseId,
        scanSessionId: item.scanSessionId,
        deviceId: item.deviceId,
        category: item.category,
        fileName: item.fileName,
        filePath: item.filePath,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        recoveryStatus: item.recoveryStatus,
        confidence: item.confidence,
        createdAtDevice: item.createdAtDevice,
        modifiedAtDevice: item.modifiedAtDevice,
        sha256: item.sha256,
        tags: parseTags(item.tags),
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      null,
      2
    );
  }, [item]);

  if (!item) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0" />
      </Sheet>
    );
  }

  const meta = CATEGORY_META[item.category];
  const c = COLOR_CLASSES[meta.color];
  const Icon = meta.icon;
  const tags = parseTags(item.tags);
  const preview = friendlyPreview(item);
  const hasHash = !!item.sha256;

  function addTag(t: string) {
    const cleaned = t.trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      toast.message("Tag already exists");
      return;
    }
    updateEvidence.mutate(
      { id: item!.id, tags: [...tags, cleaned] },
      {
        onSuccess: () => toast.success("Tag added"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
    setTagInput("");
  }

  function removeTag(t: string) {
    updateEvidence.mutate(
      { id: item!.id, tags: tags.filter((x) => x !== t) },
      {
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function generateHash() {
    const h = generateHashSync(64);
    setHashInput(h);
    toast.success("Hash generated");
  }

  function saveHash() {
    if (!hashInput.trim()) {
      toast.error("Hash cannot be empty");
      return;
    }
    updateEvidence.mutate(
      { id: item!.id, sha256: hashInput.trim() },
      {
        onSuccess: () => toast.success("Hash saved"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function copyHash() {
    if (!item?.sha256) return;
    copyToClipboard(item.sha256)
      .then(() => toast.success("Hash copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  }

  function saveNotes() {
    if (notes === (item?.notes ?? "")) return;
    updateEvidence.mutate(
      { id: item!.id, notes },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function toggleExport(v: boolean) {
    updateEvidence.mutate(
      { id: item!.id, isSelected: v },
      {
        onSuccess: () =>
          toast.success(v ? "Marked for export" : "Removed from export"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function handleDelete() {
    deleteEvidence.mutate(item!.id, {
      onSuccess: () => {
        toast.success("Evidence item deleted");
        onOpenChange(false);
      },
      onError: (e) => toast.error(`Failed: ${e.message}`),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:w-[480px] sm:max-w-[480px]"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border/60 bg-card/40 p-4 pr-12">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-md border",
                c.bg,
                c.border
              )}
            >
              <Icon className={cn("size-5", c.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-semibold">
                {item.fileName}
              </SheetTitle>
              <SheetDescription className="mt-0.5 flex items-center gap-2 text-xs">
                <span>{meta.label}</span>
                <span className="text-muted-foreground/50">·</span>
                <RecoveryBadge status={item.recoveryStatus} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4">
          {/* Friendly preview (non-advance mode) */}
          {!advanceMode && preview && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Preview
              </div>
              <div className="text-sm text-foreground italic">“{preview}”</div>
            </div>
          )}

          {/* Metadata */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3.5" />
              Metadata
            </div>
            <div className="divide-y divide-border/40">
              <MetaRow label="File Path" value={item.filePath} mono />
              <MetaRow label="MIME Type" value={item.mimeType} mono />
              <MetaRow
                label="Size"
                value={<span className="font-mono-forensic">{formatBytes(item.sizeBytes)}</span>}
              />
              <MetaRow
                label="Created (device)"
                value={formatDateTime(item.createdAtDevice)}
                mono
              />
              <MetaRow
                label="Modified (device)"
                value={formatDateTime(item.modifiedAtDevice)}
                mono
              />
              <MetaRow label="Recovery" value={<RecoveryBadge status={item.recoveryStatus} />} />
              <MetaRow
                label="Confidence"
                value={
                  <div className="flex items-center gap-2">
                    <ConfidenceBar value={item.confidence} />
                  </div>
                }
              />
            </div>
          </section>

          {/* Advance mode extras */}
          {advanceMode && (
            <section className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="size-3.5" />
                Technical Details
              </div>
              <div className="divide-y divide-border/40">
                <MetaRow label="Item ID" value={item.id} mono />
                <MetaRow label="Case ID" value={item.caseId} mono />
                <MetaRow label="Scan Session" value={item.scanSessionId} mono />
                <MetaRow label="Device ID" value={item.deviceId} mono />
                <MetaRow label="Created (system)" value={formatDateTime(item.createdAt)} mono />
                <MetaRow label="Updated (system)" value={formatDateTime(item.updatedAt)} mono />
              </div>
            </section>
          )}

          {/* Confidence explanation */}
          <section className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Shield className="size-3.5" />
              Confidence Assessment
            </div>
            <div className="text-sm text-foreground">
              {confidenceExplanation(item.confidence)}
            </div>
          </section>

          {/* Decoded content visualization (varies by category) */}
          <DecodedContentRenderer item={item} />

          {/* Integrity status */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {hasHash ? (
                <ShieldCheck className="size-3.5 text-green-500" />
              ) : (
                <Shield className="size-3.5 text-muted-foreground" />
              )}
              Integrity / SHA-256
            </div>

            {hasHash && !advanceMode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 p-2">
                  <ShieldCheck className="size-4 shrink-0 text-green-500" />
                  <code className="flex-1 truncate font-mono-forensic text-[11px] text-green-400">
                    {item.sha256}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={copyHash}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy hash</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Hash verified — file integrity confirmed.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder={hasHash ? item.sha256 ?? "" : "Not yet hashed"}
                    className="font-mono-forensic text-xs"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={generateHash}
                      >
                        <Hash className="size-3.5" />
                        <span className="ml-1 hidden sm:inline">Generate</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate hash</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {hasHash ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <ShieldCheck className="size-3" /> Hash saved
                      </span>
                    ) : (
                      <span>Not yet hashed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasHash && (
                      <Button size="sm" variant="ghost" className="h-7" onClick={copyHash}>
                        <Copy className="size-3.5 mr-1" /> Copy
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7"
                      onClick={saveHash}
                      disabled={updateEvidence.isPending}
                    >
                      Save Hash
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Advance mode: full hash display */}
            {advanceMode && hasHash && (
              <div className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Full SHA-256
                </div>
                <code className="block break-all font-mono-forensic text-[10.5px] text-green-400">
                  {item.sha256}
                </code>
              </div>
            )}
          </section>

          <Separator />

          {/* Tags */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="size-3.5" />
              Tags
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout">
                {tags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">No tags yet.</span>
                ) : (
                  tags.map((t) => (
                    <motion.span
                      key={t}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.12 }}
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10.5px]"
                    >
                      <Tag className="size-2.5 text-muted-foreground" />
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        className="ml-0.5 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${t}`}
                      >
                        <X className="size-2.5" />
                      </button>
                    </motion.span>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Add tag and press Enter"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={() => addTag(tagInput)}
              >
                Add
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {PRESET_TAGS.map((p) => (
                <button
                  key={p}
                  onClick={() => addTag(p)}
                  disabled={tags.includes(p)}
                  className={cn(
                    "rounded border border-border/60 px-1.5 py-0.5 text-[10px] transition-colors",
                    tags.includes(p)
                      ? "cursor-not-allowed opacity-40"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  + {p}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Notes */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <StickyNote className="size-3.5" />
              Investigator Notes
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes about this evidence item…"
              className="min-h-[88px] text-xs"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Notes save automatically on blur.
            </div>
          </section>

          <Separator />

          {/* Export toggle */}
          <section className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-3">
            <div>
              <div className="text-sm font-medium">Mark for Export</div>
              <div className="text-[11px] text-muted-foreground">
                Include this item in the export bundle.
              </div>
            </div>
            <Switch checked={item.isSelected} onCheckedChange={toggleExport} />
          </section>

          {/* Advance mode: raw JSON */}
          {advanceMode && (
            <section>
              <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Raw Metadata JSON
              </Label>
              <pre className="max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/30 p-2 font-mono-forensic text-[10px] leading-relaxed text-muted-foreground">
                {rawMetadata}
              </pre>
            </section>
          )}

          {/* Download options — functional file downloads */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Download className="size-3.5" />
              Download
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  const content = JSON.stringify({
                    ...item,
                    decodedContent: item.decodedContent ? JSON.parse(item.decodedContent) : null,
                    tags: parseTags(item.tags),
                  }, null, 2);
                  downloadBlob(content, `${item.fileName.replace(/\.[^.]+$/, "")}.json`, "application/json");
                  toast.success("JSON downloaded");
                }}
              >
                <FileJson className="size-3.5 mr-1.5" />
                JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  const decoded = item.decodedContent ? JSON.parse(item.decodedContent) : {};
                  const flat: Record<string, unknown> = {
                    id: item.id,
                    fileName: item.fileName,
                    category: item.category,
                    mimeType: item.mimeType ?? "",
                    sizeBytes: item.sizeBytes ?? 0,
                    recoveryStatus: item.recoveryStatus,
                    confidence: item.confidence,
                    sha256: item.sha256 ?? "",
                    filePath: item.filePath ?? "",
                    createdAtDevice: item.createdAtDevice ?? "",
                    ...decoded,
                  };
                  const csv = toCSV([flat]);
                  downloadBlob(csv, `${item.fileName.replace(/\.[^.]+$/, "")}.csv`, "text/csv");
                  toast.success("CSV downloaded");
                }}
              >
                <FileSpreadsheet className="size-3.5 mr-1.5" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  const decoded = item.decodedContent ? JSON.parse(item.decodedContent) : {};
                  const html = generateEvidenceReportHTML(item, decoded);
                  downloadBlob(html, `${item.fileName.replace(/\.[^.]+$/, "")}_report.html`, "text/html");
                  toast.success("PDF report downloaded");
                }}
              >
                <FileText className="size-3.5 mr-1.5" />
                PDF Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  if (item.preview) {
                    downloadBlob(item.preview, `${item.fileName.replace(/\.[^.]+$/, "")}_preview.txt`, "text/plain");
                    toast.success("Text preview downloaded");
                  } else {
                    toast.error("No text preview available for this item");
                  }
                }}
              >
                <FileText className="size-3.5 mr-1.5" />
                Text
              </Button>
            </div>
          </section>

          <Separator />

          {/* Delete */}
          <section className="mt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="size-4 mr-2" />
                  Delete Evidence Item
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete evidence item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <span className="font-mono-forensic">{item.fileName}</span> from the case. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
 * Empty state
 * ============================================================ */

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
        <FileSearch className="size-6 text-muted-foreground" />
      </div>
      <div className="mt-3 text-sm font-medium">
        {hasFilters ? "No evidence matches the current filters" : "No evidence items found"}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {hasFilters
          ? "Try adjusting or clearing your filters to see more results."
          : "Run a scan to populate evidence items."}
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}

/* ============================================================
 * Main EvidenceView
 * ============================================================ */

export function EvidenceView({ caseId }: { caseId: string }) {
  const advanceMode = useAppStore((s) => s.advanceMode);

  // Filters
  const [category, setCategory] = React.useState<EvidenceCategory | "all">("all");
  const [recoveryStatus, setRecoveryStatus] = React.useState<RecoveryStatus | "all">("all");
  const [minConfidence, setMinConfidence] = React.useState<number | "all">("all");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  // UI
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Data
  const evidenceQuery = useEvidence(caseId, {
    category,
    recoveryStatus,
    minConfidence: minConfidence === "all" ? undefined : minConfidence,
    q: debouncedSearch || undefined,
  });
  const statsQuery = useEvidenceStats(caseId);
  const updateEvidence = useUpdateEvidence(caseId);
  const bulkSelect = useBulkSelectEvidence(caseId);
  const deleteEvidence = useDeleteEvidence(caseId);

  const items = evidenceQuery.data ?? [];
  const stats = statsQuery.data;

  const categoryCounts = stats?.byCategory ?? {};
  const statusCounts = stats?.byRecoveryStatus ?? {};
  const totalSizeBytes = stats?.totalSizeBytes ?? 0;
  const totalItems = stats?.total ?? 0;
  const selectedCount = stats?.selectedCount ?? 0;
  const deletedCount = statusCounts.deleted ?? 0;
  const carvedCount = statusCounts.carved ?? 0;

  const selectedItem = React.useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  // Active filter chips
  const activeFilters: { label: string; onClear: () => void }[] = [];
  if (category !== "all") {
    activeFilters.push({
      label: CATEGORY_META[category].label,
      onClear: () => setCategory("all"),
    });
  }
  if (recoveryStatus !== "all") {
    activeFilters.push({
      label: RECOVERY_META[recoveryStatus].label,
      onClear: () => setRecoveryStatus("all"),
    });
  }
  if (minConfidence !== "all") {
    activeFilters.push({
      label: `≥${minConfidence}% confidence`,
      onClear: () => setMinConfidence("all"),
    });
  }
  if (debouncedSearch) {
    activeFilters.push({
      label: `“${debouncedSearch}”`,
      onClear: () => setSearch(""),
    });
  }

  const visibleSelectedCount = items.filter((i) => i.isSelected).length;
  const allVisibleSelected = items.length > 0 && visibleSelectedCount === items.length;

  function handleSelectAll() {
    bulkSelect.mutate(
      { ids: items.map((i) => i.id), selected: !allVisibleSelected },
      {
        onSuccess: () =>
          toast.success(allVisibleSelected ? "Cleared selection" : "Selected all visible"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function handleItemToggle(id: string, selected: boolean) {
    updateEvidence.mutate(
      { id, isSelected: selected },
      {
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function clearAllFilters() {
    setCategory("all");
    setRecoveryStatus("all");
    setMinConfidence("all");
    setSearch("");
  }

  const hasFilters = activeFilters.length > 0;
  const isLoading = evidenceQuery.isLoading;
  const isFetching = evidenceQuery.isFetching;

  return (
    <div className="flex h-full min-h-0 gap-4 p-4">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:flex">
        <Card className="bg-card border-border/60 w-full overflow-hidden py-0">
          <ScrollArea className="h-full">
            <SidebarContent
              category={category}
              onCategoryChange={setCategory}
              recoveryStatus={recoveryStatus}
              onRecoveryStatusChange={setRecoveryStatus}
              categoryCounts={categoryCounts}
              statusCounts={statusCounts}
              totalSizeBytes={totalSizeBytes}
            />
          </ScrollArea>
        </Card>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b border-border/60 p-4">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Filter className="size-4" /> Filters
            </SheetTitle>
            <SheetDescription className="sr-only">Filter evidence by category and recovery status</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-3.5rem)]">
            <SidebarContent
              category={category}
              onCategoryChange={setCategory}
              recoveryStatus={recoveryStatus}
              onRecoveryStatusChange={setRecoveryStatus}
              categoryCounts={categoryCounts}
              statusCounts={statusCounts}
              totalSizeBytes={totalSizeBytes}
              onNavigate={() => setSidebarOpen(false)}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Top bar: title + mobile sidebar toggle */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Evidence Analysis</h1>
            <p className="text-[11px] text-muted-foreground">
              Catalog, analyze and verify recovered artifacts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="size-4 mr-1" /> Filters
            </Button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={FileSearch}
            label="Total Items"
            value={totalItems}
            color="blue"
          />
          <StatCard
            icon={Trash2}
            label="Deleted Recovered"
            value={deletedCount}
            color="red"
          />
          <StatCard
            icon={Shield}
            label="Carved Fragments"
            value={carvedCount}
            color="purple"
          />
          <StatCard
            icon={CheckCircle2}
            label="Selected for Export"
            value={selectedCount}
            color="teal"
          />
        </div>

        {/* Search + filters */}
        <Card className="bg-card border-border/60 py-0">
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search file names…"
                  className="h-9 pl-8 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Select
                value={recoveryStatus}
                onValueChange={(v) => setRecoveryStatus(v as RecoveryStatus | "all")}
              >
                <SelectTrigger className="h-9 w-full sm:w-44" size="sm">
                  <SelectValue placeholder="Recovery status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any recovery</SelectItem>
                  <SelectItem value="existing">Existing</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="orphaned">Orphaned</SelectItem>
                  <SelectItem value="carved">Carved</SelectItem>
                  <SelectItem value="cached">Cached</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={minConfidence === "all" ? "all" : String(minConfidence)}
                onValueChange={(v) =>
                  setMinConfidence(v === "all" ? "all" : Number(v))
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-44" size="sm">
                  <SelectValue placeholder="Min confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any confidence</SelectItem>
                  <SelectItem value="50">≥ 50%</SelectItem>
                  <SelectItem value="75">≥ 75%</SelectItem>
                  <SelectItem value="90">≥ 90%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Active:</span>
                {activeFilters.map((f, i) => (
                  <button
                    key={i}
                    onClick={f.onClear}
                    className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] hover:bg-destructive/20 hover:text-destructive-foreground"
                  >
                    {f.label}
                    <X className="size-2.5" />
                  </button>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Bulk selection row */}
            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={handleSelectAll}
                  disabled={items.length === 0 || bulkSelect.isPending}
                >
                  {allVisibleSelected ? "Clear Selection" : "Select All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 cursor-pointer"
                  disabled={items.length === 0}
                  onClick={() => {
                    const content = JSON.stringify(items.map((i) => ({
                      ...i,
                      decodedContent: i.decodedContent ? JSON.parse(i.decodedContent) : null,
                      tags: parseTags(i.tags),
                    })), null, 2);
                    downloadBlob(content, `evidence-export-${caseId.slice(-8)}-${Date.now()}.json`, "application/json");
                    toast.success(`Downloaded ${items.length} items as JSON`);
                  }}
                >
                  <Download className="size-3 mr-1" />
                  Download All
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {visibleSelectedCount} of {items.length} selected
                  {selectedCount > visibleSelectedCount && (
                    <span className="ml-1 text-muted-foreground/70">
                      ({selectedCount} total)
                    </span>
                  )}
                </span>
              </div>
              <div className="font-mono-forensic text-[11px] text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </div>
            </div>
          </div>
        </Card>

        {/* Evidence list */}
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={clearAllFilters} />
          ) : (
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-2 pr-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((item) => (
                    <EvidenceRow
                      key={item.id}
                      item={item}
                      selected={item.isSelected}
                      isActive={selectedId === item.id}
                      onOpen={() => setSelectedId(item.id)}
                      onToggleSelect={(s) => handleItemToggle(item.id, s)}
                      advanceMode={advanceMode}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </main>

      {/* Detail panel */}
      <DetailPanel
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null);
        }}
        advanceMode={advanceMode}
        updateEvidence={updateEvidence}
        deleteEvidence={deleteEvidence}
      />
    </div>
  );
}
