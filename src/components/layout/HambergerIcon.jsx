import React from "react";

export function HamburgerIcon({ width = 28, height = 28, color = "currentColor" }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="6" width="16" height="2" rx="1" fill={color} />
      <rect x="4" y="11" width="16" height="2" rx="1" fill={color} />
      <rect x="4" y="16" width="16" height="2" rx="1" fill={color} />
    </svg>
  );
}
