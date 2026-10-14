import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell
} from '@heroui/react';
import {
  Calculator,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Save,
  Plus,
  Building,
  Home,
  Zap,
  Users,
  Coins
} from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, pad } from '../../utils/calculations';
import {
  computeMonthEndAuditAndCalc,
  formatLongMonthYear,
  formatShortMonthYear,
  markDateAsOffDay,
  unmarkDateAsOffDay,
  DEFAULT_FIXED_RATES
} from '../../utils/expenseHelpers';

export default function MonthEndModal({
  isOpen,
  onClose,
  initialMonth,
  sales = [],
  expenses = [],
  settlements = [],
  fixedRates = DEFAULT_FIXED_RATES,
  offDays = [],
  onOffDaysChange,
  onOpenNewExpense,
  onNavigateToAddSale,
  onSuccess
}) {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('');
  const [roundingDeduction, setRoundingDeduction] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initialize selectedMonth when opened
  useEffect(() => {
    if (!isOpen) return;
    setSaveError('');
    setIsSaving(false);

    let m = initialMonth;
    if (!m) {
      const now = new Date();
      m = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    }
    setSelectedMonth(m);

    // Check if this month is already settled
    const existing = settlements.find((s) => s.month === m);
    if (existing) {
      setMode('view');
      setRoundingDeduction(existing.roundingDeduction ? String(existing.roundingDeduction) : '');
    } else {
      setMode('edit');
      setRoundingDeduction('');
    }
  }, [isOpen, initialMonth, settlements]);

  // When month picker changes
  const handleMonthChange = (newMonth) => {
    if (!newMonth) return;
    setSelectedMonth(newMonth);
    const existing = settlements.find((s) => s.month === newMonth);
    if (existing) {
      setMode('view');
      setRoundingDeduction(existing.roundingDeduction ? String(existing.roundingDeduction) : '');
    } else {
      setMode('edit');
      setRoundingDeduction('');
    }
  };

  // Perform calculations dynamically
  const auditAndCalc = useMemo(() => {
    if (!selectedMonth) return null;
    return computeMonthEndAuditAndCalc({
      targetMonth: selectedMonth,
      sales,
      expenses,
      fixedRates,
      offDays,
      roundingDeduction: parseFloat(roundingDeduction) || 0
    });
  }, [selectedMonth, sales, expenses, fixedRates, offDays, roundingDeduction]);

  const existingSettlement = settlements.find((s) => s.month === selectedMonth);
  const isFinalized = !!existingSettlement;

  // Toggle mark/unmark off-day directly in audit table
  const handleToggleOffDay = async (iso, currentlyMarked) => {
    try {
      let updated;
      if (currentlyMarked) {
        updated = await unmarkDateAsOffDay(iso, offDays, user);
      } else {
        updated = await markDateAsOffDay(iso, offDays, user);
      }
      if (onOffDaysChange) onOffDaysChange(updated);
    } catch (e) {
      console.error('Error toggling off-day:', e);
    }
  };

  // Save / Finalize settlement
  const handleSaveSettlement = async () => {
    if (!auditAndCalc) return;
    if (!auditAndCalc.isReadyToFinalize) {
      setSaveError(`Cannot save: Missing required records: ${auditAndCalc.missingItems.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const targetMonth = auditAndCalc.targetMonth;
      const [yStr, mStr] = targetMonth.split('-');
      const totalDays = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
      const lastDayISO = `${targetMonth}-${pad(totalDays)}`;
      const mName = auditAndCalc.monthName;

      // 1. Generate standard auto-managed expense records
      const houseRentDoc = {
        id: `exp_houserent_${targetMonth}`,
        category: 'Pias House Rent',
        title: 'Pias House Rent',
        amount: auditAndCalc.houseRent,
        date: lastDayISO,
        month: targetMonth,
        billingMonth: targetMonth,
        desc: `Monthly house rent deduction for ${mName} ${yStr}`,
        paymentMethod: 'Cash',
        createdAtMillis: Date.now(),
        enteredBy: user?.displayName || user?.email || 'Admin'
      };

      const piasDailyDoc = {
        id: `exp_piasdaily_${targetMonth}`,
        category: 'Pias Daily',
        title: `Pias Daily (${mName})`,
        amount: auditAndCalc.piasDailyTotal,
        date: lastDayISO,
        month: targetMonth,
        billingMonth: targetMonth,
        desc: `Pias daily allowance for ${mName} (${auditAndCalc.operatingDaysCount} open days × ৳${auditAndCalc.piasDailyRate})`,
        paymentMethod: 'Cash',
        createdAtMillis: Date.now(),
        enteredBy: user?.displayName || user?.email || 'Admin'
      };

      const dailyCostDoc = {
        id: `exp_dailycost_${targetMonth}`,
        category: 'Daily Operating Costs',
        title: `${mName} Daily Operating Costs`,
        amount: auditAndCalc.totalDailyCost,
        date: lastDayISO,
        month: targetMonth,
        billingMonth: targetMonth,
        desc: `Total of daily operating costs entered in sales during ${mName}`,
        paymentMethod: 'Cash',
        createdAtMillis: Date.now(),
        enteredBy: user?.displayName || user?.email || 'Admin'
      };

      const settlementPayload = {
        month: targetMonth,
        operatingDays: auditAndCalc.operatingDaysCount,
        totalRevenue: auditAndCalc.totalRevenue,
        totalGrossProfit: auditAndCalc.totalGrossProfit,
        roundingDeduction: auditAndCalc.roundingDeduction,
        adjustedGrossProfit: auditAndCalc.adjustedGrossProfit,
        shopRent: auditAndCalc.shopRent,
        houseRent: auditAndCalc.houseRent,
        electricity: auditAndCalc.electricity,
        piasDailyRate: auditAndCalc.piasDailyRate,
        piasDailyTotal: auditAndCalc.piasDailyTotal,
        dailyOperatingCost: auditAndCalc.totalDailyCost,
        otherExpenses: auditAndCalc.otherExpenses,
        totalDeductions: auditAndCalc.totalDeductions,
        distributableProfit: auditAndCalc.distributableProfit,
        piasRatio: auditAndCalc.piasRatio,
        piasBaseShare: auditAndCalc.piasBaseShare,
        piasTotalTakeHome: auditAndCalc.piasTotalTakeHome,
        mehediRatio: auditAndCalc.mehediRatio,
        mehediBaseShare: auditAndCalc.mehediBaseShare,
        mehediTotalTakeHome: auditAndCalc.mehediTotalTakeHome,
        finalizedAt: Date.now(),
        finalizedBy: user?.displayName || user?.email || 'Admin'
      };

      if (firebaseReady && db) {
        const batch = db.batch();
        batch.set(db.collection('expenses').doc(houseRentDoc.id), houseRentDoc, { merge: true });
        batch.set(db.collection('expenses').doc(piasDailyDoc.id), piasDailyDoc, { merge: true });
        batch.set(db.collection('expenses').doc(dailyCostDoc.id), dailyCostDoc, { merge: true });
        batch.set(db.collection('monthly_settlements').doc(targetMonth), settlementPayload, { merge: true });
        await batch.commit();

        const auditAction = existingSettlement ? 'update' : 'create';
        await logAudit('settlement', targetMonth, auditAction, existingSettlement || null, settlementPayload, user);
      }

      setMode('view');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving settlement:', err);
      setSaveError('Failed to save settlement. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!auditAndCalc) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="4xl"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            {/* Header with Month Selector */}
            <ModalHeader className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-default-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    {formatLongMonthYear(selectedMonth)} Settlement Statement
                  </h3>
                  <p className="text-xs text-default-500">
                    Month-End Take-Home &amp; Partner Distribution Calculator
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  size="sm"
                  variant="bordered"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-36"
                  classNames={{
                    input: "font-semibold text-xs"
                  }}
                />
              </div>
            </ModalHeader>

            {/* Modal Body */}
            <ModalBody className="py-4 space-y-4">
              {saveError && (
                <div className="p-3 text-xs text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* STEP 1: Calendar Audit of Non-Operating Days */}
              <div className="p-3.5 rounded-xl border border-default-200 bg-default-50/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-default-600">
                    <span>
                      Closed (<b className="text-foreground font-numeric">{auditAndCalc.nonOperatingCount}</b>) +
                    </span>
                    <span>
                      Open (<b className="text-success font-numeric">{auditAndCalc.operatingDaysCount}</b>) =
                    </span>
                    <span>
                      Total (<b className="text-foreground font-numeric">{auditAndCalc.totalDays}</b>)
                    </span>
                    {auditAndCalc.missingDaysCount > 0 && (
                      <Chip size="sm" color="danger" variant="flat" className="h-5 text-[10px] font-bold ml-2">
                        ⚠️ {auditAndCalc.missingDaysCount} Unmarked Missing
                      </Chip>
                    )}
                  </div>

                  <Chip size="sm" color="success" variant="flat" className="h-6 font-bold text-xs">
                    {auditAndCalc.operatingDaysCount} Open Days
                  </Chip>
                </div>

                {/* Non-Operating Days Table */}
                <div className="max-h-36 overflow-y-auto border border-default-200 rounded-lg bg-content1">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-default-100 text-default-500 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5">Non-Operating Date &amp; Status</th>
                        <th className="px-3 py-1.5 text-right w-44">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {auditAndCalc.nonOperatingRows.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-3 text-center text-default-400">
                            No off-days or missing days found. The shop operated all {auditAndCalc.totalDays} days this month!
                          </td>
                        </tr>
                      ) : (
                        auditAndCalc.nonOperatingRows.map((row) => (
                          <tr
                            key={row.dateISO}
                            className={
                              row.type === 'missing'
                                ? 'bg-danger-50/40 dark:bg-danger-900/10'
                                : row.type === 'marked_offday'
                                ? 'bg-primary-50/30 dark:bg-primary-900/10'
                                : 'hover:bg-default-50'
                            }
                          >
                            <td className="px-3 py-1.5">
                              <span className="font-numeric font-bold text-foreground">{row.day}</span>{' '}
                              <span className="text-default-600">{auditAndCalc.monthName}</span>{' '}
                              <span className="text-default-500">({row.bnDayName})</span>
                              <Chip
                                size="sm"
                                variant="flat"
                                color={
                                  row.type === 'missing'
                                    ? 'danger'
                                    : row.type === 'marked_offday'
                                    ? 'primary'
                                    : 'default'
                                }
                                className="h-4 text-[10px] font-semibold ml-2"
                              >
                                {row.label}
                              </Chip>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {row.type === 'marked_offday' && (
                                  <Button
                                    size="sm"
                                    variant="bordered"
                                    className="h-6 text-[10px] px-2 min-w-0"
                                    onPress={() => handleToggleOffDay(row.dateISO, true)}
                                  >
                                    Unmark
                                  </Button>
                                )}
                                {row.type === 'missing' && (
                                  <Button
                                    size="sm"
                                    variant="bordered"
                                    className="h-6 text-[10px] px-2 min-w-0 font-bold"
                                    onPress={() => handleToggleOffDay(row.dateISO, false)}
                                  >
                                    Mark Off-Day
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="primary"
                                  className="h-6 text-[10px] px-2 min-w-0 font-bold"
                                  onPress={() => {
                                    if (onNavigateToAddSale) onNavigateToAddSale(row.dateISO);
                                    onClose();
                                  }}
                                >
                                  + Add Sale
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 2: Financial Settlement Statement & Deductions */}
              <div className="p-4 rounded-xl border border-default-200 bg-content1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase font-extrabold text-foreground tracking-wider font-display">
                    Financial Settlement Statement
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="h-7 text-xs font-semibold"
                    startContent={<Plus className="w-3.5 h-3.5" />}
                    onPress={() => {
                      if (onOpenNewExpense) onOpenNewExpense(selectedMonth);
                    }}
                  >
                    Record Expense in Expenses Tab
                  </Button>
                </div>

                <div className="divide-y divide-default-100 text-xs">
                  {/* Gross Profit */}
                  <div className="flex items-center justify-between py-2">
                    <span className="font-semibold text-foreground">Total Sales Gross Profit</span>
                    <span className="font-numeric font-extrabold text-sm text-success">
                      {formatMoney(auditAndCalc.totalGrossProfit)}
                    </span>
                  </div>

                  {/* Rounding Deduction */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-500">Less: Rounding / Profit Adjustment</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        size="sm"
                        placeholder="0"
                        variant="bordered"
                        className="w-24 h-7"
                        classNames={{
                          input: "font-numeric font-bold text-xs"
                        }}
                        value={roundingDeduction}
                        onChange={(e) => setRoundingDeduction(e.target.value)}
                        isDisabled={mode === 'view'}
                      />
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.roundingDeduction)}
                    </span>
                  </div>

                  {/* Adjusted Gross Profit Subtotal */}
                  <div className="flex items-center justify-between py-2 bg-default-50/70 px-2 rounded-lg font-bold">
                    <span className="text-foreground">Adjusted Gross Profit</span>
                    <span className="font-numeric font-extrabold text-sm text-foreground">
                      {formatMoney(auditAndCalc.adjustedGrossProfit)}
                    </span>
                  </div>

                  {/* Expense 1: Shop Rent */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-700">1. Shop Rent</span>
                      {auditAndCalc.hasShopRent ? (
                        <Chip size="sm" color="success" variant="flat" className="h-4 text-[10px] font-bold">
                          ✓
                        </Chip>
                      ) : (
                        <Chip size="sm" color="danger" variant="flat" className="h-4 text-[10px] font-bold">
                          ⚠️ Missing
                        </Chip>
                      )}
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.shopRent)}
                    </span>
                  </div>

                  {/* Expense 2: Pias House Rent */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-700">2. Pias House Rent</span>
                      <Chip size="sm" color="success" variant="flat" className="h-4 text-[10px] font-bold" title="Auto-applied">
                        ✓ Auto
                      </Chip>
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.houseRent)}
                    </span>
                  </div>

                  {/* Expense 3: Electricity Bill */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-700">
                        3. Electricity Bill {auditAndCalc.elecMonthName && `(${auditAndCalc.elecMonthName})`}
                      </span>
                      {auditAndCalc.hasElectricity ? (
                        <Chip size="sm" color="success" variant="flat" className="h-4 text-[10px] font-bold">
                          ✓
                        </Chip>
                      ) : (
                        <Chip size="sm" color="danger" variant="flat" className="h-4 text-[10px] font-bold">
                          ⚠️ Missing
                        </Chip>
                      )}
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.electricity)}
                    </span>
                  </div>

                  {/* Expense 4: Pias Daily */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-700">4. Pias Daily</span>
                      {auditAndCalc.hasPiasDaily ? (
                        <Chip size="sm" color="secondary" variant="flat" className="h-4 text-[10px] font-bold">
                          {auditAndCalc.operatingDaysCount}×{auditAndCalc.piasDailyRate}
                        </Chip>
                      ) : (
                        <Chip size="sm" color="danger" variant="flat" className="h-4 text-[10px] font-bold">
                          ⚠️ 0 Days
                        </Chip>
                      )}
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.piasDailyTotal)}
                    </span>
                  </div>

                  {/* Expense 5: Daily Operating Costs */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-default-700">5. Daily Operating Costs (Sales Cost Box)</span>
                      {auditAndCalc.hasDailyCost ? (
                        <Chip size="sm" color="success" variant="flat" className="h-4 text-[10px] font-bold">
                          ✓
                        </Chip>
                      ) : (
                        <Chip size="sm" color="danger" variant="flat" className="h-4 text-[10px] font-bold">
                          ⚠️ 0 Days
                        </Chip>
                      )}
                    </div>
                    <span className="font-numeric font-bold text-danger">
                      - {formatMoney(auditAndCalc.totalDailyCost)}
                    </span>
                  </div>

                  {/* Other Expenses if any */}
                  {auditAndCalc.otherExpenses > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-default-500">6. Other Logged Expenses</span>
                      <span className="font-numeric font-bold text-danger">
                        - {formatMoney(auditAndCalc.otherExpenses)}
                      </span>
                    </div>
                  )}

                  {/* Total Deductions */}
                  <div className="flex items-center justify-between py-2.5 bg-danger-50/50 dark:bg-danger-900/10 px-2 rounded-lg font-bold text-danger">
                    <span className="uppercase text-[11px] tracking-wider">Total Deductions</span>
                    <span className="font-numeric font-extrabold text-sm">
                      - {formatMoney(auditAndCalc.totalDeductions)}
                    </span>
                  </div>
                </div>

                {/* Distributable Profit Card */}
                <div className="p-3.5 rounded-xl border border-primary-200 bg-primary-50/30 dark:bg-primary-900/10 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Net Distributable Profit
                    </div>
                    <div className="text-[11px] text-default-500">
                      Available for {auditAndCalc.piasRatio}% / {auditAndCalc.mehediRatio}% partner distribution
                    </div>
                  </div>
                  <div className="font-numeric font-black text-xl text-primary">
                    {formatMoney(auditAndCalc.distributableProfit)}
                  </div>
                </div>

                {/* Validation Notice Bar */}
                {!auditAndCalc.isReadyToFinalize ? (
                  <div className="p-2.5 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 text-danger text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Missing required records: <b>{auditAndCalc.missingItems.join(', ')}</b>. Record in the Expenses tab before finalizing.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 text-success text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Ready to finalize this month's partner settlement statement.</span>
                  </div>
                )}
              </div>

              {/* STEP 3: 55% / 45% Partner Take-Home Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pias (55%) */}
                <div className="p-3.5 rounded-xl border border-secondary-300/40 bg-secondary-50/20 dark:bg-secondary-900/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-secondary-600 font-display">
                      Pias ({auditAndCalc.piasRatio}%)
                    </span>
                    <Chip size="sm" color="secondary" variant="flat" className="h-5 text-[10px] font-bold">
                      {auditAndCalc.operatingDaysCount}×{auditAndCalc.piasDailyRate}
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between text-xs text-default-500">
                    <span>{auditAndCalc.piasRatio}% Base Share:</span>
                    <span className="font-numeric font-bold text-foreground">
                      {formatMoney(auditAndCalc.piasBaseShare)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-default-500">
                    <span>
                      Daily Allowance ({auditAndCalc.operatingDaysCount}×{auditAndCalc.piasDailyRate}):
                    </span>
                    <span className="font-numeric font-bold text-secondary-600">
                      + {formatMoney(auditAndCalc.piasDailyTotal)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-dashed border-secondary-200 flex items-baseline justify-between">
                    <span className="text-[11px] font-bold uppercase text-secondary-600">
                      Total Pias Take-Home
                    </span>
                    <span className="font-numeric font-black text-lg text-secondary-600">
                      {formatMoney(auditAndCalc.piasTotalTakeHome)}
                    </span>
                  </div>
                </div>

                {/* Mehedi (45%) */}
                <div className="p-3.5 rounded-xl border border-pink-300/40 bg-pink-50/20 dark:bg-pink-900/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-pink-600 font-display">
                      Mehedi ({auditAndCalc.mehediRatio}%)
                    </span>
                    <Chip size="sm" color="danger" variant="flat" className="h-5 text-[10px] font-bold">
                      {auditAndCalc.mehediRatio}% Equity
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between text-xs text-default-500">
                    <span>{auditAndCalc.mehediRatio}% Base Share:</span>
                    <span className="font-numeric font-bold text-foreground">
                      {formatMoney(auditAndCalc.mehediBaseShare)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-default-500">
                    <span>Direct Allocation:</span>
                    <span className="font-semibold text-default-500">Direct</span>
                  </div>
                  <div className="pt-2 border-t border-dashed border-pink-200 flex items-baseline justify-between">
                    <span className="text-[11px] font-bold uppercase text-pink-600">
                      Total Mehedi Take-Home
                    </span>
                    <span className="font-numeric font-black text-lg text-pink-600">
                      {formatMoney(auditAndCalc.mehediTotalTakeHome)}
                    </span>
                  </div>
                </div>
              </div>
            </ModalBody>

            {/* Footer */}
            <ModalFooter className="border-t border-default-200 justify-between items-center">
              <div>
                {isFinalized && mode === 'view' ? (
                  <Chip size="sm" color="success" variant="flat" className="font-bold text-xs" startContent={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    Finalized Statement
                  </Chip>
                ) : isFinalized && mode === 'edit' ? (
                  <Chip size="sm" color="primary" variant="flat" className="font-bold text-xs" startContent={<Edit3 className="w-3.5 h-3.5" />}>
                    Edit Mode Active
                  </Chip>
                ) : (
                  <Chip size="sm" color="warning" variant="flat" className="font-bold text-xs" startContent={<AlertTriangle className="w-3.5 h-3.5" />}>
                    Pending Finalization
                  </Chip>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="flat" onPress={onClose}>
                  Close
                </Button>

                {isFinalized && mode === 'view' ? (
                  <Button
                    size="sm"
                    variant="bordered"
                    color="primary"
                    startContent={<Edit3 className="w-4 h-4" />}
                    onPress={() => setMode('edit')}
                  >
                    Edit Settlement
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    color="primary"
                    isLoading={isSaving}
                    isDisabled={!auditAndCalc.isReadyToFinalize}
                    startContent={!isSaving && <Save className="w-4 h-4" />}
                    onPress={handleSaveSettlement}
                  >
                    {isFinalized ? 'Save & Update Settlement' : 'Save & Finalize Settlement'}
                  </Button>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
