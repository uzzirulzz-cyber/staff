"use client";

import { useDashboard, useCases } from "@/lib/api";
import { useView } from "@/lib/view-router";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { USBScanner } from "@/components/usb-scanner";
import { CaptureScan } from "@/components/capture-scan";
import { cn, formatRelative } from "@/lib/utils";
import { useAppStore as _useAppStore } from "@/lib/store";
import {
  Briefcase,
  Cpu,
  Database,
  HardDrive,
  Activity,
  ArrowRight,
  Plus,
  Zap,
  ShieldCheck,
  FileDown,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useCreateCase } from "@/lib/api";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  open: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  review: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  closed: "text-muted-foreground bg-muted/40 border-border",
  archived: "text-muted-foreground bg-muted/40 border-border",
};

export function DashboardView() {
  const { data: dash, isLoading } = useDashboard();
  const { data: cases } = useCases();
  const go = useView((s) => s.go);
  const goCase = useView((s) => s.goCase);
  const advanceMode = useAppStore((s) => s.advanceMode);
  const [showNewCase, setShowNewCase] = useState(false);

  const totals = dash?.totals;

  const stats: Array<{
    label: string;
    value: number | undefined;
    sub: string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }> = [
    {
      label: "Total Cases",
      value: totals?.cases,
      sub: `${totals?.activeCases ?? 0} active`,
      icon: <Briefcase className="h-4 w-4" />,
      color: "text-primary",
      onClick: () => go({ name: "cases" }),
    },
    {
      label: "Devices",
      value: totals?.devices,
      sub: `${totals?.acquiredDevices ?? 0} acquired`,
      icon: <HardDrive className="h-4 w-4" />,
      color: "text-accent",
    },
    {
      label: "Scans",
      value: totals?.scans,
      sub: `${totals?.runningScans ?? 0} running`,
      icon: <Cpu className="h-4 w-4" />,
      color: "text-amber-400",
    },
    {
      label: "Evidence Items",
      value: totals?.evidence,
      sub: `${totals?.selectedEvidence ?? 0} for export`,
      icon: <Database className="h-4 w-4" />,
      color: "text-fuchsia-400",
    },
    {
      label: "Deliveries",
      value: totals?.deliveries,
      sub: "packages generated",
      icon: <FileDown className="h-4 w-4" />,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono-forensic">
            FORENSIQ ENGINE v4.2.1 · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setShowNewCase(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-4">
                  <div className="h-4 w-16 bg-muted/60 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted/40 rounded mt-2 animate-pulse" />
                  <div className="h-3 w-12 bg-muted/40 rounded mt-2 animate-pulse" />
                </CardContent>
              </Card>
            ))
          : stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "border-border/60 hover:border-border transition-colors",
                    s.onClick ? "cursor-pointer" : ""
                  )}
                  onClick={s.onClick}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] font-mono-forensic uppercase tracking-wider", s.color)}>
                        {s.label}
                      </span>
                      <span className={s.color}>{s.icon}</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight mt-1.5 font-mono-forensic">
                      {s.value ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{s.sub}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Capture · Detect · Scan · Preview */}
      <CaptureScan />

      {/* USB Scanner — real device scanning */}
      <USBScanner />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Cases */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Recent Cases
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => go({ name: "cases" })} className="cursor-pointer">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[320px]">
              <div className="divide-y divide-border/60">
                {(dash?.recentCases ?? []).length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No cases yet. Click <strong>New Case</strong> to start your first investigation.
                  </div>
                )}
                {(dash?.recentCases ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goCase(c.id)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20 shrink-0">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{c.title}</span>
                        <Badge variant="outline" className={cn("text-[9px] capitalize", STATUS_COLORS[c.status])}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono-forensic mt-0.5">
                        {c.caseNumber} · {formatRelative(c.updatedAt)} · {c._count?.devices ?? 0} devices · {c._count?.evidenceItems ?? 0} evidence
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity chart */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Activity (14d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dash?.activityByDay ?? []}>
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.15 195)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.15 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.30 0.02 250 / 40%)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="oklch(0.68 0.02 245)"
                    fontSize={9}
                    tickFormatter={(d) => d.slice(5)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="oklch(0.68 0.02 245)" fontSize={10} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.19 0.025 250)",
                      border: "1px solid oklch(0.30 0.02 250 / 60%)",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "oklch(0.96 0.005 240)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="oklch(0.72 0.15 195)"
                    strokeWidth={2}
                    fill="url(#activityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-[9px] font-mono-forensic uppercase text-muted-foreground">Cases</div>
                <div className="text-base font-semibold font-mono-forensic">{totals?.cases ?? 0}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-[9px] font-mono-forensic uppercase text-muted-foreground">Scans</div>
                <div className="text-base font-semibold font-mono-forensic">{totals?.scans ?? 0}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-[9px] font-mono-forensic uppercase text-muted-foreground">Items</div>
                <div className="text-base font-semibold font-mono-forensic">{totals?.evidence ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Recent Scans
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="divide-y divide-border/60">
              {(dash?.recentScans ?? []).length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No scans yet. Open a case and run a scan to populate evidence.
                </div>
              )}
              {(dash?.recentScans ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => s.caseId && goCase(s.caseId, "scan")}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left cursor-pointer"
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md ring-1 shrink-0",
                    s.status === "complete" ? "bg-emerald-500/10 ring-emerald-500/30" :
                    s.status === "running" ? "bg-amber-500/10 ring-amber-500/30 pulse-ring" :
                    s.status === "cancelled" ? "bg-muted/40 ring-border/60" :
                    "bg-destructive/10 ring-destructive/30"
                  )}>
                    <Cpu className={cn(
                      "h-3.5 w-3.5",
                      s.status === "complete" ? "text-emerald-400" :
                      s.status === "running" ? "text-amber-400" :
                      "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {s.device ? `${s.device.make} ${s.device.model}` : "Case-level scan"}
                      </span>
                      <Badge variant="outline" className="text-[9px] capitalize">{s.status}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono-forensic mt-0.5">
                      {formatRelative(s.startedAt)} · {s.filesRecovered ?? 0} items recovered
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {advanceMode && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono-forensic uppercase tracking-wider text-muted-foreground">
              Advanced Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono-forensic">
            <div>
              <div className="text-muted-foreground">Engine Build</div>
              <div>v4.2.1-stable</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pipeline Stages</div>
              <div>4 active</div>
            </div>
            <div>
              <div className="text-muted-foreground">Integrity</div>
              <div className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Throughput</div>
              <div>{Math.floor((totals?.evidence ?? 0) / Math.max(1, totals?.scans ?? 1))} items/scan</div>
            </div>
          </CardContent>
        </Card>
      )}

      <NewCaseDialog open={showNewCase} onOpenChange={setShowNewCase} />
    </div>
  );
}

function NewCaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateCase();
  const goCase = useView((s) => s.goCase);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    try {
      const c = await create.mutateAsync({ title: title.trim(), description, priority });
      toast.success(`Created case ${c.caseNumber}`);
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      goCase(c.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Open a new forensic investigation case. A unique case number will be generated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="case-title" className="text-xs">Case title</Label>
            <Input
              id="case-title"
              placeholder="e.g. Investigation of seized mobile device"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-desc" className="text-xs">Description (optional)</Label>
            <Textarea
              id="case-desc"
              placeholder="Brief summary of the case context…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={(v: typeof priority) => setPriority(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="cursor-pointer">
            {create.isPending ? "Creating…" : "Create Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
