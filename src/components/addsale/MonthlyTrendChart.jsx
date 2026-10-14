import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card, CardHeader, CardBody, Select, SelectItem } from '@heroui/react';
import { TrendingUp } from 'lucide-react';
import {
  formatMoney,
  formatMoneyShort,
  MONTHS,
  dhakaNow,
  pad,
  cumulativeMonthSeries
} from '../../utils/calculations';

export default function MonthlyTrendChart({ sales = [], isDark = false }) {
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const today = dhakaNow();
  const fallbackLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const defaultCompareKey = `${fallbackLastMonth.getFullYear()}-${pad(fallbackLastMonth.getMonth() + 1)}`;

  const [compareMonthKey, setCompareMonthKey] = useState(defaultCompareKey);

  // Generate available compare months (last 12 months)
  const compareOptions = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    compareOptions.push({ key, label });
  }

  // Safe parsing of compare month
  const activeKey = compareMonthKey || defaultCompareKey;
  const parts = activeKey.split('-').map(Number);
  const cy = (!isNaN(parts[0]) && parts[0] > 0) ? parts[0] : fallbackLastMonth.getFullYear();
  const cm = (!isNaN(parts[1]) && parts[1] >= 1 && parts[1] <= 12) ? parts[1] : (fallbackLastMonth.getMonth() + 1);
  const compareLabel = `${MONTHS[cm - 1]} ${cy}`;

  const daysInCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() || 30;
  const daysInCompare = new Date(cy, cm, 0).getDate() || 30;
  const maxDays = Math.max(daysInCurrent, daysInCompare);

  const rawCompareSeries = cumulativeMonthSeries(sales, cy, cm - 1, null);
  const rawCurrentSeries = cumulativeMonthSeries(sales, today.getFullYear(), today.getMonth(), today.getDate());

  const compareSeries = [...rawCompareSeries];
  const currentSeries = [...rawCurrentSeries];

  while (compareSeries.length < maxDays) compareSeries.push(null);
  while (currentSeries.length < maxDays) currentSeries.push(null);

  const todayIdx = Math.max(0, today.getDate() - 1);
  const currentTotal = currentSeries[todayIdx] ?? 0;
  const sameDayIdx = Math.min(today.getDate(), daysInCompare) - 1;
  const compareAtSameDay = compareSeries[sameDayIdx] ?? 0;

  useEffect(() => {
    if (!canvasRef.current || isNaN(maxDays) || maxDays <= 0) return;

    const accent = isDark ? '#4fa8f0' : '#2f8fe0';
    const mutedLine = isDark ? '#64748b' : '#9aa1af';
    const grid = isDark ? 'rgba(42, 48, 61, 0.6)' : 'rgba(228, 231, 238, 0.7)';
    const tickColor = isDark ? '#9aa3b2' : '#6b7280';

    const labels = Array.from({ length: maxDays }, (_, i) => i + 1);
    const pointRadii = currentSeries.map((v, i) => (i === todayIdx ? 4.5 : 0));

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    try {
      chartInstance.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: compareLabel,
              data: compareSeries,
              borderColor: mutedLine,
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [3, 3],
              pointRadius: 0,
              tension: 0.3,
              spanGaps: false
            },
            {
              label: 'This month',
              data: currentSeries,
              borderColor: accent,
              backgroundColor: accent + '18',
              fill: true,
              borderWidth: 2.5,
              pointRadius: pointRadii,
              pointBackgroundColor: accent,
              pointBorderColor: isDark ? '#1a1e27' : '#ffffff',
              pointBorderWidth: 2,
              tension: 0.3,
              spanGaps: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: tickColor, maxTicksLimit: 8 }
            },
            y: {
              grid: { color: grid },
              ticks: { color: tickColor, callback: (v) => formatMoneyShort(v) }
            }
          }
        }
      });
    } catch (e) {
      console.warn('renderTrendChart error:', e);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [sales, activeKey, isDark, maxDays]);

  return (
    <Card className="border border-default-200/70 bg-content1 shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-base font-semibold font-display text-foreground m-0">
            Monthly trend
          </h3>
        </div>

        <div className="w-40 shrink-0">
          <Select
            size="sm"
            aria-label="Comparison Month"
            selectedKeys={new Set([activeKey])}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k) setCompareMonthKey(String(k));
            }}
            variant="bordered"
            classNames={{ trigger: "h-9 min-h-9 text-xs font-semibold border-default-300" }}
          >
            {compareOptions.map((opt) => (
              <SelectItem key={opt.key} textValue={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6 pt-2 flex-1 flex flex-col justify-between">
        {/* Trend stats row matching legacy trend-stats */}
        <div className="flex items-center gap-8 pb-4 mb-2 flex-wrap">
          <div className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
            <div>
              <div className="text-[11px] text-default-400 font-medium">This month</div>
              <div className="text-xl sm:text-2xl font-bold font-numeric text-primary leading-tight mt-0.5">
                {formatMoney(currentTotal)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-default-400 mt-1.5 shrink-0"></span>
            <div>
              <div className="text-[11px] text-default-400 font-medium">{compareLabel}</div>
              <div className="text-xl sm:text-2xl font-bold font-numeric text-default-500 leading-tight mt-0.5">
                {formatMoney(compareAtSameDay)}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Wrap */}
        <div className="h-[290px] w-full relative">
          <canvas ref={canvasRef}></canvas>
        </div>
      </CardBody>
    </Card>
  );
}
