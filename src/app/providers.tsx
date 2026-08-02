"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

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
  useEffect(() => {
    const noop = () => undefined;
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, noop, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, noop));
    };
  }, []);

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
