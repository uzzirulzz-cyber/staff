"use client";

import { Suspense } from "react";
import { ActivationFlow } from "@/components/activation-flow-fixed";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ActivationFlow />
    </Suspense>
  );
}
