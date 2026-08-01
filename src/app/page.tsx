"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/admin");
  }, []);
  return <div className="min-h-screen bg-background" />;
}
