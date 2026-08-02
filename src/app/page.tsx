"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivationFlow } from "@/components/activation-flow-fixed";
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
    <>
      <div className="absolute top-4 right-4 z-50">
        <div className="w-80 p-4 bg-card/85 backdrop-blur rounded shadow">
          <div className="text-sm font-medium mb-2">Admin sign-in</div>
          <Input
            type="text"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            className="mb-2"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            className="mb-3"
          />
          <Button className="w-full" onClick={handleSignIn} disabled={signIn.isPending}>
            {signIn.isPending ? "Signing in…" : "Admin sign in"}
          </Button>
        </div>
      </div>

      <Suspense fallback={null}>
        <ActivationFlow />
      </Suspense>
    </>
  );
}
