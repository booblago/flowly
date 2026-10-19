import { clsx, type ClassValue } from "clsx";
import type { Priority } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function priorityScore(priority: Priority): number {
  const map: Record<Priority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };
  return map[priority];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function userImageSrc(user: {
  avatarUrl?: string | null;
  avatarColor?: string;
}) {
  if (
    user.avatarUrl &&
    (user.avatarUrl.startsWith("http") || user.avatarUrl.startsWith("data:"))
  ) {
    return { kind: "image" as const, value: user.avatarUrl };
  }
  return { kind: "color" as const, value: user.avatarColor || "#22d3ee" };
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  low: "chip-cyan",
  medium: "chip-violet",
  high: "chip-amber",
  urgent: "chip-rose",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#22d3ee",
  medium: "#a78bfa",
  high: "#fbbf24",
  urgent: "#fb7185",
};

export const LIST_ACCENTS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa", "#fb7185"];

export function daysInList(enteredListAt: string) {
  const ms = Date.now() - new Date(enteredListAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}
