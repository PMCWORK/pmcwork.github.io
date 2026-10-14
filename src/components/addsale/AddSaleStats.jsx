import React from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  formatMoney,
  formatPct,
  monthToDateRange,
  sparklinePoints,
  dhakaNow,
  toISODate
} from '../../utils/calculations';

export default function AddSaleStats({ sales = [] }) {
  const today = dhakaNow();
  const todayISO = toISODate(today);

  const thisMonthR = monthToDateRange(0);
  const lastMonthR = monthToDateRange(-1);

  const thisMonthSales = sales.filter(s => s.date >= thisMonthR.from && s.date <= thisMonthR.to);
  const lastMonthSales = sales.filter(s => s.date >= lastMonthR.from && s.date <= lastMonthR.to);

  const revenue = thisMonthSales.reduce((a, s) => a + (Number(s.sale) || 0), 0);
  const profit = thisMonthSales.reduce((a, s) => a + (Number(s.profit) || 0), 0);
  const lastRevenue = lastMonthSales.reduce((a, s) => a + (Number(s.sale) || 0), 0);
  const lastProfit = lastMonthSales.reduce((a, s) => a + (Number(s.profit) || 0), 0);

  const revDelta = lastRevenue > 0 ? (revenue - lastRevenue) / lastRevenue : null;
  const profDelta = lastProfit > 0 ? (profit - lastProfit) / lastProfit : null;

  // 90-day margin
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffISO = toISODate(cutoff);
  const window90 = sales.filter(s => s.date >= cutoffISO && s.date <= todayISO);
  const avgMargin = window90.length
    ? window90.reduce((a, s) => a + (Number(s.profitPct) || (s.sale > 0 ? (s.profit / s.sale) : 0)), 0) / window90.length
    : 0;

  // Sparkline points for recent 10 sales
  const last10 = [...sales].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(-10);
  const revSpark = sparklinePoints(last10.map(s => Number(s.sale) || 0));
  const profSpark = sparklinePoints(last10.map(s => Number(s.profit) || 0));
  const marginSpark = sparklinePoints(last10.map(s => Number(s.profitPct) || 0));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* 1. Revenue This Month */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardBody className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
              Revenue — this month
            </span>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 26">
              <polyline
                points={revSpark}
                fill="none"
                stroke="#2f8fe0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-2xl font-bold font-display text-foreground my-1">
            {formatMoney(revenue)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
            {revDelta === null ? (
              <span className="text-default-400">No prior month data</span>
            ) : (
              <div className={`flex items-center gap-1 ${revDelta >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
                {revDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{revDelta >= 0 ? '+' : ''}{formatPct(revDelta)} vs last month</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 2. Profit This Month */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardBody className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
              Profit — this month
            </span>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 26">
              <polyline
                points={profSpark}
                fill="none"
                stroke="#0e8c81"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-2xl font-bold font-display text-teal-600 dark:text-teal-400 my-1">
            {formatMoney(profit)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
            {profDelta === null ? (
              <span className="text-default-400">No prior month data</span>
            ) : (
              <div className={`flex items-center gap-1 ${profDelta >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
                {profDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{profDelta >= 0 ? '+' : ''}{formatPct(profDelta)} vs last month</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 3. 90-Day Average Margin */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardBody className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
              Avg. margin — 90d
            </span>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 26">
              <polyline
                points={marginSpark}
                fill="none"
                stroke="#9aa1af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-2xl font-bold font-display text-foreground my-1">
            {formatPct(avgMargin)}
          </div>
          <div className="text-xs text-default-400 pt-1">
            Steady across the quarter
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
