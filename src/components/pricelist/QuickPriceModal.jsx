import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button
} from '@heroui/react';
import { DollarSign, Save, X } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatMoney } from '../../utils/calculations';

export default function QuickPriceModal({
  isOpen,
  onClose,
  item,
  onSaveSuccess,
  showToast
}) {
  const { user } = useAuth();
  const { syncAllData } = useData();

  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    }
  }, [isOpen, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item?.id) return;

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast?.('Please enter a valid price amount.');
      return;
    }

    const roundedNewPrice = Math.round(numPrice);
    if (item.price === roundedNewPrice) {
      onClose();
      return;
    }

    if (!firebaseReady || !db) {
      showToast?.('Firebase offline / unconfigured');
      return;
    }

    setIsSaving(true);
    try {
      const nowISO = new Date().toISOString();
      await db.collection('price_list').doc(item.id).update({
        price: roundedNewPrice,
        updatedAt: nowISO
      });

      await logAudit(
        'price_list',
        item.id,
        'update',
        { price: item.price },
        { price: roundedNewPrice },
        user
      );

      showToast?.(`✓ Price updated for "${item.model}": ${formatMoney(item.price)} → ${formatMoney(roundedNewPrice)}`);
      syncAllData?.();
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Quick price error:', err);
      showToast?.('Failed to update price');
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
        header: "border-b border-default-100 py-3.5 px-6",
        body: "py-5 px-6",
        footer: "border-t border-default-100 py-3.5 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Quick Price Update
              </span>
              <h2 className="text-base font-bold font-display text-foreground truncate max-w-full">
                {item?.model || 'Product Model'}
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-default-600 mb-1.5">
                  New Price (Tk) <span className="text-danger">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  variant="bordered"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  startContent={<span className="text-sm font-bold text-default-400">৳</span>}
                  classNames={{
                    inputWrapper: "h-11 border-default-300 focus-within:border-primary font-numeric font-bold text-lg"
                  }}
                  autoFocus
                  required
                />
                <div className="text-[11.5px] text-default-400 mt-1">
                  Current: <b className="font-numeric">{formatMoney(item?.price || 0)}</b>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={onClose}
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
              >
                Save Price
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
