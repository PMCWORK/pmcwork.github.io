import React from 'react';
import { Button, Badge, Tooltip } from '@heroui/react';
import { Calendar, Bell, Sun, Moon } from 'lucide-react';
import { getDateChipData } from '../../utils/calculations';

export default function Topbar({
  title,
  eyebrow,
  date,
  isDark = false,
  onToggleTheme,
  onOpenNotifications
}) {
  const { bnDayName, enDayName, dateFormatted, iso } = getDateChipData(date);

  return (
    <header className="flex items-center justify-between gap-3 pb-2 mb-3 border-b border-default-200/60 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-display leading-tight truncate m-0">
          {title}
        </h1>
        {eyebrow && (
          <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full select-none">
            {eyebrow}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Top Date Chip with Bengali Day & Asia/Dhaka time */}
        <div
          id="topDateChip"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-default-200/80 bg-default-100/50 dark:bg-default-50/20 shadow-xs backdrop-blur select-none transition-all hover:border-primary-400 cursor-default"
          title={`Dhaka Time: ${enDayName}, ${dateFormatted} (${bnDayName})`}
        >
          <Calendar className="w-3.5 h-3.5 text-primary-500 shrink-0" />
          {bnDayName && (
            <>
              <span className="font-bold text-xs text-primary-600 dark:text-primary-400 tracking-wide font-sans">
                {bnDayName}
              </span>
              <span className="text-default-300 dark:text-default-600 text-xs">·</span>
            </>
          )}
          <span className="font-semibold text-xs text-foreground tracking-tight tabular-nums font-numeric">
            {dateFormatted}
          </span>
        </div>

        {/* Night / Light Mode Toggle Button in Topbar */}
        <Tooltip content={isDark ? "Switch to Light Mode" : "Switch to Night Mode"} placement="bottom">
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
            onPress={onToggleTheme}
            className="h-8 w-8 min-w-8 rounded-lg border border-default-200/80 bg-default-100/50 dark:bg-default-50/20 text-default-600 hover:text-foreground shadow-xs transition-all hover:border-primary-400"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-warning-400" />
            ) : (
              <Moon className="w-4 h-4 text-primary-500" />
            )}
          </Button>
        </Tooltip>

        {/* Notifications Icon Button */}
        <Badge content="3" color="danger" shape="circle" size="sm">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="Notifications"
            onPress={onOpenNotifications}
            className="h-8 w-8 min-w-8 text-default-500 hover:text-foreground rounded-lg"
          >
            <Bell className="w-4 h-4" />
          </Button>
        </Badge>
      </div>
    </header>
  );
}
