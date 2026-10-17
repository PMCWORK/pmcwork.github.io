import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Input, Button, Chip } from '@heroui/react';
import { Check, Calendar } from 'lucide-react';
import { db, firebase, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { dhakaNow, toISODate, formatPct, formatMoney } from '../../utils/calculations';

export default function SaleForm({ initialDate, onDateChange, onSaveSuccess, showToast }) {
  const { user } = useAuth();
  const { syncAllData } = useData();

  const today = dhakaNow();
  const todayISO = toISODate(today);

  const [date, setDate] = useState(initialDate || todayISO);
  const [sale, setSale] = useState('');
  const [profit, setProfit] = useState('');
  const [cost, setCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // If initialDate prop changes from Missing Sales modal
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
      onDateChange?.(initialDate);
    }
  }, [initialDate, onDateChange]);

  // Derived calculations - EXACT parity with legacy updateMarginPreview()
  const numSale = parseFloat(sale) || 0;
  const numProfit = parseFloat(profit) || 0;
  const numCost = parseFloat(cost) || 0;
  const pct = numSale > 0 ? (numProfit / numSale) : 0;
  const marginDisplay = numSale > 0 ? formatPct(pct) : 'auto';

  // Cost and profit percentages for the distribution bar
  const costRatio = numSale > 0 ? Math.min(Math.max((numCost / numSale) * 100, 0), 100) : 0;
  const profitRatio = numSale > 0 ? Math.min(Math.max((numProfit / numSale) * 100, 0), 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numSale && numSale !== 0) {
      showToast?.('Please enter a valid sale amount.');
      return;
    }

    if (!firebaseReady || !db) {
      showToast?.('Firebase connection is offline or unconfigured.');
      return;
    }

    setIsSaving(true);
    try {
      const serverTs = firebase.firestore?.FieldValue
        ? firebase.firestore.FieldValue.serverTimestamp()
        : null;

      const saleData = {
        date: date || todayISO,
        sale: numSale,
        profit: numProfit,
        cost: numCost,
        profitPct: pct,
        enteredBy: user?.displayName || user?.email || 'Authorized User'
      };

      const docRef = await db.collection('sales').add({
        ...saleData,
        createdAt: serverTs
      });

      await logAudit('sale', docRef.id, 'create', null, saleData, user);

      // Reset form fields
      setSale('');
      setProfit('');
      setCost('');
      setDate(todayISO);
      onDateChange?.(null);

      showToast?.('Sale entry saved successfully.');
      syncAllData?.();
      onSaveSuccess?.(docRef.id);
    } catch (err) {
      console.error('Failed to save sale:', err);
      showToast?.('Save failed — check Firestore rules');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-default-200/70 bg-content1 shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-default-400">
          New entry
        </div>
        <h2 className="text-lg font-bold font-display text-foreground mt-0.5">
          Sale details
        </h2>
      </CardHeader>

      <CardBody className="px-6 pb-6 pt-2 flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between">
          <div className="space-y-4 sm:space-y-5">
            {/* Row 1: Date & Profit % */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Date
                </label>
                <Input
                  type="date"
                  variant="bordered"
                  size="sm"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    onDateChange?.(e.target.value);
                  }}
                  classNames={{
                    inputWrapper: "border-default-300 focus-within:border-primary h-10"
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Profit %
                </label>
                <div className="relative">
                  <Input
                    isReadOnly
                    variant="bordered"
                    size="sm"
                    value={marginDisplay}
                    classNames={{
                      input: "font-mono font-semibold text-default-500",
                      inputWrapper: "border-default-200 bg-default-50/70 h-10 cursor-not-allowed"
                    }}
                    endContent={
                      <Chip size="sm" variant="flat" color="success" className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        Auto
                      </Chip>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Sale amount, Profit, Cost / expense (field-row-3) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Sale amount <span className="text-default-400 font-normal">(৳)</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  variant="bordered"
                  size="sm"
                  value={sale}
                  onChange={(e) => setSale(e.target.value)}
                  classNames={{
                    inputWrapper: "border-default-300 focus-within:border-primary font-numeric font-bold h-10"
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Profit <span className="text-default-400 font-normal">(৳)</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  variant="bordered"
                  size="sm"
                  value={profit}
                  onChange={(e) => setProfit(e.target.value)}
                  classNames={{
                    inputWrapper: "border-default-300 focus-within:border-teal-500 font-numeric font-bold text-teal-600 dark:text-teal-400 h-10"
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Cost / expense <span className="text-default-400 font-normal">(৳)</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  variant="bordered"
                  size="sm"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  classNames={{
                    inputWrapper: "border-default-300 focus-within:border-primary font-numeric h-10"
                  }}
                  required
                />
              </div>
            </div>

            {/* Distribution Bar — below the inputs dialogue box and above save button */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-default-600 text-[11px] uppercase tracking-wider">
                  Distribution
                </span>
                {numSale > 0 && (
                  <span className="font-numeric text-xs font-semibold text-default-500">
                    <span className="text-default-600 font-bold">{Math.round(costRatio)}%</span> Cost
                    <span className="mx-1.5 text-default-300">·</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">{Math.round(profitRatio)}%</span> Profit
                  </span>
                )}
              </div>

              {/* Visual Split Bar */}
              <div className="w-full h-2.5 rounded-full bg-default-100 dark:bg-default-50/40 overflow-hidden flex">
                {numSale > 0 ? (
                  <>
                    <div
                      className="bg-default-400 dark:bg-default-500 h-full transition-all duration-300"
                      style={{ width: `${costRatio}%` }}
                      title={`Cost: ${formatMoney(numCost)} (${Math.round(costRatio)}%)`}
                    />
                    <div
                      className="bg-teal-500 dark:bg-teal-400 h-full transition-all duration-300"
                      style={{ width: `${profitRatio}%` }}
                      title={`Profit: ${formatMoney(numProfit)} (${Math.round(profitRatio)}%)`}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-default-200/50 dark:bg-default-50/20" />
                )}
              </div>

              {/* Details below bar */}
              {numSale > 0 && (
                <div className="flex items-center justify-between text-[11px] text-default-400 pt-1.5 font-numeric">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-default-400 dark:bg-default-500 shrink-0"></span>
                    Cost: <span className="font-semibold text-default-700 dark:text-default-300">{formatMoney(numCost)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 shrink-0"></span>
                    Profit: <span className="font-bold text-teal-600 dark:text-teal-400">{formatMoney(numProfit)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-auto pt-6 sm:pt-8">
            <Button
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              fullWidth
              isLoading={isSaving}
              className="font-bold text-sm h-11 shadow-sm"
              startContent={!isSaving && <Check className="w-4 h-4" />}
            >
              {isSaving ? "Saving..." : "Save entry"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
