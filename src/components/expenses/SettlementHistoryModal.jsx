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
import { History, Calendar, CheckCircle2, ArrowUpRight, FileSpreadsheet } from 'lucide-react';
import { formatMoney } from '../../utils/calculations';
import { formatShortMonthYear, formatLongMonthYear } from '../../utils/expenseHelpers';

export default function SettlementHistoryModal({
  isOpen,
  onClose,
  settlements = [],
  onViewStatement
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2.5 pb-2 border-b border-default-200">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary flex items-center justify-center shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Partner Settlement History
                </h3>
                <p className="text-xs text-default-500">
                  Past finalized month-end statements &amp; profit payouts
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="py-4 space-y-3">
              {settlements.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-default-200 rounded-xl bg-default-50/50">
                  <FileSpreadsheet className="w-10 h-10 text-default-400 mx-auto mb-2 opacity-60" />
                  <h4 className="text-sm font-bold text-foreground">No finalized settlements yet</h4>
                  <p className="text-xs text-default-500 max-w-sm mx-auto mt-1">
                    When you finalize monthly settlements using the Month-End wizard, they will be archived here for instant lookup anytime.
                  </p>
                </div>
              ) : (
                settlements.map((s) => {
                  const longMY = formatLongMonthYear(s.month);
                  const shortMY = formatShortMonthYear(s.month);
                  const finalizedDate = s.finalizedAt
                    ? new Date(s.finalizedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '';

                  return (
                    <div
                      key={s.id || s.month}
                      className="p-4 rounded-xl border border-default-200 bg-content1 hover:border-primary-300 transition-colors shadow-sm space-y-3"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-display text-foreground">
                              {longMY}
                            </span>
                            <Chip size="sm" variant="flat" color="primary" className="text-[11px] font-semibold h-5">
                              {shortMY}
                            </Chip>
                            <Chip size="sm" variant="flat" color="success" className="text-[11px] font-semibold h-5" startContent={<CheckCircle2 className="w-3 h-3" />}>
                              Finalized
                            </Chip>
                          </div>
                          <p className="text-xs text-default-500 mt-1">
                            {s.operatingDays || 0} Open Days · Gross Profit: {formatMoney(s.totalGrossProfit || 0)} · Deductions: -{formatMoney(s.totalDeductions || 0)}
                            {finalizedDate && ` · Settled ${finalizedDate}`}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="font-bold text-xs"
                          endContent={<ArrowUpRight className="w-3.5 h-3.5" />}
                          onPress={() => {
                            if (onViewStatement) {
                              onViewStatement(s.month);
                            }
                          }}
                        >
                          View Statement
                        </Button>
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-default-50 border border-default-100">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-default-500 tracking-wider">
                            Distributable Profit
                          </div>
                          <div className="text-xs sm:text-sm font-black font-numeric text-primary mt-0.5">
                            {formatMoney(s.distributableProfit || 0)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-secondary-600 tracking-wider">
                            Pias ({s.piasRatio || 55}%+Daily)
                          </div>
                          <div className="text-xs sm:text-sm font-black font-numeric text-secondary-600 mt-0.5">
                            {formatMoney(s.piasTotalTakeHome || 0)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-pink-600 tracking-wider">
                            Mehedi ({s.mehediRatio || 45}%)
                          </div>
                          <div className="text-xs sm:text-sm font-black font-numeric text-pink-600 mt-0.5">
                            {formatMoney(s.mehediTotalTakeHome || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ModalBody>

            <ModalFooter className="border-t border-default-200 justify-between items-center">
              <span className="text-xs text-default-500">
                {settlements.length} settlement{settlements.length === 1 ? '' : 's'} archived
              </span>
              <Button size="sm" variant="flat" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
