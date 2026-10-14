import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Chip
} from '@heroui/react';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Box,
  Receipt,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatMoney, toISODate, dhakaNow, pad } from '../../utils/calculations';
import {
  exportSalesToCsv,
  exportProductsToCsv,
  exportInvoicesToCsv,
  exportExpensesToCsv
} from '../../utils/exportHelpers';

export default function ExportView({ showToast }) {
  const { sales = [], products = [], invoices = [], expenses = [] } = useData();

  const todayISO = toISODate(dhakaNow());
  const currentMonthISO = todayISO.slice(0, 7);
  const currentYearStr = String(new Date().getFullYear());

  // Export Target Tab
  const [selectedDataset, setSelectedDataset] = useState('sales'); // 'sales' | 'products' | 'invoices' | 'expenses'

  // Sales Range Preset
  const [rangePreset, setRangePreset] = useState('month'); // 'month' | 'year' | 'all' | 'custom'
  const [exMonth, setExMonth] = useState(currentMonthISO);
  const [exYear, setExYear] = useState(currentYearStr);
  const [exFrom, setExFrom] = useState(todayISO);
  const [exTo, setExTo] = useState(todayISO);

  // Available Years for Year Selector
  const availableYears = useMemo(() => {
    const years = new Set([currentYearStr]);
    sales.forEach((s) => {
      if (s.date && s.date.length >= 4) years.add(s.date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [sales, currentYearStr]);

  // Compute Active Range for Sales
  const activeRange = useMemo(() => {
    if (rangePreset === 'month') {
      const ym = exMonth || currentMonthISO;
      return { from: `${ym}-01`, to: `${ym}-31` };
    }
    if (rangePreset === 'year') {
      const y = exYear || currentYearStr;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    if (rangePreset === 'custom') {
      return { from: exFrom || '0000-01-01', to: exTo || '9999-12-31' };
    }
    return { from: '2000-01-01', to: '2099-12-31' };
  }, [rangePreset, exMonth, exYear, exFrom, exTo, currentMonthISO, currentYearStr]);

  // Filtered Sales in Range
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => s.date >= activeRange.from && s.date <= activeRange.to)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [sales, activeRange]);

  // Aggregate Metrics for Selected Sales Range
  const totalSale = filteredSales.reduce((acc, s) => acc + (Number(s.sale) || 0), 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  const totalCost = filteredSales.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);
  const totalPct = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0;

  // Handle Export Click
  const handleExport = () => {
    let success = false;
    if (selectedDataset === 'sales') {
      success = exportSalesToCsv(sales, activeRange.from, activeRange.to);
    } else if (selectedDataset === 'products') {
      success = exportProductsToCsv(products);
    } else if (selectedDataset === 'invoices') {
      success = exportInvoicesToCsv(invoices);
    } else if (selectedDataset === 'expenses') {
      success = exportExpensesToCsv(expenses);
    }

    if (success) {
      if (showToast) showToast('CSV downloaded successfully');
    } else {
      if (showToast) showToast('No records found to export');
    }
  };

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto py-1 animate-in fade-in duration-200 pb-6">
      {/* Dataset Selection Card */}
      <Card className="border border-default-200 bg-content1 shadow-sm">
        <CardBody className="p-4 sm:p-5 space-y-4">
          <div>
            <div className="text-xs uppercase font-extrabold text-primary tracking-wider font-display">
              Target Dataset
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mt-0.5">
              Choose what to export
            </h2>
            <p className="text-xs text-default-500 mt-0.5">
              Select which records to bundle into an offline comma-separated spreadsheet (.csv)
            </p>
          </div>

          {/* Dataset Tabs */}
          <Tabs
            selectedKey={selectedDataset}
            onSelectionChange={setSelectedDataset}
            color="primary"
            variant="bordered"
            size="sm"
          >
            <Tab
              key="sales"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Sales Entries ({sales.length})</span>
                </div>
              }
            />
            <Tab
              key="products"
              title={
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  <span>Product Tracker ({products.length})</span>
                </div>
              }
            />
            <Tab
              key="invoices"
              title={
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>Invoices ({invoices.length})</span>
                </div>
              }
            />
            <Tab
              key="expenses"
              title={
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Expenses ({expenses.length})</span>
                </div>
              }
            />
          </Tabs>

          {/* SALES RANGE CONFIGURATION (When Sales is selected) */}
          {selectedDataset === 'sales' && (
            <div className="space-y-4 pt-2 border-t border-default-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-default-500 mr-1">Period Preset:</span>
                <div className="inline-flex rounded-lg border border-default-200 p-0.5 bg-default-100 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRangePreset('month')}
                    className={`px-3 py-1 rounded transition-colors ${
                      rangePreset === 'month'
                        ? 'bg-content1 text-foreground shadow-2xs font-bold'
                        : 'text-default-500 hover:text-foreground'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangePreset('year')}
                    className={`px-3 py-1 rounded transition-colors ${
                      rangePreset === 'year'
                        ? 'bg-content1 text-foreground shadow-2xs font-bold'
                        : 'text-default-500 hover:text-foreground'
                    }`}
                  >
                    Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangePreset('all')}
                    className={`px-3 py-1 rounded transition-colors ${
                      rangePreset === 'all'
                        ? 'bg-content1 text-foreground shadow-2xs font-bold'
                        : 'text-default-500 hover:text-foreground'
                    }`}
                  >
                    All time
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangePreset('custom')}
                    className={`px-3 py-1 rounded transition-colors ${
                      rangePreset === 'custom'
                        ? 'bg-content1 text-foreground shadow-2xs font-bold'
                        : 'text-default-500 hover:text-foreground'
                    }`}
                  >
                    Custom range
                  </button>
                </div>
              </div>

              {/* Dynamic Range Pickers */}
              {rangePreset === 'month' && (
                <div className="max-w-xs">
                  <Input
                    label="Month to Export"
                    labelPlacement="outside"
                    type="month"
                    size="sm"
                    variant="bordered"
                    value={exMonth}
                    onChange={(e) => setExMonth(e.target.value)}
                    startContent={<Calendar className="w-4 h-4 text-default-400" />}
                  />
                </div>
              )}

              {rangePreset === 'year' && (
                <div className="max-w-xs">
                  <Select
                    label="Year to Export"
                    labelPlacement="outside"
                    size="sm"
                    radius="sm"
                    disableAnimation
                    variant="bordered"
                    selectedKeys={new Set([exYear])}
                    onSelectionChange={(keys) => {
                      const k = Array.from(keys)[0];
                      if (k) setExYear(String(k));
                    }}
                    classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                    popoverProps={{
                      disableAnimation: true,
                      classNames: {
                        content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                      }
                    }}
                  >
                    {availableYears.map((y) => (
                      <SelectItem key={y} textValue={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              )}

              {rangePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                  <Input
                    label="From Date"
                    labelPlacement="outside"
                    type="date"
                    size="sm"
                    variant="bordered"
                    value={exFrom}
                    onChange={(e) => setExFrom(e.target.value)}
                  />
                  <Input
                    label="To Date"
                    labelPlacement="outside"
                    type="date"
                    size="sm"
                    variant="bordered"
                    value={exTo}
                    onChange={(e) => setExTo(e.target.value)}
                  />
                </div>
              )}

              {/* Summary Metrics Box for Selected Sales Range */}
              <div className="p-4 rounded-xl border border-default-200 bg-default-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-default-500 font-display">
                    Export Preview Summary
                  </span>
                  <Chip size="sm" variant="flat" color="primary" className="font-bold text-xs">
                    {filteredSales.length} records ready
                  </Chip>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-default-400">Total Sales</div>
                    <div className="text-base font-black font-numeric text-foreground mt-0.5">
                      {formatMoney(totalSale)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-success">Total Profit</div>
                    <div className="text-base font-black font-numeric text-success mt-0.5">
                      {formatMoney(totalProfit)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-teal-600">Daily Cost</div>
                    <div className="text-base font-black font-numeric text-teal-600 mt-0.5">
                      {formatMoney(totalCost)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-primary">Profit Margin</div>
                    <div className="text-base font-black font-numeric text-primary mt-0.5">
                      {totalPct}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER DATASETS INFO (When Products, Invoices, or Expenses is selected) */}
          {selectedDataset !== 'sales' && (
            <div className="p-4 rounded-xl border border-default-200 bg-default-50/70 space-y-2 text-xs text-default-500">
              <div className="font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>
                  Ready to export complete {selectedDataset === 'products' ? 'Product Tracker' : selectedDataset === 'invoices' ? 'Invoices' : 'Operating Expenses'} database
                </span>
              </div>
              <p>
                All {selectedDataset === 'products' ? products.length : selectedDataset === 'invoices' ? invoices.length : expenses.length} historical entries will be cleanly formatted into standard tabular CSV columns.
              </p>
            </div>
          )}

          {/* Download Button */}
          <div className="pt-2">
            <Button
              color="primary"
              size="md"
              className="font-bold"
              startContent={<Download className="w-4 h-4" />}
              onPress={handleExport}
            >
              Download CSV Spreadsheet
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
