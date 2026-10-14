import React from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function MissingSalesBanner({ missingDays = [], onReview }) {
  if (!missingDays || missingDays.length === 0) return null;

  const count = missingDays.length;
  const sampleDays = missingDays.slice(0, 3).map(d => d.dayNameEn).join(', ');
  const extra = count > 3 ? ` +${count - 3} more` : '';

  return (
    <Card className="border border-warning-300/80 bg-warning-50/60 dark:bg-warning-950/20 dark:border-warning-800/60 shadow-sm">
      <CardBody className="py-3 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning-100 dark:bg-warning-900/40 text-warning-600 dark:text-warning-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-warning-900 dark:text-warning-200">
              {count === 1
                ? `Missing sales entry for ${missingDays[0].dayNameEn} (${missingDays[0].formattedLabel})`
                : `${count} missing sales days found: ${sampleDays}${extra}`
              }
            </div>
            <div className="text-[11px] text-warning-700/80 dark:text-warning-300/70">
              Recent ledger records indicate days without recorded closing sales or off-day tags.
            </div>
          </div>
        </div>

        <Button
          size="sm"
          color="warning"
          variant="solid"
          className="font-bold text-xs shrink-0 shadow-sm"
          endContent={<ArrowRight className="w-3.5 h-3.5" />}
          onPress={onReview}
        >
          Review & Fill
        </Button>
      </CardBody>
    </Card>
  );
}
