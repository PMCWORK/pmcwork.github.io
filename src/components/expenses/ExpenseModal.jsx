import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea
} from '@heroui/react';
import { Receipt, Calendar, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { toISODate, dhakaNow } from '../../utils/calculations';
import { DEFAULT_FIXED_RATES } from '../../utils/expenseHelpers';

export default function ExpenseModal({
  isOpen,
  onClose,
  expenseToEdit = null,
  fixedRates = DEFAULT_FIXED_RATES,
  onSuccess
}) {
  const { user } = useAuth();
  const todayISO = toISODate(dhakaNow());

  const [date, setDate] = useState(todayISO);
  const [categoryKey, setCategoryKey] = useState('Shop Rent');
  const [customCategory, setCustomCategory] = useState('');
  const [billingMonth, setBillingMonth] = useState(todayISO.slice(0, 7));
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!expenseToEdit;

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setIsSaving(false);

    if (expenseToEdit) {
      setDate(expenseToEdit.date || todayISO);
      const isPreset = ['Shop Rent', 'Pias House Rent', 'Electricity Bill', 'Miscellaneous'].includes(expenseToEdit.category);
      if (isPreset) {
        setCategoryKey(expenseToEdit.category);
        setCustomCategory('');
      } else {
        setCategoryKey('__custom__');
        setCustomCategory(expenseToEdit.category || '');
      }

      setBillingMonth(expenseToEdit.billingMonth || (expenseToEdit.date ? expenseToEdit.date.slice(0, 7) : todayISO.slice(0, 7)));
      setAmount(expenseToEdit.amount !== undefined && expenseToEdit.amount !== null ? String(Math.round(expenseToEdit.amount)) : '');
      setDesc(expenseToEdit.desc || '');
    } else {
      setDate(todayISO);
      setCategoryKey('Shop Rent');
      setCustomCategory('');
      setBillingMonth(todayISO.slice(0, 7));
      setAmount(String(fixedRates?.shopRent || 5000));
      setDesc('');
    }
  }, [isOpen, expenseToEdit, todayISO, fixedRates]);

  // Handle category change auto-fills
  const handleCategoryChange = (key) => {
    setCategoryKey(key);
    if (!isEdit) {
      if (key === 'Shop Rent') {
        setAmount(String(fixedRates?.shopRent || 5000));
      } else if (key === 'Pias House Rent') {
        setAmount(String(fixedRates?.houseRent || 7000));
      } else if (key === '__custom__' || key === 'Electricity Bill' || key === 'Miscellaneous') {
        if (amount === String(fixedRates?.shopRent || 5000) || amount === String(fixedRates?.houseRent || 7000)) {
          setAmount('');
        }
      }
    }
  };

  const isRentOrBill = ['Shop Rent', 'Pias House Rent', 'Electricity Bill'].includes(categoryKey);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    let finalCategory = categoryKey;
    if (categoryKey === '__custom__') {
      finalCategory = customCategory.trim();
      if (!finalCategory) {
        setError('Please enter a name for the custom category.');
        return;
      }
    }

    const billingMonthVal = isRentOrBill
      ? (billingMonth || date.slice(0, 7))
      : (billingMonth || date.slice(0, 7));

    const payload = {
      date: date || todayISO,
      month: (date || todayISO).slice(0, 7),
      billingMonth: billingMonthVal,
      category: finalCategory,
      amount: Math.round(numAmt),
      paymentMethod: 'Cash',
      desc: desc.trim(),
      enteredBy: user?.displayName || user?.email || 'Authorized User'
    };

    setIsSaving(true);
    try {
      if (isEdit) {
        if (firebaseReady && db) {
          await db.collection('expenses').doc(expenseToEdit.id).update(payload);
          await logAudit('expense', expenseToEdit.id, 'update', expenseToEdit, payload, user);
        }
      } else {
        payload.createdAtMillis = Date.now();
        if (firebaseReady && db) {
          const docRef = await db.collection('expenses').add(payload);
          await logAudit('expense', docRef.id, 'create', null, payload, user);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Failed to save expense. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      backdrop="blur"
      placement="center"
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex items-center gap-2.5 pb-2 border-b border-default-200">
              <div className="w-8 h-8 rounded-lg bg-danger-500/10 text-danger flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  {isEdit ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
                <p className="text-xs text-default-500">
                  {isEdit ? 'Update expense details and allocation' : 'Log shop overhead, rent, utility or miscellaneous costs'}
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="py-4 space-y-4">
              {error && (
                <div className="p-3 text-xs text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  {error}
                </div>
              )}

              {/* Date & Category in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Expense Date"
                  labelPlacement="outside"
                  type="date"
                  size="sm"
                  variant="bordered"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (!isEdit && isRentOrBill) {
                      setBillingMonth(e.target.value.slice(0, 7));
                    }
                  }}
                  isRequired
                />

                <Select
                  label="Category"
                  labelPlacement="outside"
                  size="sm"
                  radius="sm"
                  disableAnimation
                  variant="bordered"
                  selectedKeys={new Set([categoryKey])}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys)[0];
                    if (k) handleCategoryChange(String(k));
                  }}
                  isRequired
                  classNames={{ trigger: "h-9 border-default-300 dark:border-default-100/30 text-xs rounded-sm shadow-2xs" }}
                  popoverProps={{
                    disableAnimation: true,
                    classNames: {
                      content: "p-1 rounded-xl shadow-lg border border-default-200/70 dark:border-default-100/20 bg-content1"
                    }
                  }}
                >
                  <SelectItem key="Shop Rent" textValue="Shop Rent">
                    Shop Rent
                  </SelectItem>
                  <SelectItem key="Pias House Rent" textValue="Pias House Rent">
                    Pias House Rent
                  </SelectItem>
                  <SelectItem key="Electricity Bill" textValue="Electricity Bill">
                    Electricity Bill
                  </SelectItem>
                  <SelectItem key="Miscellaneous" textValue="Miscellaneous">
                    Miscellaneous
                  </SelectItem>
                  <SelectItem key="__custom__" textValue="Custom Entry...">
                    Custom Entry...
                  </SelectItem>
                </Select>
              </div>

              {/* Custom Category Input if selected */}
              {categoryKey === '__custom__' && (
                <div className="pt-1">
                  <Input
                    label="Custom Category Name"
                    labelPlacement="outside"
                    placeholder="e.g. Office Supplies, Maintenance, Generator Fuel..."
                    size="sm"
                    variant="bordered"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    isRequired
                    autoFocus
                  />
                </div>
              )}

              {/* Billing Month if Rent or Utility */}
              {isRentOrBill && (
                <div className="pt-1">
                  <Input
                    label="Bill For Month"
                    labelPlacement="outside"
                    description="Use this if paying for a prior or overdue month"
                    type="month"
                    size="sm"
                    variant="bordered"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                  />
                </div>
              )}

              {/* Amount */}
              <div className="pt-1">
                <Input
                  label="Amount (৳)"
                  labelPlacement="outside"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  size="sm"
                  variant="bordered"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  startContent={<span className="text-default-400 font-bold">৳</span>}
                  classNames={{
                    input: "font-numeric font-bold text-base"
                  }}
                  isRequired
                />
              </div>

              {/* Note / Description */}
              <div className="pt-1">
                <Textarea
                  label="Note / Details (Optional)"
                  labelPlacement="outside"
                  placeholder="Add supplier voucher number, details, or specific notes..."
                  size="sm"
                  variant="bordered"
                  minRows={2}
                  maxRows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-default-200">
              <Button
                variant="flat"
                size="sm"
                onPress={onClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                type="submit"
                isLoading={isSaving}
                startContent={!isSaving && <CheckCircle className="w-4 h-4" />}
              >
                {isEdit ? 'Update Expense' : 'Save Expense'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
