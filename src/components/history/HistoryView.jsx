import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
  Tooltip
} from '@heroui/react';
import {
  History,
  Search,
  RotateCcw,
  Download,
  Edit2,
  Trash2,
  Calendar,
  TrendingUp,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import SaleEditModal from './SaleEditModal';
import {
  dhakaNow,
  toISODate,
  formatDateLabel,
  bnDay,
  formatMoney,
  formatPct,
  downloadCSV,
  buildSalesCSV,
  pad
} from '../../utils/calculations';

export default function HistoryView({ showToast }) {
  const { user } = useAuth();
  const { sales = [], syncAllData } = useData();
  const { appConfirm } = useDialog();

  const today = dhakaNow();
  const todayISO = toISODate(today);
  const currentYear = String(today.getFullYear());
  const currentMonth = todayISO.slice(0, 7);

  // Filter and sort state
  const [periodMode, setPeriodMode] = useState('month'); // 'month', 'year', 'range', 'any'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  // Edit modal state
  const [editingSale, setEditingSale] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Available years from dataset
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    sales.forEach(s => {
      if (s.date && s.date.length >= 4) {
        yearsSet.add(s.date.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [sales, currentYear]);

  // Compute active date range
  const currentRange = useMemo(() => {
    if (periodMode === 'any') {
      return { from: '0000-01-01', to: '9999-12-31' };
    }
    if (periodMode === 'month') {
      if (!selectedMonth) return { from: '0000-01-01', to: '9999-12-31' };
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${selectedMonth}-01`, to: `${selectedMonth}-${pad(lastDay)}` };
    }
    if (periodMode === 'year') {
      if (!selectedYear) return { from: '0000-01-01', to: '9999-12-31' };
      return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
    }
    if (periodMode === 'range') {
      return {
        from: dateFrom || '0000-01-01',
        to: dateTo || '9999-12-31'
      };
    }
    return { from: '0000-01-01', to: '9999-12-31' };
  }, [periodMode, selectedMonth, selectedYear, dateFrom, dateTo]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const inRange = s.date >= currentRange.from && s.date <= currentRange.to;
      if (!inRange) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dateMatch = (s.date || '').toLowerCase().includes(q);
        const labelMatch = formatDateLabel(s.date).toLowerCase().includes(q);
        const dayMatch = bnDay(s.date).toLowerCase().includes(q);
        const enteredMatch = (s.enteredBy || '').toLowerCase().includes(q);
        if (!dateMatch && !labelMatch && !dayMatch && !enteredMatch) return false;
      }
      return true;
    });
  }, [sales, currentRange, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const [field, dir] = sortKey.split('-');
    const multiplier = dir === 'asc' ? 1 : -1;

    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      if (field === 'date') {
        cmp = (a.date || '').localeCompare(b.date || '');
      } else if (field === 'day') {
        cmp = bnDay(a.date).localeCompare(bnDay(b.date));
      } else if (field === 'sale') {
        cmp = (Number(a.sale) || 0) - (Number(b.sale) || 0);
      } else if (field === 'profit') {
        cmp = (Number(a.profit) || 0) - (Number(b.profit) || 0);
      } else if (field === 'cost') {
        cmp = (Number(a.cost) || 0) - (Number(b.cost) || 0);
      } else if (field === 'margin') {
        cmp = (Number(a.profitPct) || 0) - (Number(b.profitPct) || 0);
      }
      return cmp * multiplier;
    });
  }, [filteredRows, sortKey]);

  // Aggregated totals of currently filtered rows
  const totals = useMemo(() => {
    const totalSale = filteredRows.reduce((sum, s) => sum + (Number(s.sale) || 0), 0);
    const totalProfit = filteredRows.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const totalCost = filteredRows.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    const totalMargin = totalSale > 0 ? totalProfit / totalSale : 0;
    return {
      count: filteredRows.length,
      sale: totalSale,
      profit: totalProfit,
      cost: totalCost,
      margin: totalMargin
    };
  }, [filteredRows]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;

  // Reset filters
  const handleResetFilters = () => {
    setPeriodMode('month');
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setDateFrom('');
    setDateTo('');
    setSortKey('date-desc');
    setSearchQuery('');
    setPage(1);
    showToast?.('Filters reset to current month');
  };

  // CSV export
  const handleExportCSV = () => {
    if (!filteredRows.length) {
      showToast?.('No entries to export in this range.');
      return;
    }
    const csvContent = buildSalesCSV(sortedRows);
    const fileName = `pmc-sales-history-${currentRange.from}_to_${currentRange.to}.csv`;
    downloadCSV(csvContent, fileName);
    showToast?.(`CSV exported (${sortedRows.length} entries)`);
  };

  // Toggle column sort
  const handleColumnSort = (field) => {
    const [currentField, currentDir] = sortKey.split('-');
    if (currentField === field) {
      setSortKey(`${field}-${currentDir === 'asc' ? 'desc' : 'asc'}`);
    } else {
      setSortKey(`${field}-desc`);
    }
  };

  // Delete sale entry
  const handleDeleteSale = async (s) => {
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    const confirmed = await appConfirm({
      title: 'Delete Sale Entry',
      message: `Delete sale entry for ${formatDateLabel(s.date)} (${formatMoney(s.sale)})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

    if (!confirmed) return;

    try {
      const before = {
        date: s.date,
        sale: s.sale,
        profit: s.profit,
        cost: s.cost,
        profitPct: s.profitPct,
        enteredBy: s.enteredBy
      };

      await db.collection('sales').doc(s.id).delete();
      await logAudit('sale', s.id, 'delete', before, null, user);

      syncAllData?.();
      showToast?.('Sale entry deleted');
    } catch (err) {
      console.error('Delete error:', err);
      showToast?.('Failed to delete sale entry');
    }
  };

  // Open edit modal
  const handleEditSale = (s) => {
    setEditingSale(s);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Header Card with Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-400">
              Total sales ({totals.count})
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-primary mt-0.5">
              {formatMoney(totals.sale)}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Total profit
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-teal-600 dark:text-teal-400 mt-0.5">
              {formatMoney(totals.profit)}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-400">
              Total cost
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-default-600 mt-0.5">
              {formatMoney(totals.cost)}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200/70 bg-content1 shadow-sm">
          <CardBody className="p-3 sm:p-3.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-400">
              Avg. margin
            </span>
            <div className="text-lg sm:text-xl font-bold font-numeric text-foreground mt-0.5">
              {formatPct(totals.margin)}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Ledger Card */}
      <Card className="border border-default-200/70 bg-content1 shadow-sm">
        <CardHeader className="px-4 sm:px-5 py-2.5 border-b border-default-200/60 block">
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
            {/* Left & Center: Title + Period Selector + Dynamic Inputs + Reset Button */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Icon & Title (No subtitle) */}
              <div className="flex items-center gap-2 shrink-0 mr-0.5 sm:mr-1">
                <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary">
                  <History className="w-4 h-4" />
                </div>
                <h1 className="text-base sm:text-lg font-bold font-display text-foreground m-0 whitespace-nowrap">
                  Sales history
                </h1>
              </div>

              {/* 1. Period Selector (Extended width + radius="sm" per Image 2) */}
              <Select
                size="sm"
                radius="sm"
                disableAnimation
                aria-label="Period"
                variant="bordered"
                selectedKeys={new Set([periodMode])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) {
                    setPeriodMode(String(val));
                    setPage(1);
                  }
                }}
                className="w-36 sm:w-40"
                classNames={{
                  trigger: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
                }}
                popoverProps={{
                  disableAnimation: true,
                  classNames: {
                    content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                  }
                }}
                listboxProps={{
                  itemClasses: {
                    base: "rounded-xs px-2.5 py-1.5 text-xs text-foreground data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50/15"
                  }
                }}
              >
                <SelectItem key="month" textValue="Month">Month</SelectItem>
                <SelectItem key="year" textValue="Year">Year</SelectItem>
                <SelectItem key="range" textValue="Date Range">Date Range</SelectItem>
                <SelectItem key="any" textValue="All time">All time</SelectItem>
              </Select>

              {/* 2. Dynamic Period Inputs */}
              {periodMode === 'month' && (
                <Input
                  type="month"
                  size="sm"
                  radius="sm"
                  aria-label="Select Month"
                  variant="bordered"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setPage(1);
                  }}
                  className="w-44 sm:w-48"
                  classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                />
              )}

              {periodMode === 'year' && (
                <Select
                  size="sm"
                  radius="sm"
                  disableAnimation
                  aria-label="Select Year"
                  variant="bordered"
                  selectedKeys={new Set([selectedYear])}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) {
                      setSelectedYear(String(val));
                      setPage(1);
                    }
                  }}
                  className="w-24 sm:w-28"
                  classNames={{
                    trigger: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs"
                  }}
                  popoverProps={{
                    disableAnimation: true,
                    classNames: {
                      content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                    }
                  }}
                  listboxProps={{
                    itemClasses: {
                      base: "rounded-xs px-2.5 py-1.5 text-xs text-foreground data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50/15"
                    }
                  }}
                >
                  {availableYears.map(y => (
                    <SelectItem key={y} textValue={y}>{y}</SelectItem>
                  ))}
                </Select>
              )}

              {periodMode === 'range' && (
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    size="sm"
                    radius="sm"
                    aria-label="From Date"
                    variant="bordered"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-28"
                    classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                  />
                  <span className="text-xs text-default-400">-</span>
                  <Input
                    type="date"
                    size="sm"
                    radius="sm"
                    aria-label="To Date"
                    variant="bordered"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-28"
                    classNames={{ inputWrapper: "h-8 min-h-8 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                  />
                </div>
              )}

              {/* 3. Reset Button alongside them */}
              <Tooltip content="Reset all filters" size="sm">
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  radius="sm"
                  onPress={handleResetFilters}
                  className="w-8 h-8 min-w-8 rounded-sm border border-default-200/80 dark:border-default-100/20 bg-default-100/60 dark:bg-default-50/10 text-default-600 dark:text-default-300"
                  aria-label="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
            </div>

            {/* Far Right: Export shown button */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button
                color="primary"
                variant="flat"
                size="sm"
                radius="sm"
                onPress={handleExportCSV}
                startContent={<Download className="w-3.5 h-3.5" />}
                className="h-8 px-3 rounded-sm font-semibold text-xs shadow-2xs"
              >
                Export shown
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardBody className="px-3 sm:px-4 py-2">
          <div className="overflow-x-auto border border-default-200/60 rounded-xl overscroll-x-contain">
            <Table
              removeWrapper
              aria-label="Sales History Table"
              className="min-w-full"
              classNames={{
                table: "min-w-full",
                th: "bg-default-100/80 text-default-600 text-[11px] font-bold uppercase tracking-wider py-2 px-2 text-center",
                td: "py-1.5 px-2 text-xs font-medium border-b border-default-100/70 text-center"
              }}
            >
              <TableHeader>
                <TableColumn key="date" align="center">
                  <div
                    onClick={() => handleColumnSort('date')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>DATE</span>
                    {sortKey.startsWith('date-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="day" align="center">
                  <div
                    onClick={() => handleColumnSort('day')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>DAY</span>
                    {sortKey.startsWith('day-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="sale" align="center">
                  <div
                    onClick={() => handleColumnSort('sale')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>SALE AMOUNT</span>
                    {sortKey.startsWith('sale-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="profit" align="center">
                  <div
                    onClick={() => handleColumnSort('profit')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>PROFIT</span>
                    {sortKey.startsWith('profit-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="cost" align="center">
                  <div
                    onClick={() => handleColumnSort('cost')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>COST / EXPENSE</span>
                    {sortKey.startsWith('cost-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="margin" align="center">
                  <div
                    onClick={() => handleColumnSort('margin')}
                    className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-primary transition-colors text-center w-full"
                  >
                    <span>MARGIN %</span>
                    {sortKey.startsWith('margin-') && (
                      <span className="text-[11px] text-primary">{sortKey.endsWith('asc') ? '▲' : '▼'}</span>
                    )}
                  </div>
                </TableColumn>

                <TableColumn key="actions" align="center">
                  ACTIONS
                </TableColumn>
              </TableHeader>

              <TableBody emptyContent="No sales entries found for the selected period.">
                {paginatedRows.map((s) => (
                  <TableRow key={s.id || s.date}>
                    <TableCell className="text-center">
                      <span className="font-semibold text-foreground text-xs leading-tight">
                        {formatDateLabel(s.date)}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-sm font-normal text-default-700 dark:text-white">
                        {bnDay(s.date) || '—'}
                      </span>
                    </TableCell>

                    <TableCell className="text-center font-numeric font-bold text-xs text-foreground">
                      {Math.round(Number(s.sale) || 0).toLocaleString('en-US')}
                    </TableCell>

                    <TableCell className="text-center font-numeric font-bold text-xs text-teal-600 dark:text-teal-400">
                      {Math.round(Number(s.profit) || 0).toLocaleString('en-US')}
                    </TableCell>

                    <TableCell className="text-center font-numeric font-medium text-xs text-default-600">
                      {Math.round(Number(s.cost) || 0).toLocaleString('en-US')}
                    </TableCell>

                    <TableCell className="text-center font-numeric font-semibold text-xs text-foreground">
                      {formatPct(s.profitPct !== undefined ? s.profitPct : (s.sale > 0 ? s.profit / s.sale : 0))}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="Edit entry" delay={250} closeDelay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            radius="sm"
                            onPress={() => handleEditSale(s)}
                            className="text-default-500 hover:text-primary min-w-7 w-7 h-7"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Delete entry" color="danger" delay={250} closeDelay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            radius="sm"
                            onPress={() => handleDeleteSale(s)}
                            className="text-danger-500 hover:text-danger-600 min-w-7 w-7 h-7"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Summary & Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2">
            <div className="text-xs text-default-500">
              Showing <b>{paginatedRows.length}</b> of <b>{sortedRows.length}</b> records
              {sortedRows.length !== sales.length && ` (filtered from ${sales.length} total)`}
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                total={totalPages}
                onChange={setPage}
                size="sm"
                showControls
                color="primary"
                variant="flat"
              />
            )}
          </div>
        </CardBody>
      </Card>

      {/* HeroUI Sale Edit Modal */}
      <SaleEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSale(null);
        }}
        sale={editingSale}
        onSaveSuccess={() => syncAllData?.()}
        showToast={showToast}
      />
    </div>
  );
}
