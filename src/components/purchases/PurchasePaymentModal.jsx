import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Button
} from '@heroui/react';
import { CreditCard, Calendar, Save, X } from 'lucide-react';
import { db, firebase, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { computeShopBalances } from '../../utils/purchaseHelpers';
import { formatMoney, toISODate, dhakaNow } from '../../utils/calculations';

export default function PurchasePaymentModal({
  isOpen,
  onClose,
  preselectedShop = '',
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { supplierShops = [], purchases = [], purchasePayments = [], syncAllData } = useData();

  const [shop, setShop] = useState('');
  const [date, setDate] = useState(toISODate(dhakaNow()));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShop(preselectedShop || (supplierShops[0]?.name || ''));
      setDate(toISODate(dhakaNow()));
      setAmount('');
      setNote('');
    }
  }, [isOpen, preselectedShop, supplierShops]);

  // Compute live due for the selected shop
  const currentShopBalance = computeShopBalances(purchases, purchasePayments, shop);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!shop.trim()) {
      showToast?.('Please select a supplier shop.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast?.('Please enter a valid payment amount.');
      return;
    }

    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    setIsSaving(true);
    try {
      const serverTs = firebase.firestore?.FieldValue
        ? firebase.firestore.FieldValue.serverTimestamp()
        : null;

      const payload = {
        shop: shop.trim(),
        date: date || toISODate(dhakaNow()),
        amount: Math.round(numAmount),
        note: note.trim() || 'Due payment voucher',
        enteredBy: user?.displayName || user?.email || 'Authorized User',
        createdAt: serverTs,
        createdAtMillis: Date.now()
      };

      const ref = await db.collection('purchase_payments').add(payload);
      await logAudit('purchase_payment', ref.id, 'create', null, payload, user);

      showToast?.(`Payment voucher saved: ${formatMoney(payload.amount)} paid to ${shop}`);
      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save payment error:', err);
      showToast?.('Failed to save payment voucher');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl",
        header: "border-b border-default-100 py-4 px-6",
        body: "py-6 px-6",
        footer: "border-t border-default-100 py-4 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Payment Voucher
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                Record Due Payment
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Supplier Shop Select */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Supplier Shop <span className="text-danger">*</span>
                </label>
                <Select
                  size="sm"
                  variant="bordered"
                  selectedKeys={shop ? new Set([shop]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) setShop(String(val));
                  }}
                  classNames={{ trigger: "h-10 border-default-300" }}
                  required
                >
                  {supplierShops.map((s) => (
                    <SelectItem key={s.name} textValue={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Current Due Highlight Banner */}
              <div className="p-3 rounded-xl bg-default-100 border border-default-200/80 flex items-center justify-between">
                <span className="text-xs text-default-500 font-medium">Current Outstanding Due:</span>
                <span className="text-base font-bold font-numeric text-danger-500">
                  {formatMoney(currentShopBalance.due)}
                </span>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Payment Date <span className="text-danger">*</span>
                </label>
                <Input
                  type="date"
                  size="sm"
                  variant="bordered"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300" }}
                  required
                />
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Amount Paid (৳) <span className="text-danger">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  size="sm"
                  variant="bordered"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  startContent={<span className="text-xs font-bold text-teal-600 dark:text-teal-400">৳</span>}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 font-numeric font-bold text-teal-600 dark:text-teal-400"
                  }}
                  required
                />
              </div>

              {/* Payment Note */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Payment Note / Reference
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Bank transfer, bKash TrxID, Cash"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300" }}
                />
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={onClose}
                startContent={<X className="w-4 h-4" />}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                size="sm"
                isLoading={isSaving}
                className="font-bold shadow-sm"
                startContent={!isSaving && <Save className="w-4 h-4" />}
              >
                Save Payment
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
