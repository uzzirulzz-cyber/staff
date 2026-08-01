"use client";

import { useState } from "react";
import { useCases, useCreateCase, useUpdateCase, useDeleteCase } from "@/lib/api";
import { useView } from "@/lib/view-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Briefcase,
  ArrowRight,
  Trash2,
  Filter,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ApiCase } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  open: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  review: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  closed: "text-muted-foreground bg-muted/40 border-border",
  archived: "text-muted-foreground bg-muted/40 border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-blue-400",
  high: "text-amber-400",
  critical: "text-destructive",
};

export function CasesView() {
  const { data: cases, isLoading } = useCases();
  const goCase = useView((s) => s.goCase);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = (cases ?? []).filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (q && !`${c.title} ${c.caseNumber} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono-forensic">
            {(cases ?? []).length} cases · {(cases ?? []).filter((c) => ["open", "active", "review"].includes(c.status)).length} active
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by title, case number, or description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cases list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">No cases found</div>
            <div className="text-xs text-muted-foreground mt-1">
              {q || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Click 'New Case' to open your first investigation."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <CaseCard c={c} onOpen={() => goCase(c.id)} />
            </motion.div>
          ))}
        </div>
      )}

      <NewCaseDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
}

function CaseCard({ c, onOpen }: { c: ApiCase; onOpen: () => void }) {
  const tags: string[] = (() => {
    try { return JSON.parse(c.tags || "[]"); } catch { return []; }
  })();

  return (
    <Card
      onClick={onOpen}
      className="border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5",
        c.priority === "critical" ? "bg-destructive" :
        c.priority === "high" ? "bg-amber-500" :
        c.priority === "medium" ? "bg-primary" :
        "bg-muted"
      )} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono-forensic text-muted-foreground">{c.caseNumber}</span>
              <Badge variant="outline" className={cn("text-[9px] capitalize", STATUS_COLORS[c.status])}>
                {c.status}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {c.title}
            </h3>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
        {c.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
        )}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40">
          <Stat label="Devices" value={c._count?.devices ?? 0} />
          <Stat label="Scans" value={c._count?.scanSessions ?? 0} />
          <Stat label="Evidence" value={c._count?.evidenceItems ?? 0} />
          <Stat label="Exports" value={c._count?.deliveries ?? 0} />
        </div>
        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-mono-forensic">
          <span className={cn("capitalize", PRIORITY_COLORS[c.priority])}>
            ● {c.priority} priority
          </span>
          <span>Updated {formatRelative(c.updatedAt)}</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-semibold font-mono-forensic">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
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
            <Label htmlFor="nc-title" className="text-xs">Case title</Label>
            <Input
              id="nc-title"
              placeholder="e.g. Investigation of seized mobile device"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-desc" className="text-xs">Description (optional)</Label>
            <Textarea
              id="nc-desc"
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
