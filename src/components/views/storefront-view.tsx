"use client";

import { useSession, useSignIn } from "@/lib/api";
import { useView } from "@/lib/view-router";
import { AutoCapture } from "@/components/auto-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  Fingerprint,
  ScanLine,
  Database,
  FileDown,
  ShieldCheck,
  Lock,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Building2,
  Users,
  Zap,
  Award,
  Globe,
  Cpu,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  LayoutDashboard,
  Star,
} from "lucide-react";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Device Acquisition",
    desc: "5 acquisition methods (logical, file system, physical, cloud, manual) with SHA-256/512 integrity hashing and chain-of-custody tracking.",
    color: "text-primary",
  },
  {
    icon: ScanLine,
    title: "4-Stage Scanning Engine",
    desc: "Analysis → Discovery → Parsing → Carving pipeline with live dashboard, CPU/MEM/Storage metrics, and real-time log feed.",
    color: "text-accent",
  },
  {
    icon: Database,
    title: "Evidence Intelligence",
    desc: "18 data categories, confidence scoring, recovery status (existing/deleted/orphaned/carved/cached), tagging, and bulk selection.",
    color: "text-amber-400",
  },
  {
    icon: FileDown,
    title: "Chain-of-Custody Delivery",
    desc: "Export to JSON, CSV, UFED XML, or PDF report. Tamper-evident audit log with SHA-256 chained checksums.",
    color: "text-emerald-400",
  },
  {
    icon: ShieldCheck,
    title: "Real Authentication",
    desc: "Bcrypt-hashed passwords (12 rounds), HMAC-signed session cookies, MFA support. Single-admin enforcement.",
    color: "text-fuchsia-400",
  },
  {
    icon: Cpu,
    title: "Advanced Mode",
    desc: "Toggle between basic and advanced technical UI — full hashes, raw metadata, JSON previews for power users.",
    color: "text-violet-400",
  },
];

const PLANS = [
  {
    name: "Standard",
    price: "$2,400",
    period: "/year",
    licenseType: "standard" as const,
    maxUsers: 5,
    features: [
      "Up to 5 investigators",
      "Unlimited cases & devices",
      "4-stage scanning engine",
      "18-category evidence analysis",
      "JSON & CSV export",
      "90-day audit log retention",
      "Email support",
    ],
    popular: false,
    color: "border-border/60",
  },
  {
    name: "Professional",
    price: "$6,000",
    period: "/year",
    licenseType: "professional" as const,
    maxUsers: 15,
    features: [
      "Up to 15 investigators",
      "Everything in Standard",
      "UFED XML & PDF report export",
      "Advanced mode UI",
      "Team collaboration & annotations",
      "1-year audit log retention",
      "Priority support",
    ],
    popular: true,
    color: "border-primary",
  },
  {
    name: "Enterprise",
    price: "$18,000",
    period: "/year",
    licenseType: "enterprise" as const,
    maxUsers: 50,
    features: [
      "Up to 50 investigators",
      "Everything in Professional",
      "Custom acquisition workflows",
      "API access for integrations",
      "Dedicated success manager",
      "Unlimited audit log retention",
      "24/7 phone support",
    ],
    popular: false,
    color: "border-border/60",
  },
];

const STATS = [
  { value: "18", label: "Evidence categories" },
  { value: "5", label: "Acquisition methods" },
  { value: "4", label: "Scan pipeline stages" },
  { value: "SHA-256", label: "Integrity hashing" },
];

export function StorefrontView() {
  const { data: session } = useSession();
  const go = useView((s) => s.go);
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signIn = useSignIn();

  const isAuthed = !!session?.user && !!session.organization;

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    try {
      await signIn.mutateAsync({ email, password });
      toast.success("Signed in");
      setSignInOpen(false);
      go({ name: "dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grid-pattern">
      <AutoCapture />
      {/* Top nav */}
      <header className="sticky top-0 z-40 h-14 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="flex h-full items-center gap-2.5 px-4 sm:px-6 max-w-[1400px] mx-auto">
          <button
            onClick={() => go({ name: "storefront" })}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent pulse-ring" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-semibold tracking-tight">FORENSIQ</div>
              <div className="text-[10px] text-muted-foreground font-mono-forensic">v4.2.1</div>
            </div>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const el = document.getElementById("pricing");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer hidden sm:flex"
            >
              Pricing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const el = document.getElementById("features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer hidden sm:flex"
            >
              Features
            </Button>
            {isAuthed ? (
              <Button size="sm" onClick={() => go({ name: "dashboard" })} className="cursor-pointer">
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                Dashboard
              </Button>
            ) : (
              <Button size="sm" onClick={() => setSignInOpen(true)} className="cursor-pointer">
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="text-[10px] font-mono-forensic mb-4">
              <Terminal className="mr-1 h-3 w-3" />
              FORENSIC INTELLIGENCE PLATFORM
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              Recover the truth.
              <br />
              <span className="text-primary">Prove the chain.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
              FORENSIQ is a complete digital forensics investigation platform — from device acquisition
              and evidence recovery to chain-of-custody delivery. Built for investigators who need
              defensible results.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isAuthed ? (
                <Button size="lg" onClick={() => go({ name: "dashboard" })} className="cursor-pointer">
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={() => setSignInOpen(true)} className="cursor-pointer">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In to Platform
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById("pricing");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="cursor-pointer"
              >
                View Pricing
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <div className="text-2xl sm:text-3xl font-bold text-primary font-mono-forensic">
                    {s.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 border-t border-border/60">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to investigate</h2>
            <p className="mt-3 text-muted-foreground">
              From seized device to court-ready report — one platform, full chain of custody.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border/60 h-full hover:border-border transition-colors">
                  <CardContent className="p-5">
                    <div className={cn("mb-3", f.color)}>
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 border-t border-border/60 bg-muted/20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="text-[10px] font-mono-forensic mb-3">
              <KeyRound className="mr-1 h-3 w-3" />
              LICENSE TIERS
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">Choose your license</h2>
            <p className="mt-3 text-muted-foreground">
              Activate your organization with a FORENSIQ license key. All plans include the full
              forensic engine — tier determines user count and support level.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={cn("relative h-full", plan.color, plan.popular && "ring-1 ring-primary")}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        <Star className="mr-1 h-2.5 w-2.5" />
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {plan.name === "Professional" && <Award className="h-4 w-4 text-primary" />}
                      {plan.name === "Enterprise" && <Globe className="h-4 w-4 text-accent" />}
                      {plan.name === "Standard" && <Building2 className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold font-mono-forensic">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Up to {plan.maxUsers} users
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    {isAuthed ? (
                      <Button variant="outline" className="w-full cursor-pointer" disabled>
                        Already activated
                      </Button>
                    ) : (
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full cursor-pointer"
                        onClick={() => setSignInOpen(true)}
                      >
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Need a custom license or on-premise deployment?{" "}
            <button
              onClick={() => setSignInOpen(true)}
              className="text-primary hover:underline cursor-pointer"
            >
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border/60">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 text-center">
          <Zap className="h-8 w-8 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to start your investigation?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign in with your FORENSIQ account to access the full platform.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {isAuthed ? (
              <Button size="lg" onClick={() => go({ name: "dashboard" })} className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Open Dashboard
              </Button>
            ) : (
              <Button size="lg" onClick={() => setSignInOpen(true)} className="cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/50 px-4 py-4 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-forensic text-muted-foreground">
          <span>FORENSIQ v4.2.1</span>
          <span>SECURE CHAIN-OF-CUSTODY · BCRYPT AUTH · TAMPER-EVIDENT AUDIT</span>
        </div>
      </footer>

      {/* Sign In Dialog */}
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              Sign in to FORENSIQ
            </DialogTitle>
            <DialogDescription>
              Enter your registered email and password to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sf-email" className="text-xs">Email</Label>
              <Input
                id="sf-email"
                type="email"
                placeholder="you@agency.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="sf-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignInOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSignIn} disabled={signIn.isPending} className="cursor-pointer">
              {signIn.isPending ? "Signing in…" : "Sign In"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
