import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip
} from '@heroui/react';
import { FileText, Edit2, X, Calendar, Building2 } from 'lucide-react';
import { formatMoney, formatDateLabel } from '../../utils/calculations';

export default function PurchaseInvoiceViewModal({
  isOpen,
  onClose,
  purchase,
  onEdit
}) {
  if (!purchase) return null;

  const totalBill = Number(purchase.totalAmount) || 0;
  const paid = Number(purchase.paidAmount) || 0;
  const due = Math.max(0, totalBill - paid);
  const items = Array.isArray(purchase.items) ? purchase.items : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      placement="center"
      classNames={{
        base: "border border-default-200 bg-content1 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col",
        header: "border-b border-default-100 py-4 px-6",
        body: "py-6 px-6 flex-1 overflow-y-auto",
        footer: "border-t border-default-100 py-3.5 px-6"
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Purchase Invoice Details
                </span>
                <h2 className="text-xl font-bold font-display text-foreground mt-0.5">
                  #{purchase.invoiceNum || purchase.number || 'PUR-INVOICE'}
                </h2>
                <div className="text-xs text-default-400 mt-0.5">
                  Supplier: <b>{purchase.shop || 'Unassigned'}</b>
                </div>
              </div>

              <div>
                {due === 0 ? (
                  <Chip size="sm" color="success" variant="flat" className="font-bold text-xs">
                    Fully Paid
                  </Chip>
                ) : paid > 0 ? (
                  <Chip size="sm" color="warning" variant="flat" className="font-bold text-xs">
                    Partial Due
                  </Chip>
                ) : (
                  <Chip size="sm" color="danger" variant="flat" className="font-bold text-xs">
                    Unpaid Due
                  </Chip>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Top Details Grid */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-default-100 border border-default-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-default-400">Purchase Date</span>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {formatDateLabel(purchase.date)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-default-400">Supplier Bill #</span>
                  <div className="text-xs font-bold font-mono text-primary mt-0.5">
                    {purchase.invoiceNum || '—'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-default-400">Line Items</span>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div className="border border-default-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-default-100 text-default-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Item Description</th>
                        <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 w-28 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-foreground">{it.desc}</td>
                          <td className="p-2.5 text-center font-numeric">{it.qty}</td>
                          <td className="p-2.5 text-right font-numeric">{formatMoney(it.unitCost)}</td>
                          <td className="p-2.5 text-right font-numeric font-bold text-foreground">
                            {formatMoney(it.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals & Notes Breakdown */}
              <div className="p-4 rounded-xl border border-default-200/80 bg-default-50/50 flex flex-col sm:flex-row justify-between gap-4">
                <div className="max-w-xs">
                  <span className="text-[10px] font-bold uppercase text-default-400">Notes / Remarks</span>
                  <div className="text-xs text-default-600 mt-1">
                    {purchase.notes || 'No remarks recorded for this invoice.'}
                  </div>
                </div>

                <div className="w-full sm:w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between text-default-500">
                    <span>Total Bill:</span>
                    <span className="font-numeric font-bold text-foreground">{formatMoney(totalBill)}</span>
                  </div>
                  <div className="flex justify-between text-teal-600 dark:text-teal-400">
                    <span>Paid Amount:</span>
                    <span className="font-numeric font-bold">{formatMoney(paid)}</span>
                  </div>
                  <div className="flex justify-between text-danger-500 font-bold text-sm pt-1 border-t border-default-200">
                    <span>Due Amount:</span>
                    <span className="font-numeric">{formatMoney(due)}</span>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-between items-center">
              <Button
                variant="flat"
                color="primary"
                size="sm"
                onPress={() => {
                  onClose();
                  onEdit?.(purchase);
                }}
                startContent={<Edit2 className="w-3.5 h-3.5" />}
                className="font-bold"
              >
                Edit Invoice
              </Button>

              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={onClose}
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
