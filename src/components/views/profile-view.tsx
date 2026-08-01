"use client";

import { useState } from "react";
import { useSession, useUpdateProfile, useSignOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  Building2,
  Clock,
  Fingerprint,
  LogOut,
  Smartphone,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export function ProfileView() {
  const { data: session } = useSession();
  const update = useUpdateProfile();
  const signOut = useSignOut();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [mfaEnabled, setMfaEnabled] = useState(session?.user?.mfaEnabled ?? false);

  const user = session?.user;
  const org = session?.organization;

  if (!user) return null;

  const handleSave = async () => {
    try {
      await update.mutateAsync({ name, mfaEnabled });
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleMfaToggle = async (v: boolean) => {
    setMfaEnabled(v);
    try {
      await update.mutateAsync({ mfaEnabled: v });
      toast.success(v ? "MFA enabled" : "MFA disabled");
    } catch (e) {
      toast.error((e as Error).message);
      setMfaEnabled(!v);
    }
  };

  const initials = (user.name || user.email)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and security settings.</p>
      </div>

      {/* Profile header card */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/15 text-primary text-xl font-mono-forensic">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{user.name}</h2>
                <Badge variant="outline" className="text-[10px] capitalize">{user.role}</Badge>
                {user.mfaEnabled && (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                    <ShieldCheck className="mr-1 h-2.5 w-2.5" /> MFA
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground font-mono-forensic mt-0.5">{user.email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Last active: {formatDateTime(user.lastActive)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Account Details
          </CardTitle>
          <CardDescription>Update your display name and personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={user.email} disabled className="bg-muted/40 font-mono-forensic text-xs" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={update.isPending} className="cursor-pointer">
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Security
          </CardTitle>
          <CardDescription>Multi-factor authentication and session management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30">
            <div className="flex items-start gap-2.5">
              <Smartphone className="h-4 w-4 text-accent mt-0.5" />
              <div>
                <div className="text-sm font-medium">Multi-factor Authentication</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Require a verification code in addition to your session on sensitive actions.
                </div>
              </div>
            </div>
            <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-xs font-mono-forensic uppercase tracking-wider text-muted-foreground">
              Session Info
            </div>
            <Row label="User ID" value={<span className="font-mono-forensic text-[11px]">{user.id}</span>} icon={<Fingerprint className="h-3 w-3" />} />
            <Row label="Role" value={<span className="capitalize">{user.role}</span>} icon={<KeyRound className="h-3 w-3" />} />
            <Row label="Organization" value={org?.name ?? "—"} icon={<Building2 className="h-3 w-3" />} />
            <Row label="License type" value={<span className="uppercase">{org?.licenseType ?? "—"}</span>} icon={<ShieldCheck className="h-3 w-3" />} />
            <Row label="Last active" value={formatDateTime(user.lastActive)} icon={<Clock className="h-3 w-3" />} />
          </div>

          <Separator />

          <Button
            variant="outline"
            onClick={() => signOut.mutate()}
            className="w-full cursor-pointer text-destructive hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out Everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</span>
      <span className="text-xs text-right">{value}</span>
    </div>
  );
}
