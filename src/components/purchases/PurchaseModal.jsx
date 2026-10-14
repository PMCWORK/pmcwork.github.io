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
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell
} from '@heroui/react';
import { ShoppingCart, Calendar, Plus, Trash2, Save, X } from 'lucide-react';
import { db, firebase, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { formatMoney, toISODate, dhakaNow } from '../../utils/calculations';

export default function PurchaseModal({
  isOpen,
  onClose,
  purchase,
  onOpenNewShop,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { supplierShops = [], syncAllData } = useData();

  const isEditing = Boolean(purchase?.id);

  const [shop, setShop] = useState('');
  const [invoiceNum, setInvoiceNum] = useState('');
  const [date, setDate] = useState(toISODate(dhakaNow()));
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (purchase) {
        setShop(purchase.shop || '');
        setInvoiceNum(purchase.invoiceNum || purchase.number || '');
        setDate(purchase.date || toISODate(dhakaNow()));
        setTotalAmount(purchase.totalAmount !== undefined && purchase.totalAmount !== null ? String(purchase.totalAmount) : '');
        setPaidAmount(purchase.paidAmount !== undefined && purchase.paidAmount !== null ? String(purchase.paidAmount) : '');
        setNotes(purchase.notes || '');
        setItems(Array.isArray(purchase.items) ? purchase.items : []);
      } else {
        setShop(supplierShops[0]?.name || '');
        setInvoiceNum('');
        setDate(toISODate(dhakaNow()));
        setTotalAmount('');
        setPaidAmount('');
        setNotes('');
        setItems([]);
      }
    }
  }, [isOpen, purchase, supplierShops]);

  // Derived calculations
  const numTotal = parseFloat(totalAmount) || 0;
  const numPaid = parseFloat(paidAmount) || 0;
  const remainingDue = Math.max(0, numTotal - numPaid);

  // Line items actions
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { desc: '', qty: 1, unitCost: 0, total: 0 }
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      const q = parseFloat(row.qty) || 0;
      const u = parseFloat(row.unitCost) || 0;
      row.total = Math.round(q * u);
      copy[index] = row;
      return copy;
    });
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMatchFullPaid = () => {
    if (numTotal > 0) {
      setPaidAmount(String(numTotal));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!shop.trim()) {
      showToast?.('Please select a supplier shop.');
      return;
    }
    if (!numTotal && numTotal !== 0) {
      showToast?.('Please enter a total bill amount.');
      return;
    }
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    setIsSaving(true);
    try {
      const nowISO = new Date().toISOString();
      const serverTs = firebase.firestore?.FieldValue
        ? firebase.firestore.FieldValue.serverTimestamp()
        : null;

      const payload = {
        shop: shop.trim(),
        invoiceNum: invoiceNum.trim(),
        date: date || toISODate(dhakaNow()),
        totalAmount: Math.round(numTotal),
        paidAmount: Math.round(numPaid),
        dueAmount: Math.round(remainingDue),
        notes: notes.trim(),
        items: items.map(it => ({
          desc: (it.desc || '').trim(),
          qty: Number(it.qty) || 1,
          unitCost: Number(it.unitCost) || 0,
          total: Number(it.total) || 0
        })),
        updatedAt: nowISO,
        enteredBy: user?.displayName || user?.email || 'Authorized User'
      };

      if (isEditing) {
        const before = { ...purchase };
        await db.collection('purchases').doc(purchase.id).set({
          ...payload,
          createdAt: purchase.createdAt || nowISO
        }, { merge: true });

        await logAudit('purchase', purchase.id, 'update', before, payload, user);
        showToast?.(`Purchase invoice updated (${formatMoney(payload.totalAmount)})`);
      } else {
        payload.createdAt = serverTs;
        payload.createdAtMillis = Date.now();
        const ref = await db.collection('purchases').add(payload);
        await logAudit('purchase', ref.id, 'create', null, payload, user);
        showToast?.(`Purchase invoice saved (${formatMoney(payload.totalAmount)})`);
      }

      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save purchase error:', err);
      showToast?.('Failed to save purchase invoice');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col",
        header: "border-b border-default-100 py-4 px-6",
        body: "py-6 px-6 flex-1 overflow-y-auto",
        footer: "border-t border-default-100 py-3.5 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Procurement & Inbound Stock
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                {isEditing ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Row 1: Supplier Shop, Bill No, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-default-600">
                      Supplier Shop <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenNewShop?.()}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + New Shop
                    </button>
                  </div>
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

                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Supplier Bill / Invoice #
                  </label>
                  <Input
                    size="sm"
                    variant="bordered"
                    placeholder="e.g. INV-8820"
                    value={invoiceNum}
                    onChange={(e) => setInvoiceNum(e.target.value)}
                    classNames={{ inputWrapper: "h-10 border-default-300" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Purchase Date <span className="text-danger">*</span>
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
              </div>

              {/* Payment Breakdown Box */}
              <div className="p-4 rounded-xl bg-default-100 border border-default-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Total Bill Amount (৳) <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      size="sm"
                      variant="bordered"
                      placeholder="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      classNames={{
                        inputWrapper: "h-10 border-default-300 font-numeric font-bold text-base"
                      }}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        Amount Paid Now (৳)
                      </label>
                      <button
                        type="button"
                        onClick={handleMatchFullPaid}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 hover:bg-teal-500/25 transition-colors"
                      >
                        Full Paid
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      size="sm"
                      variant="bordered"
                      placeholder="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      classNames={{
                        inputWrapper: "h-10 border-default-300 font-numeric font-bold text-base text-teal-600 dark:text-teal-400"
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-danger-500 mb-1.5">
                      Remaining Due (৳)
                    </label>
                    <div className="text-xl font-bold font-numeric text-danger-500 h-10 flex items-center">
                      {formatMoney(remainingDue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Separate Products / Line Items
                    </span>
                    <span className="text-[11px] text-default-400">(Optional)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="flat"
                    onPress={handleAddItemRow}
                    startContent={<Plus className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold h-7"
                  >
                    Add Product Item
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="border border-default-200/80 rounded-xl overflow-hidden mb-2">
                    <table className="w-full text-xs">
                      <thead className="bg-default-100 text-default-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Item Description / Model</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right">Unit Cost (৳)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Total (৳)</th>
                          <th className="py-2.5 px-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-default-100">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <Input
                                size="sm"
                                variant="bordered"
                                placeholder="Model / Name"
                                value={it.desc}
                                onChange={(e) => handleUpdateItem(idx, 'desc', e.target.value)}
                                classNames={{ inputWrapper: "h-8 border-default-300" }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="1"
                                size="sm"
                                variant="bordered"
                                value={String(it.qty)}
                                onChange={(e) => handleUpdateItem(idx, 'qty', e.target.value)}
                                classNames={{ inputWrapper: "h-8 border-default-300 font-numeric text-center" }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                size="sm"
                                variant="bordered"
                                value={String(it.unitCost)}
                                onChange={(e) => handleUpdateItem(idx, 'unitCost', e.target.value)}
                                classNames={{ inputWrapper: "h-8 border-default-300 font-numeric text-right" }}
                              />
                            </td>
                            <td className="p-2 text-right font-numeric font-bold text-foreground">
                              {formatMoney(it.total || 0)}
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => handleRemoveItem(idx)}
                                className="w-6 h-6 min-w-6 text-danger-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Purchase Notes */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Purchase Notes / Remarks
                </label>
                <Input
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Warranty details, courier tracking, cash memo ref"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                {isEditing ? 'Save Changes' : 'Save Purchase'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
