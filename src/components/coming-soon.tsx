"use client";

import { AutoCapture } from "@/components/auto-capture";

export function ComingSoon() {
  return (
    <div className="min-h-screen flex flex-col bg-background bg-grid-pattern">
      <AutoCapture />
      <div className="flex-1 flex items-center justify-center p-6">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          Coming Soon
        </h1>
      </div>
    </div>
  );
}
