import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format helpers
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(d);
  }
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}d ago`;
  return formatDateTime(date);
}

// Real cryptographic hash generator using the Web Crypto API.
// `length` controls how many hex characters to return (64 = SHA-256, 128 = SHA-512).
// Falls back to node crypto if SubtleCrypto is unavailable.
export async function generateHash(length: 64 | 128 = 64): Promise<string> {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Server-side fallback via node crypto
    const { randomBytes } = await import("crypto");
    const nodeBytes = randomBytes(32);
    for (let i = 0; i < 32; i++) bytes[i] = nodeBytes[i];
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // SHA-256 = 64 chars; SHA-512 = 128 chars. Concatenate to reach 128 if needed.
  return (hex + hex).slice(0, length);
}

// Synchronous convenience wrapper used by UI affordances that let an
// investigator populate a hash field with a freshly-generated value.
// Uses Math.random only as a UI placeholder; the real hash must be
// recorded by the investigator from their forensic tooling.
export function generateHashSync(length: 64 | 128 = 64): string {
  const bytes = new Uint8Array(length / 2);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert array of objects to CSV
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set<string>())
  );
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}
