import React from 'react';
import { Chip } from '@heroui/react';

export default function StatusChip({ status, type = "status", value }) {
  if (type === "profit") {
    const num = parseFloat(value) || 0;
    let color = "danger";
    if (num >= 15) color = "success";
    else if (num >= 8) color = "warning";
    else if (num > 0) color = "primary";

    return (
      <Chip
        size="sm"
        variant="flat"
        color={color}
        className="font-bold text-[11px] px-1.5"
      >
        {num >= 0 ? `+${num}%` : `${num}%`}
      </Chip>
    );
  }

  // Standard status badges: Unmarked, Sold, Returned, Paid, Due
  const normalized = (status || '').toLowerCase().trim();
  let color = "default";
  let variant = "flat";

  switch (normalized) {
    case 'sold':
    case 'paid':
      color = "success";
      break;
    case 'unmarked':
    case 'in stock':
    case 'available':
      color = "default";
      break;
    case 'returned':
    case 'damaged':
      color = "danger";
      break;
    case 'due':
    case 'pending':
    case 'warning':
      color = "warning";
      break;
    default:
      color = "default";
      break;
  }

  return (
    <Chip
      size="sm"
      variant={variant}
      color={color}
      className="capitalize font-medium text-[11px] px-2 h-6"
    >
      {status}
    </Chip>
  );
}
