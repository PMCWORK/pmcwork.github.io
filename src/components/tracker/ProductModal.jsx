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
import { Box, Calendar, Plus, Save, X } from 'lucide-react';
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
  localDatetimeValue,
  getNextAvailableProductNumber,
  productDateISO
} from '../../utils/productHelpers';

export default function ProductModal({
  isOpen,
  onClose,
  product,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { shops, products, syncAllData } = useData();
  const { appPrompt } = useDialog();

  const isEditing = Boolean(product?.id);
  const unifiedShops = getUnifiedShopList(shops);

  const [shop, setShop] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [desc, setDesc] = useState('');
  const [sn, setSn] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setShop(getCanonicalShop(product.shop) || product.shop || '');
        setDesc(product.desc || '');
        setSn(product.sn || '');
        setNote(product.note || '');

        const iso = productDateISO(product);
        if (iso) {
          const timeParts = product.timeLabel ? product.timeLabel.split(' ') : [];
          setDateTime(`${iso}T12:00`);
        } else {
          setDateTime(localDatetimeValue(dhakaNow()));
        }
      } else {
        setShop(unifiedShops[0] || 'Liton');
        setDesc('');
        setSn('');
        setNote('');
        setDateTime(localDatetimeValue(dhakaNow()));
      }
    }
  }, [isOpen, product]);

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
      showToast?.('Please enter a product model/description.');
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

      const payload = {
        shop: shop.trim(),
        desc: desc.trim(),
        sn: sn.trim(),
        note: note.trim(),
        dateLabel,
        timeLabel,
        dateISO: isoDate,
        enteredBy: user?.displayName || user?.email || 'Authorized User'
      };

      if (isEditing) {
        const before = {
          shop: product.shop,
          desc: product.desc,
          sn: product.sn,
          note: product.note,
          status: product.status,
          trackNum: product.trackNum,
          dateLabel: product.dateLabel,
          timeLabel: product.timeLabel
        };

        await db.collection('product_tracker').doc(product.id).update(payload);
        await logAudit('product', product.id, 'update', before, payload, user);
        showToast?.('Product entry updated');
      } else {
        const trackNum = getNextAvailableProductNumber(products);
        const serverTs = firebase.firestore?.FieldValue
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null;

        const newEntry = {
          ...payload,
          status: 'unmarked',
          soldAtMillis: null,
          trackNum,
          createdAt: serverTs,
          createdAtMillis: Date.now()
        };

        const docRef = await db.collection('product_tracker').add(newEntry);
        await logAudit('product', docRef.id, 'create', null, newEntry, user);
        showToast?.(`Entry added (#${trackNum})`);
      }

      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save product error:', err);
      showToast?.('Failed to save product entry.');
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
                Warranty Log & Serial Tracker
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                {isEditing ? `Edit Product Entry #${product?.trackNum || ''}` : 'Add Product Entry'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Shop Select with '+ Add new shop' */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Shop <span className="text-danger">*</span>
                </label>
                <Select
                  size="sm"
                  variant="bordered"
                  aria-label="Shop"
                  selectedKeys={shop ? new Set([shop]) : new Set([])}
                  onSelectionChange={handleShopChange}
                  classNames={{
                    trigger: "h-10 border-default-300 focus-within:border-primary"
                  }}
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
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary"
                  }}
                  required
                />
              </div>

              {/* Product Description / Model */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Model / Product Name <span className="text-danger">*</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Asus Vivobook 15 Core i5"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary font-medium"
                  }}
                  required
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
                  placeholder="e.g. SN-8849201, SN-8849202"
                  value={sn}
                  onChange={(e) => setSn(e.target.value)}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary font-mono text-xs"
                  }}
                />
              </div>

              {/* Notes / Specs */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Notes / Specs <span className="text-default-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. 16GB RAM / 512GB SSD / Blue"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary"
                  }}
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
