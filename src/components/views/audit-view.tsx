"use client";

import { useAuditLogs, useSession } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import {
  ScrollText,
  Search,
  Shield,
  Hash,
  Fingerprint,
  Filter,
  Download,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, string> = {
  case_created: "text-primary bg-primary/10",
  case_updated: "text-blue-400 bg-blue-500/10",
  case_deleted: "text-destructive bg-destructive/10",
  device_added: "text-accent bg-accent/10",
  device_updated: "text-blue-400 bg-blue-500/10",
  device_removed: "text-destructive bg-destructive/10",
  acquisition_started: "text-amber-400 bg-amber-500/10",
  acquisition_updated: "text-blue-400 bg-blue-500/10",
  acquisition_integrity_verified: "text-emerald-400 bg-emerald-500/10",
  scan_started: "text-amber-400 bg-amber-500/10",
  scan_completed: "text-emerald-400 bg-emerald-500/10",
  scan_cancelled: "text-muted-foreground bg-muted/40",
  evidence_hashed: "text-accent bg-accent/10",
  evidence_selected_for_export: "text-blue-400 bg-blue-500/10",
  evidence_deleted: "text-destructive bg-destructive/10",
  delivery_generated: "text-emerald-400 bg-emerald-500/10",
  delivery_deleted: "text-destructive bg-destructive/10",
  organization_activated: "text-emerald-400 bg-emerald-500/10",
  user_joined_organization: "text-blue-400 bg-blue-500/10",
  team_member_updated: "text-amber-400 bg-amber-500/10",
  profile_updated: "text-blue-400 bg-blue-500/10",
};

export function AuditView() {
  const { data: session } = useSession();
  const { data: logs, isLoading } = useAuditLogs(session?.organization?.id ?? null);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const actions = Array.from(new Set((logs ?? []).map((l) => l.action))).sort();

  const filtered = (logs ?? []).filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (q) {
      const hay = `${l.action} ${l.details ?? ""} ${l.resourceType} ${l.resourceId ?? ""} ${l.user?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const handleExport = () => {
    const rows = filtered.map((l) => ({
      timestamp: l.createdAt,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId ?? "",
      user: l.user?.name ?? "",
      details: l.details ?? "",
      checksum: l.checksum ?? "",
    }));
    const csv = [
      "timestamp,action,resourceType,resourceId,user,details,checksum",
      ...rows.map((r) =>
        [r.timestamp, r.action, r.resourceType, r.resourceId, r.user, `"${(r.details || "").replace(/"/g, '""')}"`, r.checksum]
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forensiq-audit-log-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported ${rows.length} audit log entries`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-accent" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono-forensic">
            Tamper-evident chain-of-custody record · {(logs ?? []).length} entries
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search action, resource, user…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[220px] h-9">
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Audit log table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono-forensic uppercase tracking-wider text-muted-foreground">
            Showing {filtered.length} of {(logs ?? []).length} entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[700px]">
            <div className="divide-y divide-border/60">
              {isLoading && (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading audit log…</div>
              )}
              {filtered.map((l) => (
                <div key={l.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                      ACTION_COLORS[l.action] ?? "bg-muted/40"
                    )}>
                      <Fingerprint className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{l.action.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="text-[9px]">{l.resourceType}</Badge>
                        {l.resourceId && (
                          <span className="text-[10px] font-mono-forensic text-muted-foreground truncate">
                            ID: {l.resourceId}
                          </span>
                        )}
                      </div>
                      {l.details && (
                        <div className="text-xs text-muted-foreground mt-1">{l.details}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-mono-forensic">
                        <span className="flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" />
                          {l.checksum ?? "—"}
                          {l.checksum && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(l.checksum ?? "");
                                toast.success("Checksum copied");
                              }}
                              className="cursor-pointer hover:text-foreground"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </span>
                        <span>·</span>
                        <span>{l.user?.name ?? "—"}</span>
                        <span>·</span>
                        <span title={formatDateTime(l.createdAt)}>{formatRelative(l.createdAt)}</span>
                        {l.ipAddress && (
                          <>
                            <span>·</span>
                            <span>IP: {l.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !isLoading && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No audit log entries match your filters.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Tamper-evident:</strong> Each entry's checksum chains to the previous entry's checksum. Any modification breaks the chain.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
