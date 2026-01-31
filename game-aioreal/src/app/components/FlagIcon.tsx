"use client";

import * as flags from "country-flag-icons/react/3x2";

interface FlagIconProps {
  countryCode: string;
  className?: string;
  size?: number;
}

export default function FlagIcon({ countryCode, className = "", size = 20 }: FlagIconProps) {
  // Convert country code to uppercase (e.g., "us" -> "US")
  const code = countryCode.toUpperCase();
  
  // Get the flag component from the library
  // @ts-ignore - Dynamic component access
  const FlagComponent = flags[code];
  
  if (!FlagComponent) {
    // Fallback: show country code if flag not found
    return (
      <span className={`inline-flex items-center justify-center text-xs font-bold ${className}`}>
        {code}
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center ${className}`} style={{ width: size, height: size * 0.67 }}>
      <FlagComponent style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </span>
  );
}
