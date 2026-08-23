/** Shared device-local date and time formatting for the mobile app. */

import { getDeviceTimeZone } from "@/utils/device";

function localTimeZone(): string {
  return getDeviceTimeZone();
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseDateOnly(value);
}

/** Returns a calendar date in the device's local timezone for date filter queries. */
export function toLocalDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a local calendar date without applying a UTC offset. */
export function parseLocalDateValue(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

/** Formats a date-only value or instant in the device's local timezone. */
export function formatLocalDate(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: localTimeZone() }).format(toDate(value));
}

/** Formats an instant's clock time in the device's local timezone. */
export function formatLocalTime(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: localTimeZone(),
  }).format(toDate(value));
}

/** Formats an instant with both date and clock time in the device's local timezone. */
export function formatLocalDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: localTimeZone() }).format(toDate(value));
}

/** Formats comment timestamps as a localized relative label, then a local date/time. */
export function formatLocalCommentTime(value: string | Date, language: "en" | "zh"): string {
  const createdAt = toDate(value).getTime();
  if (!Number.isFinite(createdAt)) return "";
  const elapsedSeconds = Math.max(0, (Date.now() - createdAt) / 1000);
  if (elapsedSeconds < 60) return language === "zh" ? "\u521a\u521a" : "Just now";
  if (elapsedSeconds < 60 * 60) {
    const minutes = Math.max(1, Math.floor(elapsedSeconds / 60));
    return language === "zh" ? `${minutes}\u5206\u949f\u524d` : `${minutes}m ago`;
  }
  if (elapsedSeconds < 60 * 60 * 24) {
    const hours = Math.max(1, Math.floor(elapsedSeconds / (60 * 60)));
    return language === "zh" ? `${hours}\u5c0f\u65f6\u524d` : `${hours}h ago`;
  }
  if (elapsedSeconds < 60 * 60 * 24 * 7) {
    const days = Math.max(1, Math.floor(elapsedSeconds / (60 * 60 * 24)));
    return language === "zh" ? `${days}\u5929\u524d` : `${days}d ago`;
  }
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: localTimeZone(),
  }).format(toDate(value));
}
