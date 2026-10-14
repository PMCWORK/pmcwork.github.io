import React, { useState } from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import MetricCard from '../common/MetricCard';
import MissingSalesBanner from './MissingSalesBanner';
import MissingSalesModal from './MissingSalesModal';
import DashboardCharts from './DashboardCharts';
import { useData } from '../../context/DataContext';
import {
  formatMoney,
  formatPct,
  monthToDateRange,
  yearToDateRange,
  sumInRange,
  dhakaNow,
  toISODate,
  getMissingSalesDays
} from '../../utils/calculations';

export default function DashboardView({ isDark, onNavigateToAddSale }) {
  const { sales, isLoading } = useData();
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [offDays, setOffDays] = useState([]);

  const today = dhakaNow();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = toISODate(yesterday);

  // 1. Yesterday KPI
  const yesterdaySales = sales.filter(s => s.date === yesterdayISO);
  const yesterdaySaleTotal = yesterdaySales.reduce((a, s) => a + (Number(s.sale) || 0), 0);
  const yesterdayProfitTotal = yesterdaySales.reduce((a, s) => a + (Number(s.profit) || 0), 0);
  const yesterdayMargin = yesterdaySaleTotal > 0 ? (yesterdayProfitTotal / yesterdaySaleTotal) * 100 : 0;

  // 2. This Month KPI
  const thisMonthR = monthToDateRange(0);
  const lastMonthR = monthToDateRange(-1);
  const thisMonthTD = sumInRange(sales, thisMonthR.from, thisMonthR.to);
  const lastMonthTD = sumInRange(sales, lastMonthR.from, lastMonthR.to);

  const monthDelta = lastMonthTD.sale > 0
    ? (thisMonthTD.sale - lastMonthTD.sale) / lastMonthTD.sale
    : null;

  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projMonth = daysElapsed > 0 ? (thisMonthTD.sale / daysElapsed) * daysInMonth : 0;

  // 3. This Year KPI
  const thisYearR = yearToDateRange(0);
  const lastYearR = yearToDateRange(-1);
  const thisYearTD = sumInRange(sales, thisYearR.from, thisYearR.to);
  const lastYearTD = sumInRange(sales, lastYearR.from, lastYearR.to);

  const yearDelta = lastYearTD.sale > 0
    ? (thisYearTD.sale - lastYearTD.sale) / lastYearTD.sale
    : null;

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - startOfYear) / 86400000) + 1;
  const isLeap = (today.getFullYear() % 4 === 0 && today.getFullYear() % 100 !== 0) || today.getFullYear() % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  const projYear = dayOfYear > 0 ? (thisYearTD.sale / dayOfYear) * daysInYear : 0;

  // 4. Missing Sales
  const missingSalesDays = getMissingSalesDays(sales, offDays, 30);

  const handleMarkOffDay = (iso) => {
    setOffDays(prev => [...prev, iso]);
  };

  const handleFillSale = (iso) => {
    setIsMissingModalOpen(false);
    onNavigateToAddSale?.(iso);
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Missing Sales Alert Banner */}
      <MissingSalesBanner
        missingDays={missingSalesDays}
        onReview={() => setIsMissingModalOpen(true)}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <MetricCard
          label="Yesterday"
          value={formatMoney(yesterdaySaleTotal)}
          subLabel="Profit"
          subValue={`${formatMoney(yesterdayProfitTotal)} (${Math.round(yesterdayMargin)}%)`}
          comparisonText={yesterdaySaleTotal > 0 ? "Recorded" : "No Sales"}
          comparisonType={yesterdaySaleTotal > 0 ? "up" : "neutral"}
        />

        <MetricCard
          label="This Month"
          value={formatMoney(thisMonthTD.sale)}
          subLabel="vs last month (same day)"
          subValue={formatMoney(lastMonthTD.sale)}
          comparisonText={
            monthDelta === null
              ? "No baseline"
              : `${monthDelta >= 0 ? '+' : ''}${formatPct(monthDelta)}`
          }
          comparisonType={
            monthDelta === null ? "neutral" : (monthDelta >= 0 ? "up" : "down")
          }
          forecastText={`Projected month end: ${formatMoney(projMonth)}`}
        />

        <MetricCard
          label="This Year"
          value={formatMoney(thisYearTD.sale)}
          subLabel="vs last year (same day)"
          subValue={formatMoney(lastYearTD.sale)}
          comparisonText={
            yearDelta === null
              ? "No baseline"
              : `${yearDelta >= 0 ? '+' : ''}${formatPct(yearDelta)}`
          }
          comparisonType={
            yearDelta === null ? "neutral" : (yearDelta >= 0 ? "up" : "down")
          }
          forecastText={`Projected year end: ${formatMoney(projYear)}`}
        />
      </div>

      {/* Interactive Visual Analytics Charts */}
      <DashboardCharts sales={sales} isDark={isDark} />

      {/* Missing Sales Review Modal */}
      <MissingSalesModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        missingDays={missingSalesDays}
        onFillSale={handleFillSale}
        onMarkOffDay={handleMarkOffDay}
      />
    </div>
  );
}
