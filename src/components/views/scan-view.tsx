"use client";

/* FORENSIQ — Scanning Engine & Live Dashboard (Milestone 3)
 * Task ID 6 — full-stack-developer (scan view)
 *
 * Two-tab layout: Live Dashboard + Scan History.
 * Drives the simulated 4-stage scan engine via the /tick endpoint,
 * renders an animated pipeline, progress bar, stat cards, system gauges,
 * and a terminal-style live log panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, animate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cpu,
  Database,
  FileCheck2,
  FileOutput,
  FileSearch,
  HardDrive,
  History,
  Loader2,
  type LucideIcon,
  Play,
  Radio,
  RefreshCw,
  Scissors,
  Search,
  Square,
  Terminal,
} from "lucide-react";

import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  useCancelScan,
  useDevices,
  useScanSession,
  useScanSessions,
  useStartScan,
} from "@/lib/api";
import type { ApiScanSession, ScanStage, ScanStatus } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ============================================================ *
 * Constants & metadata
 * ============================================================ */

const STAGES: ScanStage[] = ["analysis", "discovery", "parsing", "carving"];

interface StageMeta {
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
}

const STAGE_META: Record<ScanStage, StageMeta> = {
  analysis: {
    label: "Analysis",
    short: "Analysis",
    description: "Reading partition tables, file-system metadata, and journal entries.",
    icon: Search,
  },
  discovery: {
    label: "Discovery",
    short: "Discovery",
    description: "Cataloging existing files and identifying slack space and unallocated regions.",
    icon: FileSearch,
  },
  parsing: {
    label: "Parsing",
    short: "Parsing",
    description: "Decoding SQLite databases, plists, JSON manifests, and application containers.",
    icon: FileCheck2,
  },
  carving: {
    label: "Carving",
    short: "Carving",
    description: "Recovering deleted fragments via signature-based carving and slack-space analysis.",
    icon: Scissors,
  },
};

const STATUS_BADGE: Record<ScanStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border/60" },
  running: { label: "Running", className: "bg-primary/15 text-primary border-primary/40" },
  complete: { label: "Complete", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", className: "bg-muted/60 text-muted-foreground border-border/60" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/40" },
};

const TICK_INTERVAL_MS = 1000;

/* ============================================================ *
 * Hooks & small components
 * ============================================================ */

/** Animated numeric counter — renders a motion.span whose text eases toward `value`. */
function CountUp({
  value,
  duration = 0.7,
  className,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { duration, bounce: 0 });
  const display = useTransform(spring, (v) => format(Math.round(v)));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}

/* ============================================================ *
 * Helpers
 * ============================================================ */

/** Index of the active stage node. Returns STAGES.length (=4) when complete. */
function stageIndex(session: ApiScanSession | undefined): number {
  if (!session) return -1;
  if (session.status === "complete") return STAGES.length;
  if (session.stage && session.status !== "pending") {
    const idx = STAGES.indexOf(session.stage);
    return idx >= 0 ? idx : -1;
  }
  return -1;
}

function durationLabel(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((end - start) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function n(v: number | null | undefined): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

function deviceLabel(session: ApiScanSession | undefined): string {
  if (!session) return "—";
  if (session.device) {
    return `${session.device.name}` + (session.device.model ? ` · ${session.device.model}` : "");
  }
  return "Case-wide scan";
}

/* ============================================================ *
 * Sub-components
 * ============================================================ */

interface PipelineNodeProps {
  label: string;
  pct: number;
  state: "completed" | "active" | "upcoming";
  icon: LucideIcon;
  isLast?: boolean;
}

function PipelineNode({ label, pct, state, icon: Icon, isLast }: PipelineNodeProps) {
  const isCompleted = state === "completed";
  const isActive = state === "active";

  return (
    <div className="flex flex-1 flex-col items-center gap-2 min-w-[68px]">
      <div className="flex w-full items-center">
        {/* Node circle */}
        <div className="relative shrink-0">
          <motion.div
            initial={false}
            animate={{
              scale: isActive ? 1.05 : 1,
              borderColor: isCompleted
                ? "oklch(0.72 0.17 150)"
                : isActive
                  ? "oklch(0.62 0.18 245)"
                  : "oklch(0.35 0.02 250)",
              backgroundColor: isCompleted
                ? "oklch(0.35 0.10 150 / 0.25)"
                : isActive
                  ? "oklch(0.45 0.12 245 / 0.25)"
                  : "oklch(0.18 0.02 250 / 0.6)",
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2",
              isActive && "pulse-ring"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isCompleted ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </motion.div>
              ) : isActive ? (
                <motion.div
                  key="active"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                >
                  <Icon className="h-6 w-6 text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Icon className="h-6 w-6 text-muted-foreground/60" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Connecting line */}
        {!isLast && (
          <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-border/60">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/60"
              initial={false}
              animate={{ width: isCompleted ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <div
          className={cn(
            "text-[11px] font-medium uppercase tracking-wide",
            isActive ? "text-primary" : isCompleted ? "text-emerald-400" : "text-muted-foreground"
          )}
        >
          {label}
        </div>
        <div className="font-mono-forensic text-[10px] text-muted-foreground">
          {isCompleted ? "100%" : isActive ? `${pct}%` : "—"}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: "primary" | "teal" | "emerald" | "amber";
  hint?: string;
}

function StatCard({ icon: Icon, label, value, accent, hint }: StatCardProps) {
  const prev = useRef(value);
  const flashRef = useRef<HTMLDivElement>(null);

  const accentClasses: Record<StatCardProps["accent"], string> = {
    primary: "text-primary",
    teal: "text-[color:var(--teal)]",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  // Drive the flash overlay directly via framer-motion's animate() — no React state needed.
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    const el = flashRef.current;
    if (!el) return;
    el.style.opacity = "1";
    const controls = animate(1, 0, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => {
        if (flashRef.current) flashRef.current.style.opacity = String(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <Card className="bg-card border-border/60 py-4 gap-3 overflow-hidden relative">
      <div
        ref={flashRef}
        className={cn("absolute inset-x-0 top-0 h-0.5 opacity-0", accentClasses[accent])}
        style={{ backgroundColor: "currentColor" }}
      />
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono-forensic text-2xl font-semibold tabular-nums">
              <CountUp value={value} />
            </div>
            {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
          </div>
          <div className={cn("rounded-md bg-muted/40 p-2", accentClasses[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricGaugeProps {
  icon: LucideIcon;
  label: string;
  value: number; // 0-100
}

function MetricGauge({ icon: Icon, label, value }: MetricGaugeProps) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 80 ? "bg-destructive" : v >= 60 ? "bg-amber-500" : "bg-primary";
  const textColor =
    v >= 80 ? "text-destructive" : v >= 60 ? "text-amber-400" : "text-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className={cn("font-mono-forensic font-semibold tabular-nums", textColor)}>
          {Math.round(v)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={false}
          animate={{ width: `${v}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
  );
}

interface LogPanelProps {
  lines: string[];
  emptyMessage: string;
}

function LogPanel({ lines, emptyMessage }: LogPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={containerRef}
      className="terminal-scanline max-h-96 min-h-[200px] overflow-y-auto rounded-md border border-border/60 bg-black/40 p-3 font-mono text-xs leading-relaxed"
    >
      {lines.length === 0 ? (
        <div className="flex h-full min-h-[180px] items-center justify-center text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>{emptyMessage}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <LogLine key={`${i}-${line.slice(0, 12)}`} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogLine({ line }: { line: string }) {
  // Parse lines like "[ 0.089 ] partition: GPT header found at LBA 1, valid signature"
  const m = line.match(/^\[\s*([\d.]+)\s*\]\s*([^:]+):\s*(.*)$/);
  const ts = m ? m[1] : null;
  const source = m ? m[2] : null;
  const msg = m ? m[3] : line;

  const isDone = line.startsWith("[done]");
  const isError = /error|fail|fatal/i.test(line);

  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground/70">
        {ts ? `[${ts}]` : isDone ? "[done]" : "[ -- ]"}
      </span>
      {source && (
        <span className={cn("shrink-0 font-semibold", isError ? "text-destructive" : "text-[color:var(--teal)]")}>
          {source}:
        </span>
      )}
      <span className={cn("break-all", isDone ? "text-emerald-400 font-semibold" : isError ? "text-destructive" : "text-emerald-300/90")}>
        {msg}
      </span>
    </div>
  );
}

/* ============================================================ *
 * Main component
 * ============================================================ */

export function ScanView({ caseId }: { caseId: string }) {
  const advanceMode = useAppStore((s) => s.advanceMode);
  const qc = useQueryClient();

  // Data
  const sessions = useScanSessions(caseId);
  const devices = useDevices(caseId);
  const startScan = useStartScan();
  const cancelScan = useCancelScan(caseId);

  // Local state
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [logs, setLogs] = useState<string[]>([]);
  const [tab, setTab] = useState<"live" | "history">("live");

  // The running session takes priority, then the manually selected one,
  // then the most recent session as a default.
  const runningSession = useMemo(
    () => sessions.data?.find((s) => s.status === "running"),
    [sessions.data]
  );
  const activeScanId: string | null =
    runningSession?.id ?? selectedScanId ?? sessions.data?.[0]?.id ?? null;

  // Reset the log buffer when the active scan changes — done during render
  // (React-recommended pattern) to avoid cascading effect-driven re-renders.
  const [prevScanId, setPrevScanId] = useState<string | null>(null);
  if (activeScanId !== prevScanId) {
    setPrevScanId(activeScanId);
    setLogs([]);
  }

  const activeScanQuery = useScanSession(activeScanId);
  const activeScan: ApiScanSession | undefined = activeScanQuery.data;

  const isActiveRunning = activeScan?.status === "running";
  const activeIdx = stageIndex(activeScan);

  // ===== Tick driver =====
  // When the active scan is running, periodically POST /tick to advance the
  // engine and append the returned logs to the local buffer.
  useEffect(() => {
    if (!activeScanId || !isActiveRunning) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/scan-sessions/${activeScanId}/tick`, {
          method: "POST",
        });
        if (!res.ok) return;
        const data: { advanced: boolean; completed: boolean; logs: string[] } =
          await res.json();
        if (data.logs?.length) {
          setLogs((prev) => [...prev, ...data.logs]);
        }
        if (data.completed) {
          toast.success("Scan complete", {
            description: "Evidence inventory committed to case database.",
          });
        }
        // Refresh both the active session and the list
        qc.invalidateQueries({ queryKey: ["scan", activeScanId] });
        qc.invalidateQueries({ queryKey: ["scans", caseId] });
      } catch {
        // network errors are non-fatal for the ticker
      }
    };

    // Fire one immediately so the UI starts moving right away
    tick();
    const interval = setInterval(tick, TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeScanId, isActiveRunning, caseId, qc]);

  // ===== Actions =====
  const handleStart = useCallback(async () => {
    try {
      const session = await startScan.mutateAsync({
        caseId,
        deviceId: selectedDeviceId || undefined,
      });
      setSelectedScanId(session.id);
      setTab("live");
      toast.success("Scan started", {
        description: `Session ${session.id.slice(0, 8)} initiated on ${deviceLabel(session)}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start scan");
    }
  }, [startScan, caseId, selectedDeviceId]);

  const handleCancel = useCallback(async () => {
    if (!activeScanId) return;
    try {
      await cancelScan.mutateAsync(activeScanId);
      toast.warning("Scan cancelled", {
        description: "Engine stopped — partial results retained.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel scan");
    }
  }, [cancelScan, activeScanId]);

  const handleRowClick = useCallback((id: string) => {
    setSelectedScanId(id);
    setTab("live");
  }, []);

  // ===== Derived =====
  const stats = useMemo(() => {
    const list = sessions.data ?? [];
    const completed = list.filter((s) => s.status === "complete");
    const itemsRecovered = completed.reduce((sum, s) => sum + n(s.filesRecovered), 0);
    return {
      total: list.length,
      completed: completed.length,
      itemsRecovered,
    };
  }, [sessions.data]);

  // ===== Render =====
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Scanning Engine</h2>
          <p className="text-sm text-muted-foreground">
            Drive the 4-stage forensic pipeline and inspect recovered evidence in real time.
          </p>
        </div>
        {advanceMode && (
          <Badge className="bg-primary/15 text-primary border-primary/40">
            <Radio className="h-3 w-3" /> ADVANCED
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "live" | "history")}>
        <TabsList>
          <TabsTrigger value="live">
            <Activity className="h-3.5 w-3.5" />
            Live Dashboard
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5" />
            Scan History
          </TabsTrigger>
        </TabsList>

        {/* ============= LIVE DASHBOARD ============= */}
        <TabsContent value="live" className="space-y-4 outline-none">
          {/* Start / Banner / Run-New card */}
          {isActiveRunning ? (
            <Card className="border-primary/40 bg-primary/5 py-4">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">Scan in progress — view live below</div>
                    <div className="font-mono-forensic text-xs text-muted-foreground">
                      {deviceLabel(activeScan)} · session {activeScanId?.slice(0, 8)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelScan.isPending}
                >
                  {cancelScan.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Cancel Scan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <StartScanCard
              devices={devices.data ?? []}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
              onStart={handleStart}
              starting={startScan.isPending}
              variant={activeScan ? "run-new" : "first"}
              lastSession={activeScan}
            />
          )}

          {/* Main live dashboard body */}
          {!activeScan ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Pipeline */}
              <Card className="bg-card border-border/60">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" />
                    Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    4-stage forensic engine · {deviceLabel(activeScan)}
                  </CardDescription>
                  <CardAction>
                    <Badge className={cn("border", STATUS_BADGE[activeScan.status].className)}>
                      {activeScan.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {STATUS_BADGE[activeScan.status].label}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-start gap-y-4 overflow-x-auto pb-2">
                    {STAGES.map((stage, idx) => {
                      const meta = STAGE_META[stage];
                      const state: "completed" | "active" | "upcoming" =
                        activeIdx > idx
                          ? "completed"
                          : activeIdx === idx
                            ? isActiveRunning
                              ? "active"
                              : "completed"
                            : "upcoming";
                      const pct =
                        activeScan.stage === stage && activeScan.stageProgress != null
                          ? activeScan.stageProgress
                          : state === "completed"
                            ? 100
                            : 0;
                      return (
                        <PipelineNode
                          key={stage}
                          label={meta.label}
                          pct={Math.round(pct)}
                          state={state}
                          icon={meta.icon}
                          isLast={idx === STAGES.length - 1}
                        />
                      );
                    })}
                    {/* Complete node */}
                    <PipelineNode
                      label="Complete"
                      pct={activeScan.status === "complete" ? 100 : 0}
                      state={activeScan.status === "complete" ? "completed" : "upcoming"}
                      icon={CheckCircle2}
                      isLast
                    />
                  </div>

                  {/* Current stage detail */}
                  <div className="mt-5">
                    <ActiveStageBar session={activeScan} />
                  </div>

                  {advanceMode && (
                    <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-2 font-mono-forensic text-[10px] text-muted-foreground">
                      <div>
                        stage_idx={activeIdx} · stage=&quot;{activeScan.stage ?? "null"}&quot; ·
                        stageProgress={activeScan.stageProgress ?? 0} · status=&quot;{activeScan.status}&quot;
                      </div>
                      <div>
                        started={activeScan.startedAt} · completed={activeScan.completedAt ?? "null"} ·
                        duration={durationLabel(activeScan.startedAt, activeScan.completedAt)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={STAGE_META.analysis.icon}
                  label="Files Analyzed"
                  value={n(activeScan.filesAnalyzed)}
                  accent="primary"
                  hint="Inodes traversed"
                />
                <StatCard
                  icon={STAGE_META.discovery.icon}
                  label="Files Discovered"
                  value={n(activeScan.filesDiscovered)}
                  accent="teal"
                  hint="Catalogued objects"
                />
                <StatCard
                  icon={FileCheck2}
                  label="Recoverable"
                  value={n(activeScan.filesRecoverable)}
                  accent="amber"
                  hint="Candidate for carving"
                />
                <StatCard
                  icon={FileOutput}
                  label="Recovered"
                  value={n(activeScan.filesRecovered)}
                  accent="emerald"
                  hint="Written to evidence"
                />
              </div>

              {/* Metrics + Logs */}
              <div className="grid gap-4 lg:grid-cols-5">
                {/* System metrics */}
                <Card className="bg-card border-border/60 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      System Metrics
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live engine resource utilization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MetricGauge icon={Cpu} label="CPU" value={n(activeScan.cpuUsage)} />
                    <MetricGauge icon={Database} label="Memory" value={n(activeScan.memUsage)} />
                    <MetricGauge icon={HardDrive} label="Storage" value={n(activeScan.storageUsage)} />

                    {advanceMode && (
                      <>
                        <Separator />
                        <div className="space-y-1 font-mono-forensic text-[10px] text-muted-foreground">
                          <div>cpuUsage: {activeScan.cpuUsage ?? "null"}</div>
                          <div>memUsage: {activeScan.memUsage ?? "null"}</div>
                          <div>storageUsage: {activeScan.storageUsage ?? "null"}</div>
                          <div>sessionId: {activeScan.id}</div>
                          <div>deviceId: {activeScan.deviceId ?? "null"}</div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Live log */}
                <Card className="bg-card border-border/60 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      Engine Log
                      {logs.length > 0 && (
                        <Badge variant="secondary" className="ml-1 font-mono-forensic">
                          {logs.length} lines
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Real-time engine output — {isActiveRunning ? "streaming" : "idle"}
                    </CardDescription>
                    <CardAction>
                      {isActiveRunning && (
                        <span className="flex items-center gap-1.5 text-[11px] text-primary">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                          </span>
                          LIVE
                        </span>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <LogPanel
                      lines={logs}
                      emptyMessage={
                        isActiveRunning
                          ? "Waiting for engine output..."
                          : "Start a scan to stream engine logs."
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Advance-mode raw JSON preview */}
              {advanceMode && (
                <Card className="bg-card border-border/60">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-primary" />
                      Raw Session JSON
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Full server response (advance mode)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-80 overflow-auto rounded-md border border-border/60 bg-black/40 p-3 font-mono-forensic text-[10px] leading-relaxed text-emerald-300/80">
                      {JSON.stringify(activeScan, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Run New Scan card (when finished) */}
              {(activeScan.status === "complete" ||
                activeScan.status === "cancelled" ||
                activeScan.status === "failed") && (
                <StartScanCard
                  devices={devices.data ?? []}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={setSelectedDeviceId}
                  onStart={handleStart}
                  starting={startScan.isPending}
                  variant="run-new"
                  lastSession={activeScan}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* ============= SCAN HISTORY ============= */}
        <TabsContent value="history" className="space-y-4 outline-none">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-border/60 py-4 gap-2">
              <CardContent className="px-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Scans</div>
                <div className="font-mono-forensic text-2xl font-semibold tabular-nums">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/60 py-4 gap-2">
              <CardContent className="px-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Completed</div>
                <div className="font-mono-forensic text-2xl font-semibold tabular-nums text-emerald-400">
                  {stats.completed}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/60 py-4 gap-2">
              <CardContent className="px-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Items Recovered</div>
                <div className="font-mono-forensic text-2xl font-semibold tabular-nums">
                  {stats.itemsRecovered.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="bg-card border-border/60">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Past Scan Sessions
              </CardTitle>
              <CardDescription className="text-xs">
                Click any row to load it into the live dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {sessions.isLoading ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : !sessions.data || sessions.data.length === 0 ? (
                <div className="px-6 pb-4">
                  <EmptyState />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-6 py-2 font-medium">Device</th>
                        <th className="px-6 py-2 font-medium">Status</th>
                        <th className="px-6 py-2 font-medium">Started</th>
                        <th className="px-6 py-2 font-medium">Duration</th>
                        <th className="px-6 py-2 text-right font-medium">Files Recovered</th>
                        <th className="px-6 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.data.map((s) => {
                        const isActive = s.id === activeScanId;
                        return (
                          <tr
                            key={s.id}
                            onClick={() => handleRowClick(s.id)}
                            className={cn(
                              "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40",
                              isActive && "bg-primary/5"
                            )}
                          >
                            <td className="px-6 py-3">
                              <div className="font-medium">{deviceLabel(s)}</div>
                              <div className="font-mono-forensic text-[10px] text-muted-foreground">
                                {s.id.slice(0, 8)}
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <Badge className={cn("border", STATUS_BADGE[s.status].className)}>
                                {s.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                                {STATUS_BADGE[s.status].label}
                              </Badge>
                            </td>
                            <td className="px-6 py-3">
                              <div className="text-xs">{formatRelative(s.startedAt)}</div>
                              <div className="font-mono-forensic text-[10px] text-muted-foreground">
                                {formatDateTime(s.startedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-3 font-mono-forensic text-xs tabular-nums">
                              {durationLabel(s.startedAt, s.completedAt)}
                            </td>
                            <td className="px-6 py-3 text-right font-mono-forensic tabular-nums">
                              {n(s.filesRecovered).toLocaleString()}
                            </td>
                            <td className="px-6 py-3">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================ *
 * Auxiliary components
 * ============================================================ */

function ActiveStageBar({ session }: { session: ApiScanSession }) {
  const stage = session.stage;
  const meta = stage ? STAGE_META[stage] : null;
  const pct = Math.max(0, Math.min(100, session.stageProgress ?? 0));

  const isRunning = session.status === "running";
  const isComplete = session.status === "complete";

  const displayLabel = isComplete
    ? "Scan complete"
    : meta
      ? meta.label
      : session.status === "pending"
        ? "Pending"
        : "Idle";

  const displayDesc = isComplete
    ? "Evidence inventory has been committed to the case database."
    : meta
      ? meta.description
      : "Awaiting engine start.";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span className="text-xl font-semibold tracking-tight">{displayLabel}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{displayDesc}</p>
        </div>
        <div className="font-mono-forensic text-2xl font-semibold tabular-nums text-primary">
          <CountUp value={pct} duration={0.5} />%
        </div>
      </div>

      <div
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-muted/60",
          isRunning && "shimmer"
        )}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>

      <div className="flex items-center justify-between font-mono-forensic text-[10px] text-muted-foreground">
        <span>
          stage {stage ? STAGES.indexOf(stage) + 1 : "—"}/4
          {stage ? ` · ${stage}` : ""}
        </span>
        <span>
          {isComplete
            ? "finalized"
            : isRunning
              ? "in progress"
              : session.status}
        </span>
      </div>
    </div>
  );
}

interface StartScanCardProps {
  devices: { id: string; name: string; make: string; model: string; os: string }[];
  selectedDeviceId: string | undefined;
  onSelectDevice: (id: string | undefined) => void;
  onStart: () => void;
  starting: boolean;
  variant: "first" | "run-new";
  lastSession?: ApiScanSession;
}

function StartScanCard({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onStart,
  starting,
  variant,
  lastSession,
}: StartScanCardProps) {
  const isFirst = variant === "first";

  return (
    <Card className={cn("bg-card border-border/60", isFirst ? "border-dashed" : "")}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          {isFirst ? "Start First Scan" : "Run New Scan"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isFirst
            ? "No scans yet. Initiate the forensic engine to begin evidence recovery."
            : lastSession?.status === "complete"
              ? `Last scan recovered ${n(lastSession.filesRecovered).toLocaleString()} evidence items. Run another scan to refresh the pipeline.`
              : lastSession?.status === "cancelled"
                ? "Previous scan was cancelled. Start a fresh scan to continue."
                : "Start another scan on this case."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Target Device <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Select
              value={selectedDeviceId ?? "__all__"}
              onValueChange={(v) => onSelectDevice(v === "__all__" ? undefined : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Case-wide scan (all devices)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Case-wide scan (all devices)</SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.model || d.make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onStart} disabled={starting} className="min-w-[140px]">
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Scan
              </>
            )}
          </Button>
        </div>
        {devices.length === 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            No devices registered on this case yet — the scan will run against case-wide evidence.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="rounded-full bg-muted/60 p-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">No scan data yet</div>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Start a new scan to drive the 4-stage forensic engine. Recovered evidence will be
            catalogued and made available in the Evidence view.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
