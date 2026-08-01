"use client";

import { useCase, useUpdateCase, useDeleteCase, useTeam, useAnnotations, useAddAnnotation, useDeleteAnnotation, useAuditLogs } from "@/lib/api";
import { useView, type CaseTab } from "@/lib/view-router";
import { useAppStore } from "@/lib/store";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  HardDrive,
  Cpu,
  Database,
  FileDown,
  ScrollText,
  Users,
  MessageSquare,
  Pencil,
  Trash2,
  Send,
  ShieldCheck,
  Clock,
  Hash,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { DevicesView } from "./devices-view";
import { ScanView } from "./scan-view";
import { EvidenceView } from "./evidence-view";
import { ExportView } from "./export-view";
import type { ApiCase } from "@/lib/types";

const TABS: Array<{ id: CaseTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "devices", label: "Devices", icon: <HardDrive className="h-3.5 w-3.5" /> },
  { id: "scan", label: "Scan", icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: "evidence", label: "Evidence", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "export", label: "Export", icon: <FileDown className="h-3.5 w-3.5" /> },
  { id: "delivery", label: "Delivery", icon: <FileDown className="h-3.5 w-3.5" /> },
  { id: "discussion", label: "Discussion", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "team", label: "Team", icon: <Users className="h-3.5 w-3.5" /> },
];

export function CaseDetailView({ caseId, tab }: { caseId: string; tab: CaseTab }) {
  const { data: kase, isLoading } = useCase(caseId);
  const go = useView((s) => s.go);
  const goCase = useView((s) => s.goCase);
  const advanceMode = useAppStore((s) => s.advanceMode);

  if (isLoading || !kase) {
    return (
      <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
        <div className="h-8 w-48 bg-muted/60 rounded animate-pulse" />
        <div className="h-10 w-full bg-muted/40 rounded animate-pulse" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              onClick={() => go({ name: "cases" })}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" /> All cases
            </button>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono-forensic text-muted-foreground">{kase.caseNumber}</span>
              <Badge variant="outline" className="text-[9px] capitalize">{kase.status}</Badge>
              <Badge variant="outline" className="text-[9px] capitalize">{kase.priority} priority</Badge>
              {advanceMode && (
                <span className="text-[10px] font-mono-forensic text-muted-foreground">
                  ID: {kase.id}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{kase.title}</h1>
            {kase.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{kase.description}</p>
            )}
          </div>
          <CaseActions kase={kase} />
        </div>

        {/* Tabs */}
        <div className="mt-4 -mb-px flex items-center gap-1 overflow-x-auto border-b border-border/60">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goCase(caseId, t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
              {t.id === "devices" && (kase._count?.devices ?? 0) > 0 && (
                <span className="ml-1 text-[9px] bg-muted px-1 rounded">{kase._count?.devices}</span>
              )}
              {t.id === "evidence" && (kase._count?.evidenceItems ?? 0) > 0 && (
                <span className="ml-1 text-[9px] bg-muted px-1 rounded">{kase._count?.evidenceItems}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && <OverviewTab kase={kase} />}
        {tab === "devices" && <DevicesView caseId={caseId} />}
        {tab === "scan" && <ScanView caseId={caseId} />}
        {tab === "evidence" && <EvidenceView caseId={caseId} />}
        {(tab === "export" || tab === "delivery") && <ExportView caseId={caseId} />}
        {tab === "discussion" && <DiscussionTab caseId={caseId} />}
        {tab === "team" && <TeamTab caseId={caseId} />}
      </div>
    </div>
  );
}

function CaseActions({ kase }: { kase: ApiCase }) {
  const update = useUpdateCase(kase.id);
  const del = useDeleteCase(kase.id);
  const go = useView((s) => s.go);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={kase.status}
        onValueChange={(v) => {
          update.mutate({ status: v });
          toast.success(`Status changed to ${v}`);
        }}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="review">In Review</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="cursor-pointer">
        <Pencil className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="cursor-pointer text-destructive hover:text-destructive">
        <Trash2 className="h-3 w-3" />
      </Button>

      <EditCaseDialog kase={kase} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete case {kase.caseNumber} and all related devices, scans, evidence, and deliveries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await del.mutateAsync(kase.id);
                  toast.success("Case deleted");
                  go({ name: "cases" });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditCaseDialog({ kase, open, onOpenChange }: { kase: ApiCase; open: boolean; onOpenChange: (v: boolean) => void }) {
  const update = useUpdateCase(kase.id);
  const [title, setTitle] = useState(kase.title);
  const [description, setDescription] = useState(kase.description ?? "");
  const [priority, setPriority] = useState(kase.priority);

  const handleSave = async () => {
    try {
      await update.mutateAsync({ title, description, priority });
      toast.success("Case updated");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogDescription>Update case details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
          <Button onClick={handleSave} disabled={update.isPending} className="cursor-pointer">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverviewTab({ kase }: { kase: ApiCase }) {
  const { data: logs } = useAuditLogs(kase.organizationId, kase.id);

  const counts = [
    { label: "Devices", value: kase._count?.devices ?? 0, icon: <HardDrive className="h-4 w-4" />, color: "text-accent" },
    { label: "Scans", value: kase._count?.scanSessions ?? 0, icon: <Cpu className="h-4 w-4" />, color: "text-amber-400" },
    { label: "Evidence", value: kase._count?.evidenceItems ?? 0, icon: <Database className="h-4 w-4" />, color: "text-fuchsia-400" },
    { label: "Exports", value: kase._count?.deliveries ?? 0, icon: <FileDown className="h-4 w-4" />, color: "text-emerald-400" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {counts.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-mono-forensic uppercase tracking-wider", c.color)}>{c.label}</span>
                <span className={c.color}>{c.icon}</span>
              </div>
              <div className="text-3xl font-bold font-mono-forensic mt-1.5">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Case Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Detail label="Case Number" value={<span className="font-mono-forensic">{kase.caseNumber}</span>} />
            <Detail label="Status" value={<Badge variant="outline" className="text-[9px] capitalize">{kase.status}</Badge>} />
            <Detail label="Priority" value={<span className="capitalize">{kase.priority}</span>} />
            <Detail label="Created" value={formatDateTime(kase.createdAt)} />
            <Detail label="Last Updated" value={formatRelative(kase.updatedAt)} />
            {kase.closedAt && <Detail label="Closed" value={formatDateTime(kase.closedAt)} />}
            <Detail label="Created By" value={kase.createdBy?.name ?? "—"} />
            <Detail label="Assigned To" value={kase.assignedTo?.name ?? "Unassigned"} />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-accent" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <div className="divide-y divide-border/60">
                {(logs ?? []).slice(0, 15).map((l) => (
                  <div key={l.id} className="p-3 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{l.action.replace(/_/g, " ")}</div>
                      <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5">
                        {l.details ?? "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {l.user?.name ?? "—"} · {formatRelative(l.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {(logs ?? []).length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">No activity recorded yet.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-right">{value}</span>
    </div>
  );
}

function DiscussionTab({ caseId }: { caseId: string }) {
  const { data: annotations, isLoading } = useAnnotations(caseId);
  const add = useAddAnnotation(caseId);
  const del = useDeleteAnnotation(caseId);
  const session = useAppStore();
  const [text, setText] = useState("");

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      await add.mutateAsync({ content: text.trim() });
      setText("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success("Annotation deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" /> Case Discussion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {isLoading && (
                <div className="text-center text-xs text-muted-foreground py-8">Loading…</div>
              )}
              {!isLoading && (annotations ?? []).length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No discussion yet. Add the first note below.
                </div>
              )}
              {(annotations ?? []).map((a) => {
                const isOwn = a.userId === session.userId;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[9px] bg-primary/15 text-primary">
                        {(a.user?.name ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 max-w-[80%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`rounded-lg p-2.5 ${isOwn ? "bg-primary/15" : "bg-muted/40"}`}>
                        <div className="text-[10px] text-muted-foreground mb-0.5">
                          {a.user?.name ?? "Unknown"} · {formatRelative(a.createdAt)}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{a.content}</div>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-[10px] text-muted-foreground hover:text-destructive mt-0.5 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
          <Separator />
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Add investigator note… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="resize-none flex-1 text-sm"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={add.isPending || !text.trim()}
              className="self-end h-9 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab({ caseId }: { caseId: string }) {
  // caseId is unused here but kept for consistency
  void caseId;
  const session = useAppStore();
  const { data: team, isLoading } = useTeam(session.organizationId);

  const roleColors: Record<string, string> = {
    admin: "text-destructive bg-destructive/10 border-destructive/30",
    investigator: "text-primary bg-primary/10 border-primary/30",
    reviewer: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    viewer: "text-muted-foreground bg-muted/40 border-border",
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Team Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <div className="divide-y divide-border/60">
              {isLoading && (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading team…</div>
              )}
              {(team ?? []).map((u) => (
                <div key={u.id} className="p-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-mono-forensic">
                      {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{u.name}</span>
                      {u.id === session.userId && (
                        <Badge variant="secondary" className="text-[9px]">You</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono-forensic truncate">{u.email}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Active {formatRelative(u.lastActive ?? u.updatedAt)}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] capitalize ${roleColors[u.role] ?? ""}`}>
                    {u.role}
                  </Badge>
                  {u.mfaEnabled && (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
              ))}
              {(team ?? []).length === 0 && !isLoading && (
                <div className="p-6 text-center text-xs text-muted-foreground">No team members found.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
