import { type ClassValue, clsx } from "clsx";

// Simple className utility function
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format anime score
export function formatScore(score?: number): string {
  if (!score) return "N/A";
  return `${score}/100`;
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Get anime status color
export function getStatusColor(status: string): string {
  switch (status) {
    case "RELEASING":
      return "text-green-400";
    case "FINISHED":
      return "text-blue-400";
    case "NOT_YET_RELEASED":
      return "text-yellow-400";
    case "CANCELLED":
      return "text-red-400";
    case "HIATUS":
      return "text-orange-400";
    default:
      return "text-gray-400";
  }
}

// Debounce function for search
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
