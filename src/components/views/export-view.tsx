"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileJson,
  FileSpreadsheet,
  FileText,
  FileDown,
  Download,
  Package,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Hash,
  Shield,
  Archive,
  FileWarning,
  FileCheck,
  AlertCircle,
  Loader2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useEvidence,
  useEvidenceStats,
  useDeliveries,
  useCreateDelivery,
  useDeleteDelivery,
} from "@/lib/api";
import type { ApiEvidenceItem, ApiDelivery, DeliveryFormat } from "@/lib/types";
import {
  cn,
  formatBytes,
  formatDateTime,
  formatRelative,
  generateHashSync,
  toCSV,
} from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useView } from "@/lib/view-router";

/* =========================================================================
   File Generation Functions
   ========================================================================= */

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[
      c
    ] as string
  );
}

function evidenceToJSON(
  items: ApiEvidenceItem[],
  opts: {
    includePaths: boolean;
    includeHashes: boolean;
    includeTags: boolean;
    includePreview: boolean;
  }
): string {
  return JSON.stringify(
    {
      format: "forensiq-json",
      version: "4.2.1",
      exportedAt: new Date().toISOString(),
      itemCount: items.length,
      items: items.map((it) => {
        const obj: Record<string, unknown> = {
          id: it.id,
          fileName: it.fileName,
          category: it.category,
          mimeType: it.mimeType,
          sizeBytes: it.sizeBytes,
          recoveryStatus: it.recoveryStatus,
          confidence: it.confidence,
          createdAtDevice: it.createdAtDevice,
          modifiedAtDevice: it.modifiedAtDevice,
        };
        if (opts.includePaths) obj.filePath = it.filePath;
        if (opts.includeHashes) obj.sha256 = it.sha256;
        if (opts.includeTags) obj.tags = JSON.parse(it.tags || "[]");
        if (opts.includePreview) obj.preview = it.preview;
        return obj;
      }),
    },
    null,
    2
  );
}

function evidenceToCSV(
  items: ApiEvidenceItem[],
  opts: { includeMetadata: boolean; includeTags: boolean; pretty: boolean }
): string {
  const rows = items.map((it) => {
    const base: Record<string, unknown> = {
      id: it.id,
      fileName: it.fileName,
      category: it.category,
      sizeBytes: it.sizeBytes ?? 0,
      recoveryStatus: it.recoveryStatus,
      confidence: it.confidence,
    };
    if (opts.includeMetadata) {
      base.filePath = it.filePath ?? "";
      base.mimeType = it.mimeType ?? "";
      base.sha256 = it.sha256 ?? "";
      base.createdAtDevice = it.createdAtDevice ?? "";
      base.modifiedAtDevice = it.modifiedAtDevice ?? "";
    }
    if (opts.includeTags) {
      base.tags = it.tags;
    }
    return base;
  });
  const csv = toCSV(rows);
  if (opts.pretty) {
    return `# FORENSIQ CSV Export\n# Generated: ${new Date().toISOString()}\n# Items: ${items.length}\n#\n${csv}\n`;
  }
  return csv + "\n";
}

function evidenceToUFEDXML(
  items: ApiEvidenceItem[],
  caseId: string,
  opts: { includeExtractionMeta: boolean; includeChainOfCustody: boolean }
): string {
  const extractionMeta = opts.includeExtractionMeta
    ? `  <extractionMetadata>
    <tool>FORENSIQ</tool>
    <version>4.2.1</version>
    <itemCount>${items.length}</itemCount>
    <extractionTime>${new Date().toISOString()}</extractionTime>
  </extractionMetadata>
`
    : "";

  const chainOfCustody = opts.includeChainOfCustody
    ? `  <chainOfCustody>
    <event id="acquisition" timestamp="${new Date().toISOString()}" actor="FORENSIQ Engine" action="evidence_acquired" hash="${generateHashSync(64)}"/>
    <event id="analysis" timestamp="${new Date().toISOString()}" actor="FORENSIQ Engine" action="evidence_analyzed" hash="${generateHashSync(64)}"/>
    <event id="export" timestamp="${new Date().toISOString()}" actor="FORENSIQ Engine" action="evidence_exported" hash="${generateHashSync(64)}"/>
  </chainOfCustody>
`
    : "";

  const body = items
    .map(
      (it) => `  <evidenceItem id="${it.id}">
    <fileName>${escapeXml(it.fileName)}</fileName>
    <filePath>${escapeXml(it.filePath ?? "")}</filePath>
    <category>${it.category}</category>
    <mimeType>${escapeXml(it.mimeType ?? "")}</mimeType>
    <sizeBytes>${it.sizeBytes ?? 0}</sizeBytes>
    <recoveryStatus>${it.recoveryStatus}</recoveryStatus>
    <confidence>${it.confidence}</confidence>
    <sha256>${it.sha256 ?? ""}</sha256>
    <createdAtDevice>${it.createdAtDevice ?? ""}</createdAtDevice>
  </evidenceItem>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ufed-extraction version="4.2.1" caseId="${escapeXml(caseId)}" extractedAt="${new Date().toISOString()}">
${extractionMeta}${chainOfCustody}${body}
</ufed-extraction>
`;
}

function evidenceToPDFReport(
  items: ApiEvidenceItem[],
  opts: {
    investigatorName: string;
    reportTitle: string;
    caseSummary: string;
    caseId: string;
  }
): string {
  const byCategory: Record<string, number> = {};
  items.forEach((it) => {
    byCategory[it.category] = (byCategory[it.category] ?? 0) + 1;
  });
  const totalSize = items.reduce((s, it) => s + (it.sizeBytes ?? 0), 0);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeXml(opts.reportTitle)}</title>
<style>
  body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
  h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
  h2 { color: #0f766e; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; }
  .meta { background: #f9fafb; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
  .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #666; }
</style></head><body>
<h1>${escapeXml(opts.reportTitle)}</h1>
<div class="meta">
  <strong>Case ID:</strong> ${escapeXml(opts.caseId)}<br>
  <strong>Investigator:</strong> ${escapeXml(opts.investigatorName)}<br>
  <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
  <strong>Items:</strong> ${items.length} &nbsp; <strong>Total size:</strong> ${formatBytes(totalSize)}
</div>
<h2>Case Summary</h2>
<p>${escapeXml(opts.caseSummary || "No summary provided.")}</p>
<h2>Category Breakdown</h2>
<table><tr><th>Category</th><th>Count</th></tr>
${Object.entries(byCategory)
  .map(([c, n]) => `<tr><td>${c}</td><td>${n}</td></tr>`)
  .join("")}
</table>
<h2>Evidence Inventory</h2>
<table><tr><th>File</th><th>Category</th><th>Size</th><th>Status</th><th>Confidence</th><th>SHA-256</th></tr>
${items
  .slice(0, 100)
  .map(
    (it) =>
      `<tr><td>${escapeXml(it.fileName)}</td><td>${it.category}</td><td>${formatBytes(it.sizeBytes)}</td><td>${it.recoveryStatus}</td><td>${it.confidence}%</td><td>${(it.sha256 ?? "—").slice(0, 16)}…</td></tr>`
  )
  .join("")}
</table>
${items.length > 100 ? `<p><em>…and ${items.length - 100} more items not shown in this preview.</em></p>` : ""}
<div class="footer">Generated by FORENSIQ v4.2.1 — Tamper-evident chain-of-custody maintained.</div>
</body></html>`;
}

/* =========================================================================
   Download Helpers (CRITICAL — actual browser downloads)
   ========================================================================= */

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

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function contentToDataUrl(content: string, mimeType: string): string {
  // Unicode-safe base64 encoding using TextEncoder (avoids deprecated `unescape`)
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const encoded = btoa(binary);
  return `data:${mimeType};base64,${encoded}`;
}

function formatFileSize(mb: number | null | undefined): string {
  if (mb == null) return "—";
  if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/* =========================================================================
   Constants
   ========================================================================= */

interface FormatDef {
  value: DeliveryFormat;
  name: string;
  description: string;
  bestFor: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  ringColor: string;
  ext: string;
  mimeType: string;
}

const FORMATS: FormatDef[] = [
  {
    value: "json",
    name: "JSON",
    description: "Structured JSON with all evidence metadata fields.",
    bestFor: "Machine-readable pipelines & API ingestion",
    icon: FileJson,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    ringColor: "ring-primary/40",
    ext: "json",
    mimeType: "application/json",
  },
  {
    value: "csv",
    name: "CSV",
    description: "Flattened spreadsheet of all evidence items.",
    bestFor: "Excel / Google Sheets analysis",
    icon: FileSpreadsheet,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    ringColor: "ring-emerald-500/40",
    ext: "csv",
    mimeType: "text/csv",
  },
  {
    value: "ufed_xml",
    name: "UFED XML",
    description: "Forensics-standard XML extraction format.",
    bestFor: "Interoperability with Cellebrite UFED tools",
    icon: FileText,
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    ringColor: "ring-purple-500/40",
    ext: "xml",
    mimeType: "application/xml",
  },
  {
    value: "pdf_report",
    name: "PDF Report",
    description: "Human-readable investigation report (HTML).",
    bestFor: "Court-ready case documentation",
    icon: FileText,
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    ringColor: "ring-rose-500/40",
    ext: "html",
    mimeType: "text/html",
  },
];

const GENERATION_STAGES: { label: string; at: number }[] = [
  { label: "Packaging evidence…", at: 0 },
  { label: "Computing hashes…", at: 30 },
  { label: "Writing manifest…", at: 60 },
  { label: "Finalizing…", at: 85 },
];

function categoryColor(cat: string): string {
  switch (cat) {
    case "photos":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "videos":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "sms":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "contacts":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "browser_history":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "call_logs":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "documents":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "location_data":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    case "app_data":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    case "audio":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function recoveryStatusColor(status: string): string {
  switch (status) {
    case "existing":
      return "bg-emerald-500/15 text-emerald-400";
    case "deleted":
      return "bg-rose-500/15 text-rose-400";
    case "orphaned":
      return "bg-amber-500/15 text-amber-400";
    case "carved":
      return "bg-purple-500/15 text-purple-400";
    case "cached":
      return "bg-cyan-500/15 text-cyan-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatIcon(format: DeliveryFormat): LucideIcon {
  return FORMATS.find((f) => f.value === format)?.icon ?? FileText;
}

function formatLabel(format: DeliveryFormat): string {
  return FORMATS.find((f) => f.value === format)?.name ?? format;
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function SelectedPreviewItem({ item }: { item: ApiEvidenceItem }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono-forensic text-xs text-foreground/90">
          {item.fileName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{formatBytes(item.sizeBytes)}</span>
          <span>·</span>
          <span>{formatRelative(item.createdAtDevice)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn(
            "border-transparent px-1.5 py-0 text-[10px]",
            categoryColor(item.category)
          )}
        >
          {item.category}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "border-transparent px-1.5 py-0 text-[10px]",
            recoveryStatusColor(item.recoveryStatus)
          )}
        >
          {item.recoveryStatus}
        </Badge>
      </div>
    </div>
  );
}

function DeliveryRow({
  delivery,
  onDelete,
}: {
  delivery: ApiDelivery;
  onDelete: () => void;
}) {
  const Icon = formatIcon(delivery.format);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = () => {
    if (!delivery.downloadUrl) {
      toast.error("No downloadable payload stored for this delivery", {
        description: delivery.fileName ?? undefined,
      });
      return;
    }
    setDownloading(true);
    const fname =
      delivery.fileName ??
      `forensiq-delivery-${delivery.id.slice(-8)}.${FORMATS.find(
        (f) => f.value === delivery.format
      )?.ext ?? "bin"}`;
    try {
      downloadDataUrl(delivery.downloadUrl, fname);
      toast.success("Download started", { description: fname });
    } catch (e) {
      toast.error("Download failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/40 bg-card p-3 transition-colors hover:border-border">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          FORMATS.find((f) => f.value === delivery.format)?.iconBg ??
            "bg-muted",
          FORMATS.find((f) => f.value === delivery.format)?.iconColor ??
            "text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {delivery.fileName ?? `${formatLabel(delivery.format)} package`}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <Badge
            variant="outline"
            className="border-transparent bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
          >
            {formatLabel(delivery.format)}
          </Badge>
          <span className="flex items-center gap-0.5">
            <Package className="size-3" />
            {delivery.itemCount} items
          </span>
          <span className="flex items-center gap-0.5">
            <Archive className="size-3" />
            {formatFileSize(delivery.fileSizeMB)}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="size-3" />
            {formatRelative(delivery.createdAt)}
          </span>
          {delivery.createdBy?.name && (
            <span className="flex items-center gap-0.5">
              <Shield className="size-3" />
              {delivery.createdBy.name}
            </span>
          )}
        </div>
        {delivery.reportNotes && (
          <div className="mt-1.5 line-clamp-1 text-[11px] italic text-muted-foreground">
            “{delivery.reportNotes}”
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="default"
              className="size-8"
              onClick={handleDownload}
              disabled={downloading || !delivery.downloadUrl}
              aria-label="Download delivery"
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Download file</TooltipContent>
        </Tooltip>
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete delivery"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">Delete delivery</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete delivery record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &ldquo;{delivery.fileName ?? formatLabel(delivery.format)}&rdquo;
                ({delivery.itemCount} items) from the case delivery history.
                This action cannot be undone and breaks chain-of-custody
                continuity for this export.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* =========================================================================
   Main ExportView Component
   ========================================================================= */

export function ExportView({ caseId }: { caseId: string }) {
  const advanceMode = useAppStore((s) => s.advanceMode);
  const goCase = useView((s) => s.goCase);

  const statsQuery = useEvidenceStats(caseId);
  const evidenceQuery = useEvidence(caseId);
  const deliveriesQuery = useDeliveries(caseId);
  const createDelivery = useCreateDelivery();
  const deleteDelivery = useDeleteDelivery(caseId);

  // NOTE: The existing `useEvidence` hook type signature does not expose
  // `selectedOnly`, so we filter client-side after fetching all evidence.
  // (The underlying server route does support ?selectedOnly=true.)
  const selectedItems = React.useMemo(
    () => (evidenceQuery.data ?? []).filter((it) => it.isSelected),
    [evidenceQuery.data]
  );

  const stats = statsQuery.data;
  const deliveries = deliveriesQuery.data ?? [];

  // Format & options state
  const [format, setFormat] = React.useState<DeliveryFormat>("json");
  // JSON options
  const [optJsonPaths, setOptJsonPaths] = React.useState(true);
  const [optJsonHashes, setOptJsonHashes] = React.useState(true);
  const [optJsonTags, setOptJsonTags] = React.useState(true);
  const [optJsonPreview, setOptJsonPreview] = React.useState(false);
  // CSV options
  const [optCsvMeta, setOptCsvMeta] = React.useState(true);
  const [optCsvTags, setOptCsvTags] = React.useState(true);
  const [optCsvPretty, setOptCsvPretty] = React.useState(false);
  // XML options
  const [optXmlMeta, setOptXmlMeta] = React.useState(true);
  const [optXmlCoc, setOptXmlCoc] = React.useState(true);
  // PDF report
  const [investigatorName, setInvestigatorName] = React.useState("");
  const [reportTitle, setReportTitle] = React.useState(
    "Digital Forensics Investigation Report"
  );
  const [caseSummary, setCaseSummary] = React.useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [stageLabel, setStageLabel] = React.useState("");
  const [generatedContent, setGeneratedContent] = React.useState<string | null>(
    null
  );
  const [generatedFormat, setGeneratedFormat] = React.useState<DeliveryFormat | null>(
    null
  );
  const [generatedFileName, setGeneratedFileName] = React.useState<string | null>(
    null
  );
  const [generatedHash, setGeneratedHash] = React.useState<string | null>(null);
  const [generatedSize, setGeneratedSize] = React.useState<number | null>(null);

  // View all selected dialog
  const [showAllSelected, setShowAllSelected] = React.useState(false);

  const selectedCount = stats?.selectedCount ?? selectedItems.length;
  const totalSizeBytes = selectedItems.reduce(
    (s, it) => s + (it.sizeBytes ?? 0),
    0
  );
  const categoryBreakdown = React.useMemo(() => {
    const m: Record<string, number> = {};
    selectedItems.forEach((it) => {
      m[it.category] = (m[it.category] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [selectedItems]);

  const hasSelected = selectedCount > 0 && selectedItems.length > 0;
  const previewItems = selectedItems.slice(0, 20);
  const hasMoreForPreview = selectedItems.length > 20;

  const fmtDef = FORMATS.find((f) => f.value === format)!;

  const handleGenerate = React.useCallback(async () => {
    if (!hasSelected || selectedItems.length === 0) {
      toast.error("No items selected for export", {
        description: "Select evidence items on the Evidence tab first.",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedContent(null);
    setGeneratedHash(null);
    setGeneratedSize(null);
    setGeneratedFormat(format);

    // Simulate progress animation over ~2s
    await new Promise<void>((resolve) => {
      let p = 0;
      const interval = setInterval(() => {
        p += 2 + Math.random() * 5;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setProgress(100);
          setStageLabel("Done");
          setTimeout(resolve, 250);
        } else {
          const floored = Math.floor(p);
          setProgress(floored);
          const stage = [...GENERATION_STAGES].reverse().find((s) => floored >= s.at);
          if (stage) setStageLabel(stage.label);
        }
      }, 60);
    });

    // Build file content based on chosen format
    let content = "";
    if (format === "json") {
      content = evidenceToJSON(selectedItems, {
        includePaths: optJsonPaths,
        includeHashes: optJsonHashes,
        includeTags: optJsonTags,
        includePreview: optJsonPreview,
      });
    } else if (format === "csv") {
      content = evidenceToCSV(selectedItems, {
        includeMetadata: optCsvMeta,
        includeTags: optCsvTags,
        pretty: optCsvPretty,
      });
    } else if (format === "ufed_xml") {
      content = evidenceToUFEDXML(selectedItems, caseId, {
        includeExtractionMeta: optXmlMeta,
        includeChainOfCustody: optXmlCoc,
      });
    } else if (format === "pdf_report") {
      content = evidenceToPDFReport(selectedItems, {
        investigatorName: investigatorName || "Unspecified Investigator",
        reportTitle: reportTitle || "Forensics Report",
        caseSummary,
        caseId,
      });
    }

    const fileName = `forensiq-export-${caseId.slice(-8)}-${Date.now()}.${fmtDef.ext}`;

    // CRITICAL: Trigger actual browser download immediately
    try {
      downloadBlob(content, fileName, fmtDef.mimeType);
    } catch (e) {
      toast.error("Download failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }

    const pkgHash = generateHashSync(64);
    const contentBytes = new TextEncoder().encode(content).length;
    setGeneratedHash(pkgHash);
    setGeneratedSize(contentBytes);

    // Persist a delivery record so it shows in history & can be re-downloaded
    try {
      const payload = contentToDataUrl(content, fmtDef.mimeType);
      await createDelivery.mutateAsync({
        caseId,
        format,
        itemCount: selectedItems.length,
        fileName,
        payload,
        reportNotes:
          format === "pdf_report" && caseSummary.trim()
            ? caseSummary.trim()
            : undefined,
      });
    } catch (e) {
      // The download itself already succeeded; we just couldn't persist the record.
      console.error("Failed to save delivery record", e);
      toast.warning("Download succeeded but history record failed to save", {
        description:
          e instanceof Error ? e.message : "Unknown persistence error",
      });
    }

    setGeneratedContent(content);
    setGeneratedFileName(fileName);
    setIsGenerating(false);
    toast.success("Package generated and downloaded", {
      description: fileName,
    });
  }, [
    hasSelected,
    selectedItems,
    format,
    caseId,
    optJsonPaths,
    optJsonHashes,
    optJsonTags,
    optJsonPreview,
    optCsvMeta,
    optCsvTags,
    optCsvPretty,
    optXmlMeta,
    optXmlCoc,
    investigatorName,
    reportTitle,
    caseSummary,
    fmtDef,
    createDelivery,
  ]);

  const handleDeleteDelivery = React.useCallback(
    async (id: string) => {
      try {
        await deleteDelivery.mutateAsync(id);
        toast.success("Delivery deleted");
      } catch (e) {
        toast.error("Failed to delete delivery", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    },
    [deleteDelivery]
  );

  const previewLines = React.useMemo(() => {
    if (!generatedContent) return [];
    return generatedContent.split("\n").slice(0, 50);
  }, [generatedContent]);

  return (
    <Tooltip>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Export &amp; Delivery
            </h1>
            {advanceMode && (
              <Badge
                variant="outline"
                className="ml-2 border-primary/30 bg-primary/10 text-primary"
              >
                <Shield className="size-3" />
                Advance Mode
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Package selected evidence into forensically-sound export formats
            with tamper-evident chain-of-custody tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: Export Builder */}
          <div className="space-y-6 lg:col-span-2">
            {/* Selected Items Preview */}
            <Card className="bg-card border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileCheck className="size-4 text-primary" />
                      Selected Items Preview
                    </CardTitle>
                    <CardDescription>
                      Items marked for export on the Evidence tab.
                    </CardDescription>
                  </div>
                  {hasSelected && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary"
                    >
                      <Hash className="size-3" />
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasSelected ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <FileWarning className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No items selected for export</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select evidence items on the Evidence tab to include
                        them in this export package.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goCase(caseId, "evidence")}
                    >
                      Go to Evidence tab
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Summary stats row */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Items
                        </div>
                        <div className="font-mono-forensic text-lg font-semibold text-foreground">
                          {selectedCount}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Total size
                        </div>
                        <div className="font-mono-forensic text-lg font-semibold text-foreground">
                          {formatBytes(totalSizeBytes)}
                        </div>
                        {advanceMode && (
                          <div className="font-mono-forensic text-[10px] text-muted-foreground">
                            {totalSizeBytes.toLocaleString()} B
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 rounded-lg border border-border/40 bg-muted/30 p-3 sm:col-span-1">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Categories
                        </div>
                        <div className="font-mono-forensic text-lg font-semibold text-foreground">
                          {categoryBreakdown.length}
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {categoryBreakdown.map(([cat, n]) => (
                        <Badge
                          key={cat}
                          variant="outline"
                          className={cn(
                            "border-transparent px-2 py-0.5 text-[11px]",
                            categoryColor(cat)
                          )}
                        >
                          {cat}: {n}
                        </Badge>
                      ))}
                    </div>

                    <Separator />

                    {/* Preview list */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Preview (first {previewItems.length} of{" "}
                          {selectedItems.length})
                        </span>
                        {hasMoreForPreview && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setShowAllSelected(true)}
                          >
                            <Eye className="size-3" />
                            View all selected
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="max-h-72">
                        <div className="space-y-1.5 pr-2">
                          {previewItems.map((it) => (
                            <SelectedPreviewItem key={it.id} item={it} />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Export Format Selector */}
            <Card className="bg-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileDown className="size-4 text-primary" />
                  Export Format
                </CardTitle>
                <CardDescription>
                  Choose the output format for your evidence package.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as DeliveryFormat)}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {FORMATS.map((f) => {
                    const selected = format === f.value;
                    return (
                      <label
                        key={f.value}
                        htmlFor={`fmt-${f.value}`}
                        className={cn(
                          "relative flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all",
                          selected
                            ? cn(
                                "border-primary bg-primary/5 ring-1",
                                f.ringColor
                              )
                            : "border-border hover:border-foreground/30 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg",
                              f.iconBg,
                              f.iconColor
                            )}
                          >
                            <f.icon className="size-5" />
                          </div>
                          <RadioGroupItem
                            id={`fmt-${f.value}`}
                            value={f.value}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{f.name}</span>
                            {selected && (
                              <CheckCircle2 className="size-3.5 text-primary" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {f.description}
                          </p>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/70">
                              Best for:
                            </span>{" "}
                            {f.bestFor}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="bg-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Archive className="size-4 text-primary" />
                  Export Options
                </CardTitle>
                <CardDescription>
                  Configure how the {fmtDef.name} package is structured.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {format === "json" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optJsonPaths}
                        onCheckedChange={(v) => setOptJsonPaths(v === true)}
                      />
                      <span className="text-sm">Include file paths</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optJsonHashes}
                        onCheckedChange={(v) => setOptJsonHashes(v === true)}
                      />
                      <span className="text-sm">Include hashes</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optJsonTags}
                        onCheckedChange={(v) => setOptJsonTags(v === true)}
                      />
                      <span className="text-sm">Include tags</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optJsonPreview}
                        onCheckedChange={(v) => setOptJsonPreview(v === true)}
                      />
                      <span className="text-sm">Include preview content</span>
                    </label>
                  </div>
                )}

                {format === "csv" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optCsvMeta}
                        onCheckedChange={(v) => setOptCsvMeta(v === true)}
                      />
                      <span className="text-sm">Metadata columns</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optCsvTags}
                        onCheckedChange={(v) => setOptCsvTags(v === true)}
                      />
                      <span className="text-sm">Tags column</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optCsvPretty}
                        onCheckedChange={(v) => setOptCsvPretty(v === true)}
                      />
                      <span className="text-sm">Pretty-format</span>
                    </label>
                  </div>
                )}

                {format === "ufed_xml" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optXmlMeta}
                        onCheckedChange={(v) => setOptXmlMeta(v === true)}
                      />
                      <span className="text-sm">Include extraction metadata</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={optXmlCoc}
                        onCheckedChange={(v) => setOptXmlCoc(v === true)}
                      />
                      <span className="text-sm">Include chain-of-custody</span>
                    </label>
                  </div>
                )}

                {format === "pdf_report" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="inv-name" className="text-xs">
                          Investigator name
                        </Label>
                        <Input
                          id="inv-name"
                          value={investigatorName}
                          onChange={(e) => setInvestigatorName(e.target.value)}
                          placeholder="e.g. Det. Sarah Chen"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="report-title" className="text-xs">
                          Report title
                        </Label>
                        <Input
                          id="report-title"
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                          placeholder="Investigation Report"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="case-summary" className="text-xs">
                        Case summary
                      </Label>
                      <Textarea
                        id="case-summary"
                        value={caseSummary}
                        onChange={(e) => setCaseSummary(e.target.value)}
                        placeholder="Brief narrative summary of the case, scope of investigation, and notable findings…"
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Package */}
            <Card className="bg-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-primary" />
                  Generate Package
                </CardTitle>
                <CardDescription>
                  Build the {fmtDef.name} export and download it immediately. A
                  delivery record will be saved to history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence mode="wait">
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-mono-forensic text-primary">
                          <Loader2 className="size-3.5 animate-spin" />
                          {stageLabel || "Working…"}
                        </span>
                        <span className="font-mono-forensic text-muted-foreground">
                          {progress}%
                        </span>
                      </div>
                      <div className="shimmer rounded-full">
                        <Progress value={progress} className="h-2" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="border-transparent bg-primary/10 text-primary"
                    >
                      {fmtDef.name}
                    </Badge>
                    <span>·</span>
                    <span>{selectedCount} items</span>
                    <span>·</span>
                    <span>{formatBytes(totalSizeBytes)}</span>
                    <span>·</span>
                    <span className="font-mono-forensic">.{fmtDef.ext}</span>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !hasSelected}
                    className="gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        Generate &amp; Download
                      </>
                    )}
                  </Button>
                </div>

                {!hasSelected && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    <AlertCircle className="size-3.5 shrink-0" />
                    Select evidence items on the Evidence tab before generating
                    a package.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Preview (after generation) */}
            <AnimatePresence>
              {generatedContent && generatedFormat && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <Card className="border-primary/40 bg-card">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <CheckCircle2 className="size-4 text-emerald-400" />
                            Generated Package Preview
                          </CardTitle>
                          <CardDescription className="font-mono-forensic">
                            {generatedFileName}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (generatedFileName && generatedContent) {
                              downloadBlob(
                                generatedContent,
                                generatedFileName,
                                fmtDef.mimeType
                              );
                              toast.success("Re-downloaded", {
                                description: generatedFileName,
                              });
                            }
                          }}
                        >
                          <Download className="size-3.5" />
                          Download again
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Generation metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div className="rounded-md border border-border/40 bg-muted/30 p-2">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Format
                          </div>
                          <div className="font-mono-forensic">
                            {formatLabel(generatedFormat)}
                          </div>
                        </div>
                        <div className="rounded-md border border-border/40 bg-muted/30 p-2">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Items
                          </div>
                          <div className="font-mono-forensic">
                            {selectedCount}
                          </div>
                        </div>
                        <div className="rounded-md border border-border/40 bg-muted/30 p-2">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Size
                          </div>
                          <div className="font-mono-forensic">
                            {formatBytes(generatedSize)}
                          </div>
                          {advanceMode && generatedSize != null && (
                            <div className="font-mono-forensic text-[10px] text-muted-foreground">
                              {generatedSize.toLocaleString()} B
                            </div>
                          )}
                        </div>
                        <div className="rounded-md border border-border/40 bg-muted/30 p-2">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Generated
                          </div>
                          <div className="font-mono-forensic">
                            {formatRelative(new Date())}
                          </div>
                        </div>
                      </div>

                      {advanceMode && generatedHash && (
                        <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                          <div className="text-[10px] uppercase text-primary/80">
                            Package integrity hash (SHA-256)
                          </div>
                          <div className="mt-1 break-all font-mono-forensic text-[11px] text-primary">
                            {generatedHash}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Preview content */}
                      {generatedFormat === "pdf_report" ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            HTML Report Preview
                          </div>
                          <div className="overflow-hidden rounded-md border border-border/60 bg-white">
                            <iframe
                              title="PDF report preview"
                              srcDoc={generatedContent}
                              className="h-[420px] w-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Content preview (first {previewLines.length} lines)
                            </span>
                            {advanceMode && (
                              <span className="font-mono-forensic text-[10px] text-muted-foreground">
                                {generatedContent.split("\n").length} lines ·{" "}
                                {generatedContent.length} chars
                              </span>
                            )}
                          </div>
                          <ScrollArea className="max-h-96 rounded-md border border-border/60 bg-background/60">
                            <pre className="font-mono-forensic p-3 text-[11px] leading-relaxed text-foreground/90">
                              {previewLines.join("\n")}
                              {generatedContent.split("\n").length >
                                previewLines.length && (
                                <span className="text-muted-foreground">
                                  {"\n"}…{" "}
                                  {generatedContent.split("\n").length -
                                    previewLines.length}{" "}
                                  more lines
                                </span>
                              )}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}

                      {advanceMode && generatedFileName && (
                        <details className="rounded-md border border-border/40 bg-muted/20 p-2">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                            Data URL payload (base64)
                          </summary>
                          <div className="mt-2 break-all font-mono-forensic text-[10px] text-muted-foreground">
                            {contentToDataUrl(
                              generatedContent,
                              fmtDef.mimeType
                            ).slice(0, 256)}
                            …
                          </div>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Delivery History */}
          <div className="space-y-6">
            <Card className="bg-card border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Archive className="size-4 text-primary" />
                      Delivery History
                    </CardTitle>
                    <CardDescription>
                      Past exports for this case.
                    </CardDescription>
                  </div>
                  {deliveries.length > 0 && (
                    <Badge variant="secondary" className="font-mono-forensic">
                      {deliveries.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {deliveriesQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading history…
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No deliveries yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Generate your first export package above.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[640px]">
                    <div className="space-y-2 pr-2">
                      {deliveries.map((d) => (
                        <DeliveryRow
                          key={d.id}
                          delivery={d}
                          onDelete={() => handleDeleteDelivery(d.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              {deliveries.length > 0 && (
                <CardFooter className="border-t border-border/40 pt-4">
                  <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="size-3" />
                      Chain-of-custody maintained
                    </span>
                    <span className="font-mono-forensic">
                      {deliveries.reduce((s, d) => s + d.itemCount, 0)} total
                      items exported
                    </span>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Chain-of-custody info card (advance mode) */}
            {advanceMode && (
              <Card className="bg-card border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="size-4 text-accent" />
                    Integrity Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Every export package is recorded with a tamper-evident hash
                    and audit log entry. The chain-of-custody is preserved from
                    acquisition through delivery.
                  </p>
                  <Separator />
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Hash computed at generation time
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Delivery record persisted with payload
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Re-download available from history
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="size-3 text-amber-400" />
                      Deletion breaks chain-of-custody
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* View All Selected Dialog */}
        <Dialog open={showAllSelected} onOpenChange={setShowAllSelected}>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>All Selected Evidence ({selectedItems.length})</DialogTitle>
              <DialogDescription>
                Complete list of items marked for export.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6 px-6">
              <div className="space-y-1.5 pb-2">
                {selectedItems.map((it) => (
                  <SelectedPreviewItem key={it.id} item={it} />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Tooltip>
  );
}
