import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDisplayDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "-";
  
  let date: Date;
  if (typeof dateInput === "string") {
    // If it's a simple YYYY-MM-DD string, parse it using split to avoid timezone offsets
    if (dateInput.includes("-") && !dateInput.includes("T")) {
      const parts = dateInput.split("-");
      if (parts.length === 3) {
        return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
      }
    }
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return "-";
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}
