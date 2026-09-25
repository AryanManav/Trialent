import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Sep 2026" — for history, where the day adds nothing. */
export function formatMonth(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * True for a same-origin path such as "/company/projects". Rejects "//evil.com",
 * and also "/\evil.com" and "/<tab>/evil.com": browsers treat a backslash as a
 * slash and strip tabs and newlines, so both would leave the origin.
 */
export function isInternalPath(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\/(?![/\\])[^\\\s]*$/.test(value);
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", then a date. */
export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(dateString).getTime();
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(dateString);
}
