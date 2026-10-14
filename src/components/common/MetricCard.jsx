import React from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({
  label,
  value,
  subLabel,
  subValue,
  comparisonText,
  comparisonType = "neutral", // "up", "down", "neutral"
  forecastText,
  className = ""
}) {
  const getTrendIcon = () => {
    if (comparisonType === "up") return <TrendingUp className="w-3.5 h-3.5 text-success-500" />;
    if (comparisonType === "down") return <TrendingDown className="w-3.5 h-3.5 text-danger-500" />;
    return <Minus className="w-3.5 h-3.5 text-default-400" />;
  };

  const getTrendChipColor = () => {
    if (comparisonType === "up") return "success";
    if (comparisonType === "down") return "danger";
    return "default";
  };

  return (
    <Card className={`border border-default-200/70 shadow-sm hover:shadow-md transition-shadow bg-content1 ${className}`}>
      <CardBody className="p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
            {label}
          </span>
          {comparisonText && (
            <Chip
              size="sm"
              variant="flat"
              color={getTrendChipColor()}
              startContent={getTrendIcon()}
              className="text-[11px] font-semibold h-6"
            >
              {comparisonText}
            </Chip>
          )}
        </div>

        <div className="my-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-foreground">
            {value}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-default-100 flex flex-col gap-1 text-xs text-default-500">
          {subLabel && (
            <div className="flex items-center justify-between">
              <span>{subLabel}</span>
              <span className="font-semibold text-foreground">{subValue}</span>
            </div>
          )}
          {forecastText && (
            <div className="text-[11px] text-default-400 italic">
              {forecastText}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
