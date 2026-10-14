import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card, CardHeader, CardBody, Select, SelectItem, Chip } from '@heroui/react';
import {
  formatMoney,
  formatMoneyShort,
  formatPct,
  MONTHS,
  dhakaNow,
  pad
} from '../../utils/calculations';

export default function DashboardCharts({ sales = [], isDark = false }) {
  // Canvases refs
  const canvas6MonthRef = useRef(null);
  const canvasMultiSalesRef = useRef(null);
  const canvasMultiProfitRef = useRef(null);
  const canvasByMonthRef = useRef(null);
  const canvasCompositionRef = useRef(null);
  const canvasByYearRef = useRef(null);
  const canvasWeekdayRef = useRef(null);
  const canvasTrendRef = useRef(null);
  const canvasMarginRef = useRef(null);

  // Chart instances refs
  const chartInstances = useRef({});

  const today = dhakaNow();
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth();

  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Extract available years from sales data
  const availableYears = Array.from(
    new Set(
      sales
        .map(s => s.date ? s.date.slice(0, 4) : null)
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  if (!availableYears.includes(String(currentYear))) {
    availableYears.unshift(String(currentYear));
  }

  useEffect(() => {
    // Colors based on theme
    const textColor = isDark ? '#9aa3b2' : '#6b7280';
    const gridColor = isDark ? 'rgba(42, 48, 61, 0.6)' : 'rgba(228, 231, 238, 0.7)';
    const primaryColor = isDark ? '#4fa8f0' : '#2f8fe0';
    const tealColor = isDark ? '#4fd8c4' : '#0e8c81';
    const warnColor = isDark ? '#e3a84a' : '#a5670c';
    const dangerColor = isDark ? '#ff7566' : '#d5573f';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Helper: destroy prior instance
    const destroyChart = (key) => {
      if (chartInstances.current[key]) {
        chartInstances.current[key].destroy();
        chartInstances.current[key] = null;
      }
    };

    // 1. 6-Month Profit Comparison Chart
    if (canvas6MonthRef.current) {
      destroyChart('6month');
      const monthsBack = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        const mLabel = `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
        const mProfit = sales
          .filter(s => s.date && s.date.startsWith(yk))
          .reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
        monthsBack.push({ label: mLabel, profit: mProfit });
      }

      chartInstances.current['6month'] = new Chart(canvas6MonthRef.current, {
        type: 'bar',
        data: {
          labels: monthsBack.map(m => m.label),
          datasets: [{
            label: 'Profit',
            data: monthsBack.map(m => m.profit),
            backgroundColor: monthsBack.map((_, i) => i === 5 ? primaryColor : (isDark ? 'rgba(79, 168, 240, 0.4)' : 'rgba(47, 143, 224, 0.35)')),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Profit: ${formatMoney(ctx.raw)}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: gridColor },
              ticks: { callback: v => formatMoneyShort(v) }
            }
          }
        }
      });
    }

    // 2 & 3. Multi-Year Cumulative Sales & Profit Trajectory
    const yearPalette = [
      { year: currentYear - 3, color: '#8b5cf6', width: 2 },
      { year: currentYear - 2, color: '#f59e0b', width: 2 },
      { year: currentYear - 1, color: tealColor, width: 2 },
      { year: currentYear, color: primaryColor, width: 3.5, isCurrent: true }
    ];

    const generateTrajectoryDatasets = (field, isProfit = false) => {
      return yearPalette.map(meta => {
        const isCur = meta.isCurrent;
        const series = [];
        let running = 0;
        for (let m = 0; m < 12; m++) {
          if (isCur && m > currentMonthIdx) {
            series.push(null);
          } else {
            const mKey = `${meta.year}-${pad(m + 1)}`;
            const mSum = sales
              .filter(s => s.date && s.date.startsWith(mKey))
              .reduce((a, s) => a + (Number(s[field]) || 0), 0);
            running += mSum;
            series.push(running);
          }
        }
        const color = isProfit && isCur ? tealColor : meta.color;
        return {
          label: isCur ? `${meta.year} (Current)` : String(meta.year),
          data: series,
          borderColor: color,
          borderWidth: meta.width,
          backgroundColor: isCur ? (color + '15') : 'transparent',
          fill: isCur,
          tension: 0.3,
          spanGaps: false
        };
      });
    };

    if (canvasMultiSalesRef.current) {
      destroyChart('multiSales');
      chartInstances.current['multiSales'] = new Chart(canvasMultiSalesRef.current, {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: generateTrajectoryDatasets('sale', false)
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, ticks: { callback: v => formatMoneyShort(v) } }
          }
        }
      });
    }

    if (canvasMultiProfitRef.current) {
      destroyChart('multiProfit');
      chartInstances.current['multiProfit'] = new Chart(canvasMultiProfitRef.current, {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: generateTrajectoryDatasets('profit', true)
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, ticks: { callback: v => formatMoneyShort(v) } }
          }
        }
      });
    }

    // 4. By Month (Sale, Cost, Profit) for Selected Year
    if (canvasByMonthRef.current) {
      destroyChart('byMonth');
      const salesByMonth = [];
      const costByMonth = [];
      const profitByMonth = [];

      for (let m = 0; m < 12; m++) {
        const mKey = `${selectedYear}-${pad(m + 1)}`;
        const mSales = sales.filter(s => s.date && s.date.startsWith(mKey));
        const sTotal = mSales.reduce((a, s) => a + (Number(s.sale) || 0), 0);
        const pTotal = mSales.reduce((a, s) => a + (Number(s.profit) || 0), 0);
        salesByMonth.push(sTotal);
        costByMonth.push(sTotal - pTotal);
        profitByMonth.push(pTotal);
      }

      chartInstances.current['byMonth'] = new Chart(canvasByMonthRef.current, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            { label: 'Sale', data: salesByMonth, backgroundColor: primaryColor, borderRadius: 4 },
            { label: 'Cost', data: costByMonth, backgroundColor: isDark ? '#475569' : '#cbd5e1', borderRadius: 4 },
            { label: 'Profit', data: profitByMonth, backgroundColor: tealColor, borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, ticks: { callback: v => formatMoneyShort(v) } }
          }
        }
      });
    }

    // 5. Daily Sales (Last 30 Days)
    if (canvasTrendRef.current) {
      destroyChart('trend');
      const last30 = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const daySum = sales
          .filter(s => s.date === iso)
          .reduce((a, s) => a + (Number(s.sale) || 0), 0);
        last30.push({ label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, sale: daySum });
      }

      chartInstances.current['trend'] = new Chart(canvasTrendRef.current, {
        type: 'line',
        data: {
          labels: last30.map(d => d.label),
          datasets: [{
            label: 'Sales',
            data: last30.map(d => d.sale),
            borderColor: primaryColor,
            backgroundColor: primaryColor + '18',
            borderWidth: 2,
            fill: true,
            tension: 0.25,
            pointRadius: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` Sale: ${formatMoney(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
            y: { grid: { color: gridColor }, ticks: { callback: v => formatMoneyShort(v) } }
          }
        }
      });
    }

    // 6. Average Sale by Weekday
    if (canvasWeekdayRef.current) {
      destroyChart('weekday');
      const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
      const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
      const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu (Off)', 'Fri', 'Sat'];

      sales.forEach(s => {
        if (!s.date) return;
        const d = new Date(s.date + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const day = d.getDay();
          weekdayTotals[day] += Number(s.sale) || 0;
          weekdayCounts[day] += 1;
        }
      });

      const weekdayAverages = weekdayTotals.map((tot, idx) => {
        const count = weekdayCounts[idx] || 1;
        return Math.round(tot / count);
      });

      chartInstances.current['weekday'] = new Chart(canvasWeekdayRef.current, {
        type: 'bar',
        data: {
          labels: weekdayLabels,
          datasets: [{
            label: 'Average Sale',
            data: weekdayAverages,
            backgroundColor: primaryColor,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` Avg: ${formatMoney(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, ticks: { callback: v => formatMoneyShort(v) } }
          }
        }
      });
    }

    // 7. Profit Margin % (Last 12 Months)
    if (canvasMarginRef.current) {
      destroyChart('margin');
      const margins12 = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        const mSales = sales.filter(s => s.date && s.date.startsWith(yk));
        const sTotal = mSales.reduce((a, s) => a + (Number(s.sale) || 0), 0);
        const pTotal = mSales.reduce((a, s) => a + (Number(s.profit) || 0), 0);
        const pct = sTotal > 0 ? (pTotal / sTotal) * 100 : 0;
        margins12.push({ label: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`, pct: Math.round(pct * 10) / 10 });
      }

      chartInstances.current['margin'] = new Chart(canvasMarginRef.current, {
        type: 'line',
        data: {
          labels: margins12.map(m => m.label),
          datasets: [{
            label: 'Margin %',
            data: margins12.map(m => m.pct),
            borderColor: tealColor,
            backgroundColor: tealColor + '18',
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` Margin: ${ctx.raw}%` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: gridColor },
              ticks: { callback: v => `${v}%` }
            }
          }
        }
      });
    }

    return () => {
      Object.keys(chartInstances.current).forEach(k => {
        if (chartInstances.current[k]) {
          chartInstances.current[k].destroy();
        }
      });
    };
  }, [sales, selectedYear, isDark]);

  return (
    <div className="space-y-6">
      {/* Trajectory comparison grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              Cumulative Sales Trajectory
            </h3>
            <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-semibold">
              Jan → Dec (Multi-Year)
            </Chip>
          </CardHeader>
          <CardBody className="p-4 h-[270px]">
            <canvas ref={canvasMultiSalesRef}></canvas>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              Cumulative Profit Trajectory
            </h3>
            <Chip size="sm" variant="flat" color="success" className="text-[10px] font-semibold">
              Jan → Dec (Multi-Year)
            </Chip>
          </CardHeader>
          <CardBody className="p-4 h-[270px]">
            <canvas ref={canvasMultiProfitRef}></canvas>
          </CardBody>
        </Card>
      </div>

      {/* Monthly performance & Selected Year breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="border border-default-200/70 bg-content1 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              By Month — Sale / Cost / Profit
            </h3>
            <div className="w-28 shrink-0">
              <Select
                size="sm"
                aria-label="Year"
                selectedKeys={new Set([selectedYear])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) setSelectedYear(String(val));
                }}
                variant="bordered"
                classNames={{ trigger: "h-8 min-h-8 text-xs font-semibold" }}
              >
                {availableYears.map(y => (
                  <SelectItem key={y} textValue={y}>{y}</SelectItem>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardBody className="p-4 h-[280px]">
            <canvas ref={canvasByMonthRef}></canvas>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              6-Month Profit Comparison
            </h3>
            <span className="text-[10px] text-default-400 font-medium">Recent Trend</span>
          </CardHeader>
          <CardBody className="p-4 h-[280px]">
            <canvas ref={canvas6MonthRef}></canvas>
          </CardBody>
        </Card>
      </div>

      {/* Daily trend, weekday distribution & profit margins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              Daily Sales (Last 30 Days)
            </h3>
          </CardHeader>
          <CardBody className="p-4 h-[250px]">
            <canvas ref={canvasTrendRef}></canvas>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              Average Sale by Weekday
            </h3>
          </CardHeader>
          <CardBody className="p-4 h-[250px]">
            <canvas ref={canvasWeekdayRef}></canvas>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardHeader className="flex justify-between items-center px-5 pt-4 pb-1">
            <h3 className="text-sm font-bold font-display text-foreground">
              Profit Margin % (Last 12 Months)
            </h3>
          </CardHeader>
          <CardBody className="p-4 h-[250px]">
            <canvas ref={canvasMarginRef}></canvas>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
