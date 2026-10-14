import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Card,
  CardBody,
  Pagination,
  Tooltip
} from '@heroui/react';
import {
  Receipt,
  History,
  Calendar,
  Plus,
  Search,
  RotateCcw,
  Building,
  Home,
  Zap,
  TrendingDown,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { formatMoney, toISODate, dhakaNow, pad } from '../../utils/calculations';
import {
  computeExpenseSummary,
  formatShortMonthYear,
  formatLongMonthYear,
  getCategoryBadgeColor,
  loadFixedRates,
  loadOffDays,
  ALL_SYSTEM_CATEGORIES,
  DEFAULT_FIXED_RATES
} from '../../utils/expenseHelpers';
import ExpenseModal from './ExpenseModal';
import MonthEndModal from './MonthEndModal';
import SettlementHistoryModal from './SettlementHistoryModal';

function formatSlashDate(iso) {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function ExpensesView({ onNavigateToAddSale }) {
  const { user } = useAuth();
  const { expenses = [], sales = [], settlements = [], loadExpenses, loadSettlements } = useData();
  const { appConfirm } = useDialog();

  const todayISO = toISODate(dhakaNow());
  const currentMonthISO = todayISO.slice(0, 7);
  const currentYearStr = String(new Date().getFullYear());

  // Fixed rates & store off-days state
  const [fixedRates, setFixedRates] = useState(DEFAULT_FIXED_RATES);
  const [offDays, setOffDays] = useState([]);

  useEffect(() => {
    loadFixedRates().then(setFixedRates).catch(() => {});
    loadOffDays().then(setOffDays).catch(() => {});
  }, []);

  // Filter toolbar state
  const [periodMode, setPeriodMode] = useState('any'); // 'any' | 'month' | 'year' | 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [fromDate, setFromDate] = useState(todayISO);
  const [toDate, setToDate] = useState(todayISO);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion state: set of expanded month keys (e.g. '2025-03')
  const [expandedMonths, setExpandedMonths] = useState(new Set([currentMonthISO]));

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isMonthEndModalOpen, setIsMonthEndModalOpen] = useState(false);
  const [monthEndTarget, setMonthEndTarget] = useState(currentMonthISO);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Compute available years for year selector
  const availableYears = useMemo(() => {
    const years = new Set([currentYearStr]);
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 4) years.add(e.date.slice(0, 4));
    });
    sales.forEach((s) => {
      if (s.date && s.date.length >= 4) years.add(s.date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [expenses, sales, currentYearStr]);

  // Compute active date range
  const dateRange = useMemo(() => {
    if (periodMode === 'month') {
      const m = selectedMonth || currentMonthISO;
      return { from: `${m}-01`, to: `${m}-31`, label: m, monthKey: m };
    } else if (periodMode === 'year') {
      const y = selectedYear || currentYearStr;
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: y, monthKey: null };
    } else if (periodMode === 'range') {
      const f = fromDate || todayISO;
      const t = toDate || todayISO;
      return { from: f, to: t, label: `${f} to ${t}`, monthKey: null };
    } else {
      return { from: '2000-01-01', to: '2099-12-31', label: 'All time', monthKey: null };
    }
  }, [periodMode, selectedMonth, selectedYear, fromDate, toDate, currentMonthISO, currentYearStr, todayISO]);

  // Compute summary calculations
  const summary = useMemo(() => {
    return computeExpenseSummary(expenses, dateRange, categoryFilter, searchQuery);
  }, [expenses, dateRange, categoryFilter, searchQuery]);

  // Default expand latest month when data loads if none expanded
  useEffect(() => {
    if (summary.sortedMonthKeys.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([summary.sortedMonthKeys[0]]));
    }
  }, [summary.sortedMonthKeys]);

  // Target month for settlement status card
  const activeSettlementMonth = dateRange.monthKey || selectedMonth || currentMonthISO;
  const currentMonthSettlement = settlements.find((s) => s.month === activeSettlementMonth);

  // Toggle month accordion
  const toggleMonth = (mKey) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(mKey)) next.delete(mKey);
      else next.add(mKey);
      return next;
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setPeriodMode('any');
    setSelectedMonth(currentMonthISO);
    setSelectedYear(currentYearStr);
    setFromDate(todayISO);
    setToDate(todayISO);
    setCategoryFilter('all');
    setSearchQuery('');
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (exp) => {
    if (!exp) return;
    const confirmed = await appConfirm({
      title: 'Delete Expense Entry',
      message: `Are you sure you want to delete this expense for ${exp.category} (${formatMoney(exp.amount)})?`,
      danger: true
    });
    if (!confirmed) return;

    try {
      if (firebaseReady && db) {
        await db.collection('expenses').doc(exp.id).delete();
        await logAudit('expense', exp.id, 'delete', exp, null, user);
      }
      if (loadExpenses) await loadExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200 pb-6">
      {/* Top Action Bar (Compact) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-xs font-bold text-default-600">
          Operating Costs &amp; Net Settlements
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="font-bold text-xs h-8"
            startContent={<History className="w-3.5 h-3.5 text-default-500" />}
            onPress={() => setIsHistoryModalOpen(true)}
          >
            Settlement History
          </Button>

          <Button
            size="sm"
            variant="bordered"
            color="primary"
            className="font-bold text-xs h-8"
            startContent={<Calendar className="w-3.5 h-3.5" />}
            onPress={() => {
              setMonthEndTarget(activeSettlementMonth);
              setIsMonthEndModalOpen(true);
            }}
          >
            Month-End Settlement
          </Button>

          <Button
            size="sm"
            color="primary"
            className="font-bold text-xs h-8"
            startContent={<Plus className="w-3.5 h-3.5" />}
            onPress={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
          >
            Record expense
          </Button>
        </div>
      </div>

      {/* Financial Overview Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Period Expenses */}
        <Card className="border-l-4 border-l-danger bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">
              Period Expenses
            </div>
            <div className="text-xl font-black font-numeric text-danger mt-1">
              {formatMoney(summary.totalExpenses)}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              {summary.filteredExpenses.length} records
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Fixed Overhead */}
        <Card className="border-l-4 border-l-secondary bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-600">
              Fixed Overhead
            </div>
            <div className="text-xl font-black font-numeric text-foreground mt-1">
              {formatMoney(summary.fixedOverhead)}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              Shop, House &amp; Electricity
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Daily Operating Costs */}
        <Card className="border-l-4 border-l-teal-500 bg-content1 shadow-sm">
          <CardBody className="p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
              Daily Operating Costs
            </div>
            <div className="text-xl font-black font-numeric text-teal-600 mt-1">
              {formatMoney(summary.dailyOperatingTotal)}
            </div>
            <div className="text-[11px] text-default-400 mt-0.5">
              Total daily costs from sales
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Month-End Settlement */}
        <Card className="border-l-4 border-l-primary bg-content1 shadow-sm">
          <CardBody className="p-3.5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Month-End Settlement ({formatShortMonthYear(activeSettlementMonth)})
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {currentMonthSettlement ? (
                  <>
                    <span className="text-sm font-extrabold text-success">✓ Finalized</span>
                    <span className="text-xs text-default-500 font-numeric">
                      ({formatMoney(currentMonthSettlement.distributableProfit || 0)})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-extrabold text-danger">⏳ Pending</span>
                    <span className="text-xs text-default-500">Not settled</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2 text-right">
              <Button
                size="sm"
                variant="light"
                color="primary"
                className="h-6 text-[11px] font-bold px-2 min-w-0"
                endContent={<ArrowUpRight className="w-3 h-3" />}
                onPress={() => {
                  setMonthEndTarget(activeSettlementMonth);
                  setIsMonthEndModalOpen(true);
                }}
              >
                {currentMonthSettlement ? 'View Statement' : 'Launch Wizard'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Category Spending Breakdown Pills */}
      {Object.keys(summary.categoryBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {Object.entries(summary.categoryBreakdown).map(([cat, amt]) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-content1 text-foreground border-default-200 hover:border-default-300'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`font-numeric font-bold ${
                    isSelected ? 'text-white' : 'text-danger'
                  }`}
                >
                  {formatMoney(amt)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-content1 rounded-xl border border-default-200">
        {/* Period Mode */}
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={new Set([periodMode])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            if (k) setPeriodMode(String(k));
          }}
          className="w-32"
          aria-label="Filter period mode"
        >
          <SelectItem key="any" textValue="All time">All time</SelectItem>
          <SelectItem key="month" textValue="Month">Month</SelectItem>
          <SelectItem key="year" textValue="Year">Year</SelectItem>
          <SelectItem key="range" textValue="Date Range">Date Range</SelectItem>
        </Select>

        {/* Dynamic Period Inputs */}
        {periodMode === 'month' && (
          <Input
            type="month"
            size="sm"
            variant="bordered"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-36"
            aria-label="Filter month"
          />
        )}

        {periodMode === 'year' && (
          <Select
            size="sm"
            variant="bordered"
            selectedKeys={new Set([selectedYear])}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k) setSelectedYear(String(k));
            }}
            className="w-28"
            aria-label="Filter year"
          >
            {availableYears.map((y) => (
              <SelectItem key={y} textValue={y}>{y}</SelectItem>
            ))}
          </Select>
        )}

        {periodMode === 'range' && (
          <>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
              aria-label="From date"
            />
            <Input
              type="date"
              size="sm"
              variant="bordered"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
              aria-label="To date"
            />
          </>
        )}

        {/* Category Filter */}
        <Select
          size="sm"
          variant="bordered"
          selectedKeys={new Set([categoryFilter])}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0];
            if (k) setCategoryFilter(String(k));
          }}
          className="w-44"
          aria-label="Filter by category"
        >
          <SelectItem key="all" textValue="All Categories">All Categories</SelectItem>
          <SelectItem key="Shop Rent" textValue="Shop Rent">Shop Rent</SelectItem>
          <SelectItem key="Pias House Rent" textValue="Pias House Rent">Pias House Rent</SelectItem>
          <SelectItem key="Electricity Bill" textValue="Electricity Bill">Electricity Bill</SelectItem>
          <SelectItem key="Pias Daily" textValue="Pias Daily">Pias Daily</SelectItem>
          <SelectItem key="Daily Operating Costs" textValue="Daily Operating Costs">Daily Operating Costs</SelectItem>
          <SelectItem key="Miscellaneous" textValue="Miscellaneous">Miscellaneous</SelectItem>
          <SelectItem key="custom" textValue="Other Custom Categories">Other Custom Categories</SelectItem>
        </Select>

        {/* Reset button */}
        <Button
          size="sm"
          variant="light"
          startContent={<RotateCcw className="w-3.5 h-3.5 text-default-400" />}
          onPress={handleResetFilters}
          className="text-default-500 font-semibold"
        >
          Reset filters
        </Button>

        {/* Search Input on the right */}
        <div className="ml-auto w-full sm:w-64">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Search notes or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="w-3.5 h-3.5 text-default-400" />}
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>
      </div>

      {/* Monthly Folders Container */}
      <div className="space-y-3 min-h-[360px]">
        {summary.sortedMonthKeys.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-default-200 rounded-xl bg-content1">
            <Receipt className="w-10 h-10 text-default-400 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-foreground">No expenses recorded in this period</h4>
            <p className="text-xs text-default-500 mt-1">
              Adjust your filters above or click "Record expense" to log a new expenditure.
            </p>
          </div>
        ) : (
          summary.sortedMonthKeys.map((mKey) => {
            const mItems = summary.monthlyGroups[mKey] || [];
            const isExpanded = expandedMonths.has(mKey);
            const mTotal = mItems.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
            const longMY = formatLongMonthYear(mKey);
            const shortMY = formatShortMonthYear(mKey);

            return (
              <div
                key={mKey}
                className="border border-default-200 rounded-xl bg-content1 overflow-hidden shadow-xs transition-colors"
              >
                {/* Month Accordion Header */}
                <div
                  onClick={() => toggleMonth(mKey)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
                    isExpanded ? 'bg-default-50 border-b border-default-200' : 'hover:bg-default-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                        isExpanded
                          ? 'bg-primary text-white'
                          : 'bg-primary-50 text-primary dark:bg-primary-900/30'
                      }`}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-display text-foreground">
                          {longMY}
                        </span>
                        <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px] font-bold">
                          {shortMY}
                        </Chip>
                      </div>
                      <div className="text-xs text-default-400 mt-0.5">
                        {mItems.length} expense{mItems.length === 1 ? '' : 's'} logged
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-default-400 tracking-wider">
                      Month Total
                    </div>
                    <div className="text-base font-extrabold font-numeric text-danger mt-0.5">
                      {formatMoney(mTotal)}
                    </div>
                  </div>
                </div>

                {/* Expanded Month Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-default-50 text-default-500 font-bold border-b border-default-200 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-center w-28">Date</th>
                          <th className="px-4 py-2 w-72">Category</th>
                          <th className="px-4 py-2">Note / Details</th>
                          <th className="px-4 py-2 text-right w-36">Amount (৳)</th>
                          <th className="px-4 py-2 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-default-100">
                        {mItems.map((e) => {
                          const badgeColor = getCategoryBadgeColor(e.category);
                          return (
                            <tr key={e.id} className="hover:bg-default-50/50 transition-colors">
                              {/* Date */}
                              <td className="px-4 py-2.5 text-center font-numeric font-semibold text-foreground">
                                {formatSlashDate(e.date || todayISO)}
                              </td>

                              {/* Category */}
                              <td className="px-4 py-2.5 font-bold text-foreground">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Chip
                                      size="sm"
                                      variant="dot"
                                      color={badgeColor}
                                      className="border-none pl-0 text-xs font-bold"
                                    >
                                      {e.title || e.category || 'Miscellaneous'}
                                    </Chip>
                                  </div>
                                  {e.billingMonth && (
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color="primary"
                                      className="h-4 text-[10px] font-bold"
                                    >
                                      {formatShortMonthYear(e.billingMonth)}
                                    </Chip>
                                  )}
                                </div>
                              </td>

                              {/* Note / Details */}
                              <td className="px-4 py-2.5 text-default-500 font-normal">
                                {e.desc || '—'}
                              </td>

                              {/* Amount */}
                              <td className="px-4 py-2.5 text-right font-numeric font-bold text-sm text-danger">
                                {formatMoney(e.amount)}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Tooltip content="Edit expense">
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                      className="h-7 w-7 text-default-500 hover:text-primary"
                                      onPress={() => {
                                        setEditingExpense(e);
                                        setIsExpenseModalOpen(true);
                                      }}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </Tooltip>

                                  <Tooltip content="Delete expense" color="danger">
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                      color="danger"
                                      className="h-7 w-7 text-default-500 hover:text-danger"
                                      onPress={() => handleDeleteExpense(e)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        expenseToEdit={editingExpense}
        fixedRates={fixedRates}
        onSuccess={() => {
          if (loadExpenses) loadExpenses();
        }}
      />

      <MonthEndModal
        isOpen={isMonthEndModalOpen}
        onClose={() => setIsMonthEndModalOpen(false)}
        initialMonth={monthEndTarget}
        sales={sales}
        expenses={expenses}
        settlements={settlements}
        fixedRates={fixedRates}
        offDays={offDays}
        onOffDaysChange={setOffDays}
        onOpenNewExpense={(targetM) => {
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
        onNavigateToAddSale={(isoDate) => {
          if (onNavigateToAddSale) onNavigateToAddSale(isoDate);
        }}
        onSuccess={() => {
          if (loadExpenses) loadExpenses();
          if (loadSettlements) loadSettlements();
        }}
      />

      <SettlementHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        settlements={settlements}
        onViewStatement={(monthStr) => {
          setIsHistoryModalOpen(false);
          setMonthEndTarget(monthStr);
          setIsMonthEndModalOpen(true);
        }}
      />
    </div>
  );
}
