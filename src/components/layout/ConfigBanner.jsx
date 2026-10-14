import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfigBanner({
  title = "Firebase Connection Status",
  message = "Firebase is configured and persistent cache synchronization is active.",
  type = "warning",
  actionText,
  onAction,
  onClose,
  show = true
}) {
  if (!show) return null;

  const colorStyles = {
    warning: "bg-warning-50/70 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800/40 text-warning-800 dark:text-warning-200",
    danger: "bg-danger-50/70 border-danger-200 dark:bg-danger-900/20 dark:border-danger-800/40 text-danger-800 dark:text-danger-200",
    info: "bg-primary-50/70 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800/40 text-primary-800 dark:text-primary-200"
  };

  return (
    <Card className={`border shadow-sm mb-5 transition-all ${colorStyles[type] || colorStyles.warning}`}>
      <CardBody className="py-2.5 px-4 flex flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-warning-600 dark:text-warning-400" />
          <div>
            <span className="font-semibold mr-1">{title}:</span>
            <span className="opacity-90">{message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionText && (
            <Button
              size="sm"
              color={type === 'warning' ? 'warning' : 'primary'}
              variant="flat"
              className="text-xs font-semibold h-7 px-3"
              onPress={onAction}
            >
              {actionText}
            </Button>
          )}
          {onClose && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="h-6 w-6 min-w-6 text-default-400 hover:text-default-700"
              onPress={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
