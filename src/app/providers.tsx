"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5_000,
    },
  },
});

function SessionWatcher({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  useEffect(() => {
    let warned = false;
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    let warnTimer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      if (warned) {
        warned = false;
      }
      if (warnTimer) clearTimeout(warnTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      // 55 min warn, 60 min logout
      warnTimer = setTimeout(() => {
        warned = true;
        toast({
          title: "Session expiring soon",
          description: "You will be signed out in 5 minutes due to inactivity.",
          variant: "destructive",
        });
      }, 55 * 60 * 1000);
      logoutTimer = setTimeout(() => {
        toast({
          title: "Session expired",
          description: "You have been signed out due to inactivity.",
        });
        fetch("/api/sign-out", { method: "POST" }).finally(() => {
          window.location.href = "/";
        });
      }, 60 * 60 * 1000);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (warnTimer) clearTimeout(warnTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [toast]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionWatcher>{children}</SessionWatcher>
      <Toaster />
    </QueryClientProvider>
  );
}
