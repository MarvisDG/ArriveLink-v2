import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "delayed":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "departed":
    case "sold_out":
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "Available";
    case "delayed":
      return "Delayed";
    case "departed":
      return "Departed";
    case "sold_out":
      return "Sold Out";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
