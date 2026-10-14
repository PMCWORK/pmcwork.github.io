import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip
} from '@heroui/react';
import {
  FileText,
  Calendar,
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  CheckCircle,
  X,
  Shield,
  Layers
} from 'lucide-react';
import { db, firebaseReady, firebase } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, toISODate, dhakaNow } from '../../utils/calculations';
import {
  getNextInvoiceNumber,
  burnInvoiceNumber,
  SALESPERSONS,
  WARRANTY_PRESET_OPTIONS
} from '../../utils/invoiceHelpers';

export default function InvoiceFormCard({
  isOpen,
  onClose,
  initialInvoice = null,
  isClone = false,
  allInvoices = [],
  remoteCounters = {},
  onSuccess
}) {
  const { user } = useAuth();
  const todayISO = toISODate(dhakaNow());

  const [date, setDate] = useState(todayISO);
  const [number, setNumber] = useState('');
  const [soldBy, setSoldBy] = useState('FOYEZ');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [discount, setDiscount] = useState('');
  const [items, setItems] = useState([
    {
      desc: '',
      hasWarranty: false,
      warrantyDays: '365 days',
      warrantyNote: '',
      isCustomWarranty: false,
      customWarrantyDays: '',
      qty: 1,
      price: ''
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialInvoice && !isClone;

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setIsSaving(false);

    if (isClone && initialInvoice) {
      const d = todayISO;
      setDate(d);
      setNumber(getNextInvoiceNumber(d, allInvoices, remoteCounters));
      setSoldBy(initialInvoice.soldBy || 'FOYEZ');
      setBuyerName(initialInvoice.buyerName || '');
      setBuyerPhone(initialInvoice.buyerPhone || '');
      setBuyerAddress(initialInvoice.buyerAddress || '');
      setDiscount(initialInvoice.discount !== undefined && initialInvoice.discount !== null ? String(initialInvoice.discount) : '');

      if (Array.isArray(initialInvoice.items) && initialInvoice.items.length > 0) {
        setItems(
          initialInvoice.items.map((it) => {
            const hasW = !!(it.warrantyDays || it.warrantyNote);
            const isCustom = hasW && !['365 days', '730 days', '1095 days', '1825 days'].includes(it.warrantyDays);
            return {
              desc: it.desc || '',
              hasWarranty: hasW,
              warrantyDays: isCustom ? 'custom' : (it.warrantyDays || '365 days'),
              customWarrantyDays: isCustom ? it.warrantyDays : '',
              warrantyNote: it.warrantyNote || '',
              isCustomWarranty: isCustom,
              qty: it.qty !== undefined ? it.qty : 1,
              price: it.price !== undefined && it.price !== null ? String(it.price) : ''
            };
          })
        );
      } else {
        setItems([createEmptyItem()]);
      }
    } else if (isEdit && initialInvoice) {
      const d = initialInvoice.date || todayISO;
      setDate(d);
      setNumber(initialInvoice.number || getNextInvoiceNumber(d, allInvoices, remoteCounters));
      setSoldBy(initialInvoice.soldBy || 'FOYEZ');
      setBuyerName(initialInvoice.buyerName || '');
      setBuyerPhone(initialInvoice.buyerPhone || '');
      setBuyerAddress(initialInvoice.buyerAddress || '');
      setDiscount(initialInvoice.discount !== undefined && initialInvoice.discount !== null ? String(initialInvoice.discount) : '');

      if (Array.isArray(initialInvoice.items) && initialInvoice.items.length > 0) {
        setItems(
          initialInvoice.items.map((it) => {
            const hasW = !!(it.warrantyDays || it.warrantyNote);
            const isCustom = hasW && !['365 days', '730 days', '1095 days', '1825 days'].includes(it.warrantyDays);
            return {
              desc: it.desc || '',
              hasWarranty: hasW,
              warrantyDays: isCustom ? 'custom' : (it.warrantyDays || '365 days'),
              customWarrantyDays: isCustom ? it.warrantyDays : '',
              warrantyNote: it.warrantyNote || '',
              isCustomWarranty: isCustom,
              qty: it.qty !== undefined ? it.qty : 1,
              price: it.price !== undefined && it.price !== null ? String(it.price) : ''
            };
          })
        );
      } else {
        setItems([createEmptyItem()]);
      }
    } else {
      const d = todayISO;
      setDate(d);
      setNumber(getNextInvoiceNumber(d, allInvoices, remoteCounters));
      setSoldBy('FOYEZ');
      setBuyerName('');
      setBuyerPhone('');
      setBuyerAddress('');
      setDiscount('');
      setItems([createEmptyItem()]);
    }
  }, [isOpen, initialInvoice, isClone, isEdit, todayISO, allInvoices, remoteCounters]);

  // When date changes in new/clone mode, recalculate sequence number
  const handleDateChange = (newDate) => {
    setDate(newDate);
    if (!isEdit) {
      setNumber(getNextInvoiceNumber(newDate, allInvoices, remoteCounters));
    }
  };

  function createEmptyItem() {
    return {
      desc: '',
      hasWarranty: false,
      warrantyDays: '365 days',
      warrantyNote: '',
      isCustomWarranty: false,
      customWarrantyDays: '',
      qty: 1,
      price: ''
    };
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Calculations
  const totalAmount = items.reduce((acc, it) => {
    const q = Number(it.qty) || 0;
    const p = Number(it.price) || 0;
    return acc + (q * p);
  }, 0);

  const discountNum = Number(discount) || 0;
  const grandTotal = Math.max(0, totalAmount - discountNum);

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!number.trim()) {
      setError('Invoice number is required.');
      return;
    }

    const validItems = items.filter((it) => it.desc && it.desc.trim().length > 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item with a product description.');
      return;
    }

    const payloadItems = items.map((it) => {
      const qtyNum = Number(it.qty) || 1;
      const priceNum = Number(it.price) || 0;
      const tot = qtyNum * priceNum;

      let wDays = '';
      let wNote = '';
      if (it.hasWarranty) {
        if (it.warrantyDays === 'custom') {
          wDays = it.customWarrantyDays.trim() || 'Custom';
        } else {
          wDays = it.warrantyDays || '365 days';
        }
        wNote = (it.warrantyNote || '').trim();
      }

      return {
        desc: it.desc.trim(),
        warrantyDays: wDays,
        warrantyNote: wNote,
        qty: qtyNum,
        price: priceNum,
        total: tot
      };
    });

    const payload = {
      number: number.trim(),
      date: date || todayISO,
      soldBy,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerAddress: buyerAddress.trim(),
      items: payloadItems,
      totalAmount,
      discount: discountNum,
      grandTotal,
      enteredBy: user?.displayName || user?.email || 'Authorized User'
    };

    setIsSaving(true);
    try {
      await burnInvoiceNumber(payload.number, user);

      const serverTs = firebase.firestore?.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : null;
      let savedId = initialInvoice?.id;

      if (isEdit && initialInvoice) {
        if (firebaseReady && db) {
          await db.collection('invoices').doc(initialInvoice.id).set({
            ...payload,
            updatedAt: serverTs
          }, { merge: true });
          await logAudit('invoice', initialInvoice.id, 'update', initialInvoice, payload, user);
        }
      } else {
        if (firebaseReady && db) {
          const docRef = await db.collection('invoices').add({
            ...payload,
            createdAt: serverTs
          });
          savedId = docRef.id;
          await logAudit('invoice', savedId, 'create', null, payload, user);
        } else {
          savedId = 'local_' + Date.now();
        }
      }

      if (onSuccess) onSuccess(savedId);
      onClose();
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError('Failed to save invoice. Please check connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="border border-default-200 bg-content1 shadow-md mb-6 animate-in fade-in slide-in-from-top-4 duration-200">
      <CardBody className="p-5 sm:p-6 space-y-5">
        {/* Form Title & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-default-200">
          <div>
            <div className="text-xs uppercase font-extrabold text-primary tracking-wider font-display">
              {isClone
                ? `Clone Template from #${initialInvoice?.number || ''}`
                : isEdit
                ? `Edit Existing Invoice #${initialInvoice?.number || ''}`
                : 'Invoice Builder'}
            </div>
            <h3 className="text-lg font-bold font-display text-foreground mt-0.5">
              {isClone
                ? 'Create Cloned Invoice'
                : isEdit
                ? `Edit Invoice #${number}`
                : 'Create New Customer Invoice'}
            </h3>
          </div>

          <Button
            size="sm"
            variant="light"
            isIconOnly
            className="text-default-400 hover:text-foreground"
            onPress={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <div className="p-3 text-xs text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metadata Grid: 2 rows with matching block labels and heights */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Invoice No. <span className="text-[11px] font-normal text-default-400">(Auto)</span>
                </label>
                <Input
                  size="sm"
                  variant="flat"
                  value={number}
                  isReadOnly
                  classNames={{
                    inputWrapper: "h-9 bg-default-100/70 border border-default-200 cursor-not-allowed",
                    input: "font-numeric font-bold text-foreground"
                  }}
                />
                <span className="text-[10px] text-default-400 mt-1 block">
                  Sequential ID &amp; Burned counter
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Invoice Date <span className="text-danger">*</span>
                </label>
                <Input
                  type="date"
                  size="sm"
                  variant="bordered"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  classNames={{
                    inputWrapper: "h-9 border-default-300 focus-within:border-primary"
                  }}
                  isRequired
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Sold By <span className="text-danger">*</span>
                </label>
                <Select
                  size="sm"
                  variant="bordered"
                  aria-label="Sold By"
                  selectedKeys={new Set([soldBy])}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys)[0];
                    if (k) setSoldBy(String(k));
                  }}
                  classNames={{
                    trigger: "h-9 border-default-300 focus-within:border-primary"
                  }}
                  isRequired
                >
                  {SALESPERSONS.map((sp) => (
                    <SelectItem key={sp} textValue={sp}>
                      {sp}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {/* Customer Metadata Grid: 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Buyer Name
                </label>
                <Input
                  placeholder="e.g. Valued Customer, Mr. Rahim..."
                  size="sm"
                  variant="bordered"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  startContent={<User className="w-4 h-4 text-default-400" />}
                  classNames={{
                    inputWrapper: "h-9 border-default-300 focus-within:border-primary"
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Phone No.
                </label>
                <Input
                  placeholder="e.g. 017XXXXXXXX"
                  size="sm"
                  variant="bordered"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  startContent={<Phone className="w-4 h-4 text-default-400" />}
                  classNames={{
                    inputWrapper: "h-9 border-default-300 focus-within:border-primary"
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Address
                </label>
                <Input
                  placeholder="e.g. Mirpur-1, Dhaka..."
                  size="sm"
                  variant="bordered"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  startContent={<MapPin className="w-4 h-4 text-default-400" />}
                  classNames={{
                    inputWrapper: "h-9 border-default-300 focus-within:border-primary"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-default-500 font-display">
                Line Items &amp; Warranty Specification
              </span>
              <Button
                type="button"
                size="sm"
                variant="flat"
                color="primary"
                className="h-7 text-xs font-semibold"
                startContent={<Plus className="w-3.5 h-3.5" />}
                onPress={handleAddItem}
              >
                Add line item
              </Button>
            </div>

            <div className="border border-default-200 rounded-xl overflow-hidden bg-content2/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-default-100 text-default-600 font-bold border-b border-default-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Product Description &amp; Warranty</th>
                    <th className="py-2.5 px-3 w-24 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Price (৳)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Total (৳)</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {items.map((item, index) => {
                    const rowTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);

                    return (
                      <tr key={index} className="hover:bg-default-50/50 transition-colors">
                        {/* Row # */}
                        <td className="py-3 px-3 text-center font-bold text-default-400 font-numeric">
                          {index + 1}
                        </td>

                        {/* Description & Warranty Toggle */}
                        <td className="py-3 px-3 space-y-2">
                          <Input
                            placeholder="Product name, brand, model..."
                            size="sm"
                            variant="bordered"
                            value={item.desc}
                            onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                            isRequired
                          />

                          {/* Warranty Bar */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="text-default-400 font-semibold flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-default-400" />
                              Warranty:
                            </span>

                            <div className="inline-flex rounded-lg border border-default-200 p-0.5 bg-content1">
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'hasWarranty', false)}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                  !item.hasWarranty
                                    ? 'bg-default-200 text-foreground'
                                    : 'text-default-400 hover:text-foreground'
                                }`}
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'hasWarranty', true)}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                  item.hasWarranty
                                    ? 'bg-primary text-white'
                                    : 'text-default-400 hover:text-foreground'
                                }`}
                              >
                                Yes
                              </button>
                            </div>

                            {item.hasWarranty && (
                              <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                                <Select
                                  size="sm"
                                  variant="bordered"
                                  className="w-40"
                                  selectedKeys={new Set([item.warrantyDays])}
                                  onSelectionChange={(keys) => {
                                    const k = Array.from(keys)[0];
                                    if (k) {
                                      handleItemChange(index, 'warrantyDays', String(k));
                                      handleItemChange(index, 'isCustomWarranty', k === 'custom');
                                    }
                                  }}
                                  aria-label="Warranty duration"
                                >
                                  {WARRANTY_PRESET_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} textValue={opt.label}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </Select>

                                {item.warrantyDays === 'custom' && (
                                  <Input
                                    placeholder="e.g. 180 days"
                                    size="sm"
                                    variant="bordered"
                                    className="w-28"
                                    value={item.customWarrantyDays}
                                    onChange={(e) => handleItemChange(index, 'customWarrantyDays', e.target.value)}
                                  />
                                )}

                                <Input
                                  placeholder="Custom note (e.g. Serial, MyText)"
                                  size="sm"
                                  variant="bordered"
                                  className="w-44"
                                  value={item.warrantyNote}
                                  onChange={(e) => handleItemChange(index, 'warrantyNote', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            size="sm"
                            variant="bordered"
                            classNames={{
                              input: "text-center font-numeric font-bold"
                            }}
                            value={String(item.qty)}
                            onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value, 10) || 1)}
                            isRequired
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            size="sm"
                            variant="bordered"
                            classNames={{
                              input: "text-right font-numeric font-bold"
                            }}
                            value={String(item.price)}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            isRequired
                          />
                        </td>

                        {/* Item Total */}
                        <td className="py-3 px-3 text-right font-numeric font-extrabold text-sm text-foreground">
                          {formatMoney(rowTotal)}
                        </td>

                        {/* Delete Row */}
                        <td className="py-3 px-3 text-center">
                          <Button
                            type="button"
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            isDisabled={items.length <= 1}
                            onPress={() => handleRemoveItem(index)}
                            className="h-7 w-7 text-default-400 hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtotal & Calculations Bar */}
          <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="flat"
              size="sm"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleAddItem}
            >
              Add line item
            </Button>

            <div className="w-full sm:w-72 space-y-2 p-3 bg-default-50 rounded-xl border border-default-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-default-500 font-semibold">Total Amount:</span>
                <span className="font-numeric font-bold text-foreground">
                  {formatMoney(totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-default-500 font-semibold">Discount (৳):</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  size="sm"
                  variant="bordered"
                  className="w-28"
                  classNames={{
                    inputWrapper: "h-8 min-h-8",
                    input: "font-numeric font-bold text-xs text-right"
                  }}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-default-200 flex items-center justify-between">
                <span className="text-sm font-extrabold text-foreground font-display">
                  Grand Total:
                </span>
                <span className="font-numeric font-black text-lg text-primary">
                  {formatMoney(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-default-200">
            <Button
              type="button"
              variant="flat"
              size="sm"
              onPress={onClose}
              isDisabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              color="primary"
              size="sm"
              isLoading={isSaving}
              startContent={!isSaving && <CheckCircle className="w-4 h-4" />}
              className="font-bold text-xs"
            >
              {isEdit ? 'Save & View Invoice' : 'Generate & View Invoice'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
