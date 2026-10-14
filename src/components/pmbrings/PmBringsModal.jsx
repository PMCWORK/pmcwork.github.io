import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem
} from '@heroui/react';
import { Truck, Calendar, Save, X, Plus } from 'lucide-react';
import { db, firebase, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import {
  getUnifiedShopList,
  getCanonicalShop,
  formatDateTimeLabels,
  toISODate,
  dhakaNow,
  localDatetimeValue
} from '../../utils/productHelpers';

export default function PmBringsModal({
  isOpen,
  onClose,
  item,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { shops, syncAllData } = useData();
  const { appPrompt } = useDialog();

  const isEditing = Boolean(item?.id);
  const unifiedShops = getUnifiedShopList(shops);

  const [shop, setShop] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [sn, setSn] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setShop(getCanonicalShop(item.shop) || item.shop || '');
        setDesc(item.desc || '');
        setAmount(item.amount !== undefined && item.amount !== null ? String(item.amount) : '');
        setSn(item.sn || '');
        setNote(item.note || '');

        if (item.dateISO) {
          setDateTime(`${item.dateISO}T12:00`);
        } else {
          setDateTime(localDatetimeValue(dhakaNow()));
        }
      } else {
        setShop(unifiedShops[0] || 'Liton');
        setDesc('');
        setAmount('');
        setSn('');
        setNote('');
        setDateTime(localDatetimeValue(dhakaNow()));
      }
    }
  }, [isOpen, item]);

  const handleShopChange = async (keys) => {
    const selected = Array.from(keys)[0];
    if (selected === '__add_new__') {
      const newShopName = await appPrompt({
        title: 'New Shop',
        message: 'Enter new shop name:',
        placeholder: 'Shop name...',
        confirmText: 'Add Shop'
      });

      if (newShopName && newShopName.trim()) {
        const trimmed = newShopName.trim();
        if (firebaseReady && db) {
          try {
            await db.collection('shops').add({ name: trimmed });
            await syncAllData?.();
            setShop(trimmed);
            showToast?.(`Shop "${trimmed}" added`);
          } catch (e) {
            console.error(e);
            showToast?.('Failed to add shop');
          }
        }
      }
    } else if (selected) {
      setShop(String(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!shop || shop === '__add_new__') {
      showToast?.('Please select a valid shop.');
      return;
    }
    if (!desc.trim()) {
      showToast?.('Please enter product description.');
      return;
    }
    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured.');
      return;
    }

    setIsSaving(true);
    try {
      const dt = dateTime ? new Date(dateTime) : dhakaNow();
      const { dateLabel, timeLabel } = formatDateTimeLabels(dt);
      const isoDate = toISODate(dt);
      const numAmount = amount ? parseFloat(amount) : null;

      const payload = {
        shop: shop.trim(),
        desc: desc.trim(),
        amount: numAmount !== null && !isNaN(numAmount) ? numAmount : null,
        sn: sn.trim(),
        note: note.trim(),
        dateLabel,
        timeLabel,
        dateISO: isoDate,
        enteredBy: user?.displayName || user?.email || 'Authorized User'
      };

      if (isEditing) {
        const before = { ...item };
        await db.collection('pm_brings').doc(item.id).update(payload);
        await logAudit('pm_brings', item.id, 'update', before, payload, user);
        showToast?.('Brought item entry updated');
      } else {
        const serverTs = firebase.firestore?.FieldValue
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null;

        const newEntry = {
          ...payload,
          status: 'unmarked',
          createdAt: serverTs,
          createdAtMillis: Date.now()
        };

        const docRef = await db.collection('pm_brings').add(newEntry);
        await logAudit('pm_brings', docRef.id, 'create', null, newEntry, user);
        showToast?.('Brought item saved to log');
      }

      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save PM Brings error:', err);
      showToast?.('Failed to save brought item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto",
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
                Sourcing & Logistics Intake
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                {isEditing ? 'Edit Brought Item' : 'New Brought Item'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Shop Select with '+ Add new shop' */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Shop Name <span className="text-danger">*</span>
                </label>
                <Select
                  size="sm"
                  variant="bordered"
                  aria-label="Shop Name"
                  selectedKeys={shop ? new Set([shop]) : new Set([])}
                  onSelectionChange={handleShopChange}
                  classNames={{ trigger: "h-10 border-default-300 focus-within:border-primary" }}
                  required
                >
                  {unifiedShops.map((s) => (
                    <SelectItem key={s} textValue={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem
                    key="__add_new__"
                    textValue="+ Add new shop..."
                    className="text-primary font-bold border-t border-default-100"
                  >
                    + Add new shop…
                  </SelectItem>
                </Select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Date & Time <span className="text-danger">*</span>
                </label>
                <Input
                  type="datetime-local"
                  size="sm"
                  variant="bordered"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300 focus-within:border-primary" }}
                  required
                />
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Product Description <span className="text-danger">*</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Gigabyte B760M Motherboard"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300 focus-within:border-primary font-medium" }}
                  required
                />
              </div>

              {/* Amount (৳) */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Amount <span className="text-default-400 font-normal">(৳, Optional)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  size="sm"
                  variant="bordered"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  startContent={<span className="text-xs font-bold text-default-400">৳</span>}
                  classNames={{ inputWrapper: "h-10 border-default-300 focus-within:border-primary font-numeric font-bold" }}
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Serial Number <span className="text-default-400 font-normal">(Optional, comma separated)</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. SN-998124"
                  value={sn}
                  onChange={(e) => setSn(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300 focus-within:border-primary font-mono text-xs" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Notes / Remarks <span className="text-default-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. For customer order / replacement"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  classNames={{ inputWrapper: "h-10 border-default-300 focus-within:border-primary" }}
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
                startContent={!isSaving && (isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
              >
                {isEditing ? 'Save Changes' : 'Save Entry'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
