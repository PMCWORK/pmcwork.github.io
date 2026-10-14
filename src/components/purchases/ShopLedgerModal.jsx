import React, { useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip
} from '@heroui/react';
import { CreditCard, FileText, CheckCircle2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { computeShopBalances, buildShopLedgerTransactions } from '../../utils/purchaseHelpers';
import { formatMoney, formatDateLabel } from '../../utils/calculations';

export default function ShopLedgerModal({
  isOpen,
  onClose,
  shop,
  onPayDue
}) {
  const { purchases = [], purchasePayments = [] } = useData();

  const shopName = shop?.name || '';

  const balance = useMemo(() => {
    return computeShopBalances(purchases, purchasePayments, shopName);
  }, [purchases, purchasePayments, shopName]);

  const transactions = useMemo(() => {
    return buildShopLedgerTransactions(purchases, purchasePayments, shopName);
  }, [purchases, purchasePayments, shopName]);

  if (!shop) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
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
          <>
            <ModalHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Supplier Financial Statement
                </span>
                <h2 className="text-xl font-bold font-display text-foreground mt-0.5">
                  {shop.name}
                </h2>
                <div className="text-xs text-default-400 mt-0.5">
                  Phone: <b>{shop.phone || '—'}</b> · Address: <b>{shop.address || '—'}</b>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  color="primary"
                  size="sm"
                  onPress={() => onPayDue?.(shop.name)}
                  startContent={<CreditCard className="w-3.5 h-3.5" />}
                  className="font-bold text-xs shadow-sm"
                >
                  Pay Due
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {/* Financial Snapshot KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-default-100 border border-default-200/80">
                  <span className="text-[10px] font-bold uppercase text-default-400">Total Purchases</span>
                  <div className="text-lg font-bold font-numeric text-foreground mt-1">
                    {formatMoney(balance.totalBought)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-default-100 border border-default-200/80">
                  <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">Total Paid</span>
                  <div className="text-lg font-bold font-numeric text-teal-600 dark:text-teal-400 mt-1">
                    {formatMoney(balance.totalPaid)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-danger-500/30 bg-danger-50/10 dark:bg-danger-950/10">
                  <span className="text-[10px] font-bold uppercase text-danger-500">Outstanding Due Balance</span>
                  <div className="text-lg font-bold font-numeric text-danger-500 mt-1">
                    {formatMoney(balance.due)}
                  </div>
                </div>
              </div>

              {/* Transactions Running Due Table */}
              <div className="border border-default-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-default-100 text-default-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-24">Date</th>
                      <th className="py-2.5 px-3 text-left w-24">Type</th>
                      <th className="py-2.5 px-3 text-left w-28">Ref / Inv #</th>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-right w-24">Bill (৳)</th>
                      <th className="py-2.5 px-3 text-right w-24">Paid (৳)</th>
                      <th className="py-2.5 px-3 text-right w-28">Running Due (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-default-400">
                          No purchase bills or payment vouchers recorded for this supplier.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-default-50/50 transition-colors">
                          <td className="p-2.5 font-medium text-foreground whitespace-nowrap">
                            {formatDateLabel(t.date)}
                          </td>

                          <td className="p-2.5 whitespace-nowrap">
                            {t.type === 'purchase' ? (
                              <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-bold">
                                Purchase
                              </Chip>
                            ) : (
                              <Chip size="sm" variant="flat" color="success" className="text-[10px] font-bold">
                                Payment
                              </Chip>
                            )}
                          </td>

                          <td className="p-2.5 font-mono text-[11px] text-default-600">
                            {t.ref}
                          </td>

                          <td className="p-2.5 text-default-700">
                            {t.desc}
                          </td>

                          <td className="p-2.5 text-right font-numeric font-bold text-foreground">
                            {t.bill > 0 ? formatMoney(t.bill) : '—'}
                          </td>

                          <td className="p-2.5 text-right font-numeric font-bold text-teal-600 dark:text-teal-400">
                            {t.paid > 0 ? formatMoney(t.paid) : '—'}
                          </td>

                          <td className="p-2.5 text-right font-numeric font-bold text-danger-500">
                            {formatMoney(t.runningDue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ModalBody>

            <ModalFooter className="flex justify-end">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={onClose}
              >
                Close Statement
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
