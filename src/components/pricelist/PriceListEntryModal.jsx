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
import { Tag, Save, X, Plus } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../context/DialogContext';
import { DEFAULT_CATALOG_BRANDS, DEFAULT_CATALOG_TYPES } from '../../utils/priceListHelpers';

export default function PriceListEntryModal({
  isOpen,
  onClose,
  item,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { priceBrands, priceTypes, syncAllData } = useData();
  const { appPrompt } = useDialog();

  const isEditing = Boolean(item?.id);

  const brandsList = (priceBrands && priceBrands.length) ? priceBrands : DEFAULT_CATALOG_BRANDS;
  const typesList = (priceTypes && priceTypes.length) ? priceTypes : DEFAULT_CATALOG_TYPES;

  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setBrand(item.brand || '');
        setType(item.type || '');
        setModel(item.model || '');
        setPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
        setNotes(item.notes || '');
      } else {
        setBrand('');
        setType('');
        setModel('');
        setPrice('');
        setNotes('');
      }
    }
  }, [isOpen, item]);

  // Inline Quick Add Brand
  const handleQuickAddBrand = async () => {
    const newBrand = await appPrompt({
      title: 'New Catalog Brand',
      message: 'Enter brand name to add to catalog:',
      placeholder: 'Brand name (e.g. Acer, Razer)...',
      confirmText: 'Add Brand'
    });

    if (newBrand && newBrand.trim()) {
      const trimmed = newBrand.trim();
      const updated = Array.from(new Set([...brandsList, trimmed])).sort();
      if (firebaseReady && db) {
        try {
          await db.collection('settings').doc('price_list_brands').set({
            brands: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          await syncAllData?.();
          setBrand(trimmed);
          showToast?.(`Brand "${trimmed}" added`);
        } catch (e) {
          console.error(e);
          showToast?.('Failed to save new brand');
        }
      }
    }
  };

  // Inline Quick Add Type
  const handleQuickAddType = async () => {
    const newType = await appPrompt({
      title: 'New Product Type',
      message: 'Enter product type to add to catalog:',
      placeholder: 'Product type (e.g. Webcam, Speaker)...',
      confirmText: 'Add Type'
    });

    if (newType && newType.trim()) {
      const trimmed = newType.trim();
      const updated = Array.from(new Set([...typesList, trimmed])).sort();
      if (firebaseReady && db) {
        try {
          await db.collection('settings').doc('price_list_types').set({
            types: updated,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          await syncAllData?.();
          setType(trimmed);
          showToast?.(`Product type "${trimmed}" added`);
        } catch (e) {
          console.error(e);
          showToast?.('Failed to save new product type');
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!model.trim()) {
      showToast?.('Please enter a product / model name.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast?.('Please enter a valid price amount.');
      return;
    }

    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured.');
      return;
    }

    setIsSaving(true);
    try {
      const nowISO = new Date().toISOString();
      const payload = {
        brand: brand.trim(),
        type: type.trim(),
        model: model.trim(),
        price: Math.round(numPrice),
        notes: notes.trim(),
        updatedAt: nowISO
      };

      if (isEditing) {
        const before = { ...item };
        await db.collection('price_list').doc(item.id).set({
          ...payload,
          createdAt: item.createdAt || nowISO
        }, { merge: true });

        await logAudit(
          'price_list',
          item.id,
          'update',
          before,
          payload,
          user
        );
        showToast?.(`Updated "${model.trim()}"`);
      } else {
        payload.createdAt = nowISO;
        const ref = await db.collection('price_list').add(payload);
        await logAudit('price_list', ref.id, 'create', null, payload, user);
        showToast?.(`Added "${model.trim()}" (৳ ${payload.price})`);
      }

      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save price error:', err);
      showToast?.('Failed to save price entry');
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
                Catalog & Dynamic Pricing
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                {isEditing ? 'Edit Product Price' : 'Add Product Price'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Row 1: Brand & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-default-600">
                      Brand
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickAddBrand}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + New Brand
                    </button>
                  </div>
                  <Select
                    size="sm"
                    variant="bordered"
                    placeholder="Generic / No Brand"
                    selectedKeys={brand ? new Set([brand]) : new Set([])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      setBrand(val ? String(val) : '');
                    }}
                    classNames={{ trigger: "h-10 border-default-300" }}
                  >
                    <SelectItem key="" textValue="— Generic / No Brand —">
                      — Generic / No Brand —
                    </SelectItem>
                    {brandsList.map((b) => (
                      <SelectItem key={b} textValue={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Product Type Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-default-600">
                      Product Type
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickAddType}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + New Type
                    </button>
                  </div>
                  <Select
                    size="sm"
                    variant="bordered"
                    placeholder="Uncategorized"
                    selectedKeys={type ? new Set([type]) : new Set([])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      setType(val ? String(val) : '');
                    }}
                    classNames={{ trigger: "h-10 border-default-300" }}
                  >
                    <SelectItem key="" textValue="— Uncategorized —">
                      — Uncategorized —
                    </SelectItem>
                    {typesList.map((t) => (
                      <SelectItem key={t} textValue={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Model / Name */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Model / Product Name <span className="text-danger">*</span>
                </label>
                <Input
                  type="text"
                  size="sm"
                  variant="bordered"
                  placeholder="e.g. Core i5 12400F / GeForce RTX 4060"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary font-medium"
                  }}
                  required
                />
              </div>

              {/* Price (Tk) */}
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  Price (Tk) <span className="text-danger">*</span>
                </label>
                <Input
                  type="number"
                  size="sm"
                  variant="bordered"
                  placeholder="0"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  startContent={<span className="text-xs font-bold text-default-400">৳</span>}
                  classNames={{
                    inputWrapper: "h-10 border-default-300 focus-within:border-primary font-numeric font-bold"
                  }}
                  required
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
                  placeholder="e.g. 3 Years Warranty / Box Pack"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                startContent={!isSaving && <Save className="w-4 h-4" />}
              >
                {isEditing ? 'Save Changes' : 'Save Price'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
