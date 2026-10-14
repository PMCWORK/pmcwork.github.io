import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Chip
} from '@heroui/react';
import { Calendar, Save, X } from 'lucide-react';
import { db, firebaseReady } from '../../services/firebase';
import { logAudit } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatPct } from '../../utils/calculations';

export default function SaleEditModal({ isOpen, onClose, sale, onSaveSuccess, showToast }) {
  const { user } = useAuth();
  const { appConfirm } = useDialog();

  const [date, setDate] = useState('');
  const [saleAmt, setSaleAmt] = useState('');
  const [profit, setProfit] = useState('');
  const [cost, setCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sale) {
      setDate(sale.date || '');
      setSaleAmt(sale.sale !== undefined && sale.sale !== null ? String(sale.sale) : '');
      setProfit(sale.profit !== undefined && sale.profit !== null ? String(sale.profit) : '');
      setCost(sale.cost !== undefined && sale.cost !== null ? String(sale.cost) : '');
    }
  }, [sale]);

  const numSale = parseFloat(saleAmt) || 0;
  const numProfit = parseFloat(profit) || 0;
  const numCost = parseFloat(cost) || 0;
  const pct = numSale > 0 ? numProfit / numSale : 0;

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!sale?.id) return;

    if (!firebaseReady || !db) {
      showToast?.('Firebase is offline or unconfigured.');
      return;
    }

    const confirmed = await appConfirm({
      title: 'Save Changes',
      message: 'Save changes to this sale entry?',
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      danger: false
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      const before = {
        date: sale.date,
        sale: sale.sale,
        profit: sale.profit,
        cost: sale.cost,
        profitPct: sale.profitPct,
        enteredBy: sale.enteredBy
      };

      const updatedData = {
        date: date || sale.date,
        sale: numSale,
        profit: numProfit,
        cost: numCost,
        profitPct: pct
      };

      await db.collection('sales').doc(sale.id).update(updatedData);

      await logAudit(
        'sale',
        sale.id,
        'update',
        before,
        { ...updatedData, enteredBy: sale.enteredBy || user?.displayName || 'Authorized User' },
        user
      );

      showToast?.('Sale entry updated successfully.');
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating sale:', err);
      showToast?.('Failed to update sale entry.');
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
          <form onSubmit={handleSave}>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Ledger Revision
              </span>
              <h2 className="text-lg font-bold font-display text-foreground">
                Edit sale entry
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Row 1: Date & Margin preview */}
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
                    onChange={(e) => setDate(e.target.value)}
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
                  <Input
                    isReadOnly
                    variant="bordered"
                    size="sm"
                    value={numSale > 0 ? formatPct(pct) : 'auto'}
                    classNames={{
                      input: "font-mono font-semibold text-default-500",
                      inputWrapper: "border-default-200 bg-default-50/70 h-10 cursor-not-allowed"
                    }}
                    endContent={
                      <Chip
                        size="sm"
                        variant="flat"
                        color="success"
                        className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400"
                      >
                        Auto
                      </Chip>
                    }
                  />
                </div>
              </div>

              {/* Row 2: Sale, Profit, Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Sale (৳)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    variant="bordered"
                    size="sm"
                    value={saleAmt}
                    onChange={(e) => setSaleAmt(e.target.value)}
                    classNames={{
                      inputWrapper: "border-default-300 focus-within:border-primary font-numeric font-bold h-10"
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-default-600 mb-1.5">
                    Profit (৳)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
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
                    Cost (৳)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
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
                Save changes
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
