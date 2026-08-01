"use client";

import { useSession, useTeam, useUpdateTeamMember, useOrganization, useAdminAllData, useAdminLiveMonitor } from "@/lib/api";
import { useView } from "@/lib/view-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  Building2,
  KeyRound,
  Crown,
  Pencil,
  Plus,
  Lock,
  Database,
  Briefcase,
  HardDrive,
  Cpu,
  FileDown,
  Activity,
  Eye,
  Zap,
  Bot,
  KeyRound as KeyIcon,
  AppWindow,
  Image as ImageIcon,
  AudioLines,
  MessageSquare,
  Phone,
  Globe,
  FileText,
  MapPin,
} from "lucide-react";
import { useState } from "react";

const roleColors: Record<string, string> = {
  admin: "text-destructive bg-destructive/10 border-destructive/30",
  investigator: "text-primary bg-primary/10 border-primary/30",
  reviewer: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  viewer: "text-muted-foreground bg-muted/40 border-border",
};

export function AdminView() {
  const { data: session } = useSession();
  const { data: team, isLoading } = useTeam(session?.organization?.id ?? null);
  const update = useUpdateTeamMember();
  const [editUser, setEditUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const user = session?.user;
  const org = session?.organization;
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">Admin access required</div>
            <div className="text-xs text-muted-foreground mt-1">
              You need an admin role to view this page.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization, team members, and license.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      {/* Organization card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat label="Organization" value={org?.name ?? "—"} icon={<Building2 className="h-3 w-3" />} />
            <Stat label="License Type" value={<span className="uppercase">{org?.licenseType ?? "—"}</span>} icon={<KeyRound className="h-3 w-3" />} />
            <Stat label="Members" value={`${team?.length ?? 0} / ${org?.licenseType === "enterprise" ? "50" : org?.licenseType === "professional" ? "15" : "5"}`} icon={<Users className="h-3 w-3" />} />
          </div>
        </CardContent>
      </Card>

      {/* Team management */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Team Members
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{team?.length ?? 0} members</Badge>
          </div>
          <CardDescription>Manage roles and access for your team.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
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
                      {u.id === user?.id && (
                        <Badge variant="secondary" className="text-[9px]">You</Badge>
                      )}
                      {u.role === "admin" && <Crown className="h-3 w-3 text-amber-400" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono-forensic truncate">{u.email}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Joined {formatDateTime(u.createdAt)} · Active {formatRelative(u.lastActive ?? u.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role === "admin" ? (
                      <div className="h-7 w-[120px] flex items-center justify-center text-xs font-medium text-destructive border border-destructive/30 rounded-md bg-destructive/10">
                        Admin
                      </div>
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={async (v) => {
                          try {
                            await update.mutateAsync({ id: u.id, role: v });
                            toast.success(`${u.name} is now ${v}`);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Admin role is intentionally excluded — the platform
                              enforces a single admin (the first registered user). */}
                          <SelectItem value="investigator">Investigator</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUser({ id: u.id, name: u.name ?? "", role: u.role })}
                      className="cursor-pointer h-7 w-7 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {(team ?? []).length === 0 && !isLoading && (
                <div className="p-6 text-center text-xs text-muted-foreground">No team members found.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Live Monitor — admin real-time access to ALL devices (auto-updates 30s) */}
      <AdminLiveMonitorSection />

      {/* All Data — Admin super-power oversight of all members' work */}
      <AdminAllDataSection />

      {/* License card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> License & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Row label="License type" value={<Badge variant="outline" className="uppercase text-[10px]">{org?.licenseType}</Badge>} />
            <Row label="Max users" value={org?.licenseType === "enterprise" ? "50" : org?.licenseType === "professional" ? "15" : "5"} />
            <Row label="Current users" value={team?.length ?? 0} />
            <Row label="Audit log retention" value="90 days" />
            <Row label="Data residency" value="us-east-1" />
            <Row label="Encryption" value="AES-256 at rest · TLS 1.3 in transit" />
          </div>
        </CardContent>
      </Card>

      {/* Edit user dialog */}
      {editUser && (
        <Dialog open onOpenChange={(v) => !v && setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team Member</DialogTitle>
              <DialogDescription>Update the user's display name.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditUser(null)} className="cursor-pointer">Cancel</Button>
              <Button
                onClick={async () => {
                  try {
                    await update.mutateAsync({ id: editUser.id, name: editUser.name });
                    toast.success("Updated");
                    setEditUser(null);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="cursor-pointer"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite dialog — shows the real org license key for sharing */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Share your organization's license key with a colleague. They can register a new account and join your organization from the activation screen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <OrgLicenseKey />
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteOpen(false)} className="cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgLicenseKey() {
  const { data: org, isLoading } = useOrganization();
  const [copied, setCopied] = useState(false);
  if (isLoading) {
    return <div className="text-xs text-muted-foreground text-center py-2">Loading…</div>;
  }
  if (!org) {
    return <div className="text-xs text-muted-foreground text-center py-2">Organization not found.</div>;
  }
  return (
    <>
      <div className="rounded-md bg-muted/40 p-3">
        <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground">
          Your organization license key
        </div>
        <div className="text-sm font-mono-forensic mt-1 break-all">{org.licenseKey}</div>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        Share this key with your colleague. Have them open FORENSIQ, choose{" "}
        <strong>Register</strong>, fill in their details, select{" "}
        <strong>Join existing</strong>, and enter this key. Their account will
        be created with the <strong>investigator</strong> role. You can promote
        them later from this panel.
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full cursor-pointer"
        onClick={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(org.licenseKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
      >
        {copied ? "Copied!" : "Copy license key"}
      </Button>
    </>
  );
}

/* =================== Admin Live Monitor (real-time, 30s auto-update) =================== */

function AdminLiveMonitorSection() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data, isLoading } = useAdminLiveMonitor(isAdmin);
  const goCase = useView((s) => s.goCase);

  if (!isAdmin) return null;
  if (isLoading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          Loading live monitor…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 ring-1 ring-accent/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="relative">
              <Activity className="h-4 w-4 text-accent" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent pulse-ring" />
            </div>
            Live Device Monitor — Real-Time Access
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] text-accent border-accent/30 bg-accent/10">
              AUTO-UPDATE 30s
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              {data.liveDevices}/{data.totalDevices} LIVE
            </Badge>
          </div>
        </div>
        <CardDescription>
          Real-time access to all devices across all members — GPS location, monitoring status, encryption bots, and evidence counts update every 30 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.devices.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            No devices registered. Add a device to a case to begin monitoring.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data.devices.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer",
                  d.isLive
                    ? "border-accent/30 bg-accent/5 hover:bg-accent/10"
                    : "border-border/40 bg-muted/20 hover:bg-muted/30"
                )}
                onClick={() => goCase(d.case.id, "devices")}
              >
                {/* Live indicator */}
                <div className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  d.isLive ? "bg-accent pulse-ring" : "bg-muted-foreground"
                )} />

                {/* Device info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{d.name}</span>
                    <Badge variant="outline" className="text-[8px] capitalize">{d.connectionStatus}</Badge>
                    {d.encryptionStatus === "active" && (
                      <Badge variant="outline" className="text-[8px] text-accent border-accent/30 bg-accent/10 shrink-0">
                        <Bot className="h-2 w-2 mr-0.5" />
                        E2E
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5 truncate">
                    {d.make} {d.model} · {d.case.caseNumber} · by {d.addedBy.name}
                  </div>
                </div>

                {/* GPS — lat/lon then location name */}
                {d.gpsLat != null && (
                  <div className="text-[10px] text-right shrink-0 min-w-[140px]">
                    <div className="font-mono-forensic text-primary">
                      {d.gpsLat.toFixed(6)}, {d.gpsLon?.toFixed(6)}
                    </div>
                    <div className="text-muted-foreground truncate max-w-[140px]">{d.gpsLocationName ?? "—"}</div>
                  </div>
                )}

                {/* Battery */}
                <div className="text-center shrink-0 w-12">
                  <div className={cn(
                    "text-xs font-mono-forensic",
                    (d.batteryPercent ?? 0) < 20 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {d.batteryPercent ?? "—"}%
                  </div>
                  <div className="text-[8px] text-muted-foreground">battery</div>
                </div>

                {/* Evidence count */}
                <div className="text-center shrink-0 w-12">
                  <div className="text-xs font-mono-forensic text-emerald-400">{d.evidenceCount}</div>
                  <div className="text-[8px] text-muted-foreground">evidence</div>
                </div>

                {/* Last update */}
                <div className="text-right shrink-0 w-20">
                  <div className="text-[10px] font-mono-forensic text-muted-foreground">
                    {d.secondsSinceLastMonitor < 60
                      ? `${d.secondsSinceLastMonitor}s ago`
                      : `${Math.floor(d.secondsSinceLastMonitor / 60)}m ago`}
                  </div>
                  <div className="text-[8px] text-muted-foreground">last update</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-2 border-t border-border/40 text-[10px] font-mono-forensic text-muted-foreground text-right">
          Last refresh: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}

/* =================== Admin All-Data Oversight =================== */
/* The admin has super-power over all members — this section shows all  */
/* cases, evidence, member activity, credentials, and decoded data.     */

const CAT_ICONS: Record<string, React.ReactNode> = {
  photos: <ImageIcon className="h-3 w-3" />,
  videos: <FileText className="h-3 w-3" />,
  audio: <AudioLines className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  contacts: <Users className="h-3 w-3" />,
  browser_history: <Globe className="h-3 w-3" />,
  call_logs: <Phone className="h-3 w-3" />,
  app_data: <AppWindow className="h-3 w-3" />,
  location_data: <MapPin className="h-3 w-3" />,
  emails: <FileText className="h-3 w-3" />,
  documents: <FileText className="h-3 w-3" />,
  social_media: <Globe className="h-3 w-3" />,
  financial: <KeyIcon className="h-3 w-3" />,
  calendar: <FileText className="h-3 w-3" />,
  notes: <FileText className="h-3 w-3" />,
  system_logs: <Cpu className="h-3 w-3" />,
  network_data: <Globe className="h-3 w-3" />,
  credentials: <KeyIcon className="h-3 w-3" />,
  installed_apps: <AppWindow className="h-3 w-3" />,
  other: <FileText className="h-3 w-3" />,
};

function AdminAllDataSection() {
  const { data, isLoading } = useAdminAllData();
  const goCase = useView((s) => s.goCase);
  const [tab, setTab] = useState<"overview" | "cases" | "members" | "evidence" | "activity">("overview");

  if (isLoading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          Loading organization data…
        </CardContent>
      </Card>
    );
  }

  const t = data.totals;
  const stats = [
    { label: "Cases", value: t.cases, icon: <Briefcase className="h-4 w-4" />, color: "text-primary" },
    { label: "Members", value: t.users, icon: <Users className="h-4 w-4" />, color: "text-accent" },
    { label: "Devices", value: t.devices, icon: <HardDrive className="h-4 w-4" />, color: "text-amber-400" },
    { label: "Scans", value: t.scans, icon: <Cpu className="h-4 w-4" />, color: "text-fuchsia-400" },
    { label: "Evidence Items", value: t.evidence, icon: <Database className="h-4 w-4" />, color: "text-emerald-400" },
    { label: "For Export", value: t.selectedEvidence, icon: <FileDown className="h-4 w-4" />, color: "text-blue-400" },
    { label: "Deliveries", value: t.deliveries, icon: <FileDown className="h-4 w-4" />, color: "text-violet-400" },
  ];

  return (
    <Card className="border-primary/30 ring-1 ring-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            All Data — Super Admin Oversight
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-primary border-primary/30 bg-primary/5">
            <Zap className="mr-1 h-2.5 w-2.5" /> FULL ACCESS
          </Badge>
        </div>
        <CardDescription>
          Complete oversight of all organization data — every case, evidence item, member activity, and credential across all members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-md bg-muted/30 p-2.5 ring-1 ring-border/40">
              <div className={cn("flex items-center justify-between mb-1", s.color)}>
                <span className="text-[9px] font-mono-forensic uppercase tracking-wider">{s.label}</span>
                {s.icon}
              </div>
              <div className="text-xl font-bold font-mono-forensic">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border/60 overflow-x-auto">
          {([
            { id: "overview", label: "Overview" },
            { id: "cases", label: `All Cases (${data.cases.length})` },
            { id: "members", label: `Members (${data.users.length})` },
            { id: "evidence", label: `Recent Evidence (${data.recentEvidence.length})` },
            { id: "activity", label: `Activity (${data.recentActivity.length})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-[500px] overflow-y-auto">
          {tab === "overview" && (
            <div className="space-y-3">
              {/* All Cases summary */}
              <div>
                <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground mb-2">
                  All Cases by Member
                </div>
                <div className="space-y-1.5">
                  {data.cases.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goCase(c.id, "evidence")}
                      className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/40 transition-colors text-left cursor-pointer border border-border/40"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20 shrink-0">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{c.title}</span>
                          <Badge variant="outline" className="text-[8px] capitalize">{c.status}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5">
                          {c.caseNumber} · by {c.createdBy?.name ?? "—"} · {c._count.evidenceItems} evidence · {c._count.devices} devices
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[8px] capitalize">{c.priority}</Badge>
                    </button>
                  ))}
                  {data.cases.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-4">No cases yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "cases" && (
            <div className="space-y-1.5">
              {data.cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goCase(c.id, "evidence")}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted/40 transition-colors text-left cursor-pointer border border-border/40"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20 shrink-0">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.title}</span>
                      <Badge variant="outline" className="text-[8px] capitalize">{c.status}</Badge>
                      <Badge variant="outline" className="text-[8px] capitalize">{c.priority}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5">
                      {c.caseNumber} · Created by {c.createdBy?.name ?? "—"} ({c.createdBy?.role ?? "—"})
                      {c.assignedTo && ` · Assigned to ${c.assignedTo.name}`}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{c._count.devices} devices</span>
                      <span>·</span>
                      <span>{c._count.scanSessions} scans</span>
                      <span>·</span>
                      <span className="text-primary">{c._count.evidenceItems} evidence</span>
                      <span>·</span>
                      <span>{c._count.deliveries} exports</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono-forensic shrink-0">
                    {formatRelative(c.updatedAt)}
                  </div>
                </button>
              ))}
              {data.cases.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No cases in the organization.</div>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-1.5">
              {data.users.map((u) => (
                <div key={u.id} className="p-3 rounded-md border border-border/40 bg-muted/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-mono-forensic">
                        {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{u.name}</span>
                        <Badge variant="outline" className={cn("text-[9px] capitalize", roleColors[u.role] ?? "")}>
                          {u.role}
                        </Badge>
                        {u.role === "admin" && <Crown className="h-3 w-3 text-amber-400" />}
                        {u.mfaEnabled && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono-forensic">{u.email}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Active {formatRelative(u.lastActive ?? u.createdAt)} · Joined {formatDateTime(u.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-border/40">
                    <MemStat label="Cases" value={u._count.casesCreated} />
                    <MemStat label="Devices" value={u._count.devicesAdded} />
                    <MemStat label="Acq." value={u._count.acquisitions} />
                    <MemStat label="Scans" value={u._count.scansInitiated} />
                    <MemStat label="Exports" value={u._count.deliveriesCreated} />
                    <MemStat label="Actions" value={u._count.auditLogs} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "evidence" && (
            <div className="space-y-1">
              {data.recentEvidence.map((e) => {
                const decoded = e.decodedContent
                  ? (() => {
                      try { return JSON.parse(e.decodedContent); } catch { return null; }
                    })()
                  : null;
                return (
                  <button
                    key={e.id}
                    onClick={() => goCase(e.case.id, "evidence")}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/40 transition-colors text-left cursor-pointer border border-border/40"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/40 shrink-0 text-muted-foreground">
                      {CAT_ICONS[e.category] ?? <FileText className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate font-mono-forensic">{e.fileName}</span>
                        {decoded && (
                          <Badge variant="outline" className="text-[8px] text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                            DECODED
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {e.case.caseNumber} · {e.category.replace(/_/g, " ")}
                        {decoded?.transcription && ` · "${decoded.transcription.slice(0, 60)}…"`}
                        {decoded?.password && ` · pass: ${decoded.password}`}
                        {decoded?.appName && ` · ${decoded.appName} v${decoded.version}`}
                        {decoded?.body && ` · "${decoded.body}"`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] capitalize shrink-0">{e.recoveryStatus}</Badge>
                  </button>
                );
              })}
              {data.recentEvidence.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No evidence items yet.</div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-1">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-muted/30 transition-colors">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">
                      <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground"> · {a.resourceType}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{a.details}</div>
                    <div className="text-[10px] text-muted-foreground font-mono-forensic mt-0.5">
                      {a.user?.name ?? "—"} ({a.user?.role ?? "—"}) · {formatRelative(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {data.recentActivity.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No activity recorded.</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MemStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold font-mono-forensic">{value}</div>
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="text-[10px] font-mono-forensic uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-sm font-semibold mt-1">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-right">{value}</span>
    </div>
  );
}
