"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("playbeat123");

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    try {
      await signIn.mutateAsync({ email: email.trim(), password });
      toast.success("Signed in");
      router.push("/admin");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-xs space-y-4">
        <Input
          type="text"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
        />
        <Button className="w-full" onClick={handleSignIn} disabled={signIn.isPending}>
          {signIn.isPending ? "Signing in…" : "Admin sign in"}
        </Button>
      </div>
    </div>
  );
}
