"use client";

import { useSession, useSignIn } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { AutoCapture } from "@/components/auto-capture";
import { DashboardView } from "@/components/views/dashboard-view";
import { CasesView } from "@/components/views/cases-view";
import { CaseDetailView } from "@/components/views/case-detail-view";
import { ProfileView } from "@/components/views/profile-view";
import { AdminView } from "@/components/views/admin-view";
import { AuditView } from "@/components/views/audit-view";
import { useView } from "@/lib/view-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const { data: session, isLoading, isError, refetch } = useSession();
  const signIn = useSignIn();
  const view = useView((s) => s.view);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isError) {
      const timer = setTimeout(() => refetch(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isError, refetch]);

  if (isLoading || authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user || !session.organization) {
    const handleSignIn = async () => {
      if (!email || !password) return;
      try {
        await signIn.mutateAsync({ email, password });
        setAuthed(true);
        setTimeout(() => window.location.reload(), 1000);
      } catch (e) {
        toast.error((e as Error).message);
        setAuthed(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <AutoCapture />
        <div className="w-full max-w-xs space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          />
          <Button
            className="w-full cursor-pointer"
            onClick={handleSignIn}
            disabled={signIn.isPending}
          >
            {signIn.isPending ? "..." : "Enter"}
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated — render the correct view based on hash router
  return (
    <AppShell>
      {view.name === "dashboard" && <DashboardView />}
      {view.name === "cases" && <CasesView />}
      {view.name === "case" && <CaseDetailView caseId={view.caseId} tab={view.tab ?? "overview"} />}
      {view.name === "profile" && <ProfileView />}
      {view.name === "admin" && <AdminView />}
      {view.name === "audit" && <AuditView />}
      {view.name === "storefront" && <AdminView />}
    </AppShell>
  );
}
