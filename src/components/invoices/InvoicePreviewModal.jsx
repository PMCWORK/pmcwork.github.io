import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip
} from '@heroui/react';
import {
  Printer,
  Calendar,
  Clock,
  RotateCcw,
  X
} from 'lucide-react';
import { formatMoney, toISODate, dhakaNow, pad } from '../../utils/calculations';
import {
  formatInvDateSlash,
  formatDhakaPrintTime,
  formatCustomPrintTime
} from '../../utils/invoiceHelpers';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice = null
}) {
  const todayISO = toISODate(dhakaNow());

  // Custom date override state
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [customDate, setCustomDate] = useState(todayISO);
  const [customTime, setCustomTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const now = dhakaNow();
    const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setCustomDate(todayISO);
    setCustomTime(timeFormatted);
    setIsOverrideOpen(false);
  }, [isOpen, todayISO]);

  if (!invoice) return null;

  const invDateFormatted = formatInvDateSlash(invoice.date || todayISO);
  const printDateFormatted = isOverrideOpen && customDate ? formatInvDateSlash(customDate) : formatInvDateSlash(todayISO);
  const printTimeFormatted = isOverrideOpen && customTime ? formatCustomPrintTime(customTime) : formatDhakaPrintTime();

  const items = invoice.items || [];
  const totalAmount = Number(invoice.totalAmount || 0);
  const discount = Number(invoice.discount || 0);
  const grandTotal = Number(invoice.grandTotal || (totalAmount - discount));

  const handlePrint = () => {
    const origTitle = document.title;
    document.title = invoice.number || 'PMC-Invoice';
    window.onafterprint = () => {
      document.title = origTitle;
      window.onafterprint = null;
    };
    window.print();
  };

  const handleResetToNow = () => {
    const now = dhakaNow();
    setCustomDate(todayISO);
    setCustomTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      backdrop="blur"
      placement="center"
      scrollBehavior="inside"
      hideCloseButton={true}
      classNames={{
        base: "max-h-[94vh] print:!max-h-none print:!m-0 print:!p-0 print:!w-full print:!bg-white print:!shadow-none print:!border-0",
        backdrop: "print:!hidden print:!opacity-0 print:!bg-transparent",
        wrapper: "print:!static print:!p-0 print:!m-0 print:!w-full print:!h-auto print:!bg-white print:!shadow-none",
        body: "print:!p-0 print:!m-0 print:!bg-white print:!shadow-none"
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* Modal Top Bar */}
            <ModalHeader className="no-print flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-default-200">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color="primary" className="font-numeric font-bold">
                  #{invoice.number || 'INVOICE'}
                </Chip>
                <span className="text-sm font-bold font-display text-foreground">
                  Official Bill Preview (A4)
                </span>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Override Date Toggle */}
                <Button
                  size="sm"
                  variant={isOverrideOpen ? 'flat' : 'bordered'}
                  color={isOverrideOpen ? 'primary' : 'default'}
                  className="text-xs font-semibold"
                  startContent={<Calendar className="w-3.5 h-3.5" />}
                  onPress={() => setIsOverrideOpen(!isOverrideOpen)}
                >
                  <span>Override Date</span>
                  {isOverrideOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5"></span>
                  )}
                </Button>

                {/* Print Button */}
                <Button
                  size="sm"
                  color="primary"
                  className="font-bold text-xs"
                  startContent={<Printer className="w-4 h-4" />}
                  onPress={handlePrint}
                >
                  Print / Save PDF
                </Button>

                {/* Dedicated Close Button (Cleanly spaced, non-overlapping) */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  radius="full"
                  className="text-default-500 hover:text-default-900 dark:hover:text-default-100 ml-1"
                  aria-label="Close bill preview"
                  onPress={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </ModalHeader>

            {/* Custom Timestamp Override Bar */}
            {isOverrideOpen && (
              <div className="no-print p-3 bg-default-50 border-b border-default-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-default-600">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Custom Timestamp Override:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    size="sm"
                    variant="bordered"
                    className="w-36 h-7"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="1"
                    size="sm"
                    variant="bordered"
                    className="w-32 h-7"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    className="h-7 text-xs"
                    startContent={<RotateCcw className="w-3 h-3" />}
                    onPress={handleResetToNow}
                  >
                    Reset to Now
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="h-7 w-7 text-default-400"
                    onPress={() => setIsOverrideOpen(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Modal Body / Paper Container */}
            <ModalBody className="p-4 sm:p-8 bg-default-100/60 dark:bg-default-50/20 print:!bg-white print:!p-0 print:!m-0 flex items-center justify-center overflow-y-auto print:!overflow-visible">
              {/* PRINTABLE AREA */}
              <div id="printableInvoiceArea" className="w-full flex justify-center">
                {/* OFFICIAL A4 INVOICE */}
                <div
                  id="invoicePaper"
                  className="pmc-invoice-paper bg-white text-black shadow-lg print:shadow-none print:!bg-white mx-auto"
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: '13.5px',
                    lineHeight: 1.35,
                    padding: '32px 36px 28px',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Header */}
                  <div className="pmc-inv-header text-center mb-3">
                    <div className="pmc-inv-title text-2xl sm:text-3xl font-bold tracking-wide mb-1">
                      PM COMPUTERS
                    </div>
                    <div className="pmc-inv-addr text-sm sm:text-base my-0.5 text-black">
                      Address : Shop 19, Level 4, Capital Tower, Mirpur-1, Dhaka-1216
                    </div>
                    <div className="pmc-inv-contact text-xs sm:text-sm my-0.5 text-black flex flex-wrap items-center justify-center gap-x-3">
                      <span>Phone : 01683880269, 01799700299</span>
                      <span aria-hidden="true">|</span>
                      <span>E-mail : pmcomputers.bd@gmail.com</span>
                    </div>
                    <div className="pmc-inv-banner bg-gray-200 border-y border-black font-bold text-sm sm:text-base py-1 my-2.5 text-center text-black">
                      Invoice/ Bill
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  {/* Fixed, symmetric columns: label | : | value on both halves so every line aligns */}
                  <table className="pmc-inv-meta-table w-full mb-3 border-collapse text-sm sm:text-base text-black" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '2%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '2%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <tbody>
                      {[
                        ['Invoice No.', invoice.number || '', true, 'Date', invDateFormatted, false],
                        ['Buyer Name', (invoice.buyerName || '').trim() || 'Valued Customer', true, 'Sold By', invoice.soldBy || 'FOYEZ', true],
                        ['Address', invoice.buyerAddress || '—', false, 'Phone No.', invoice.buyerPhone || '—', false]
                      ].map(([l1, v1, b1, l2, v2, b2]) => (
                        <tr key={l1}>
                          <td className="font-bold whitespace-nowrap py-[3px] pr-1 align-top">{l1}</td>
                          <td className="font-bold py-[3px] align-top text-center">:</td>
                          <td className={`py-[3px] pl-1 pr-3 align-top break-words ${b1 ? 'font-bold' : ''}`}>{v1}</td>
                          <td className="font-bold whitespace-nowrap py-[3px] pr-1 align-top">{l2}</td>
                          <td className="font-bold py-[3px] align-top text-center">:</td>
                          <td className={`py-[3px] pl-1 align-top break-words ${b2 ? 'font-bold' : ''}`}>{v2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Product Table */}
                  {/* Number columns are right-aligned with tabular digits so amounts line up by place value */}
                  <table className="pmc-inv-items-table w-full border border-black border-collapse text-xs sm:text-sm text-black" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '51%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-black font-bold bg-gray-100 text-black">
                        <th className="border border-black px-2 py-1.5 text-center">SL</th>
                        <th className="border border-black px-2 py-1.5 text-left">PRODUCT DESCRIPTION</th>
                        <th className="border border-black px-2 py-1.5 text-center">QTY</th>
                        <th className="border border-black px-2 py-1.5 text-right">UNIT PRICE</th>
                        <th className="border border-black px-2 py-1.5 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const desc = (item.desc || '').toUpperCase();
                        let warrantyStr = item.warrantyDays || '';
                        if (warrantyStr) {
                          const rawNote = (item.warrantyNote || '').trim();
                          if (rawNote) {
                            const formattedNote = rawNote.startsWith('(') && rawNote.endsWith(')') ? rawNote : `(${rawNote})`;
                            warrantyStr = `${warrantyStr} ${formattedNote}`;
                          }
                        }

                        return (
                          <tr key={idx} className="border-x border-black">
                            <td className="border-x border-black px-2 py-1.5 text-center align-top">{idx + 1}</td>
                            <td className="border-x border-black px-2 py-1.5 text-left align-top break-words">
                              <div className="font-bold text-sm leading-tight text-black">{desc}</div>
                              {warrantyStr && (
                                <div className="text-xs text-black mt-0.5">
                                  Warranty : {warrantyStr}
                                </div>
                              )}
                            </td>
                            <td className="border-x border-black px-2 py-1.5 text-center align-top whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {item.qty || 1} pc
                            </td>
                            <td className="border-x border-black px-2 py-1.5 text-right align-top whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(Number(item.price || 0)).toLocaleString('en-US')}
                            </td>
                            <td className="border-x border-black px-2 py-1.5 text-right align-top whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(Number(item.total || (item.qty * item.price) || 0)).toLocaleString('en-US')}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Blank Spacer Row - balanced height so invoice always fits cleanly on 1 A4 page */}
                      <tr className="row-blank border-x border-black">
                        <td
                          className="border-x border-black"
                          style={{
                            height: items.length <= 2 ? '110px' : (items.length <= 4 ? '65px' : (items.length <= 6 ? '35px' : '10px'))
                          }}
                        ></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                        <td className="border-x border-black"></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Calculations Table */}
                  {/* Totals: same column grid as the items table, values right-aligned under TOTAL */}
                  <table className="pmc-inv-calc-table w-full border-collapse text-xs sm:text-sm text-black" style={{ tableLayout: 'fixed', fontVariantNumeric: 'tabular-nums' }}>
                    <colgroup>
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '51%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={2}></td>
                        <td colSpan={2} className="text-right font-bold px-2 py-1">Total Amount</td>
                        <td className="text-right font-bold px-2 py-1 whitespace-nowrap border-x border-b border-black">
                          {Math.round(totalAmount).toLocaleString('en-US')}
                        </td>
                      </tr>
                      {discount > 0 && (
                        <tr>
                          <td colSpan={2}></td>
                          <td colSpan={2} className="text-right font-bold px-2 py-1">Discount (−)</td>
                          <td className="text-right font-bold px-2 py-1 whitespace-nowrap border-x border-b border-black">
                            {Math.round(discount).toLocaleString('en-US')}
                          </td>
                        </tr>
                      )}
                      <tr className="grand-row font-bold">
                        <td colSpan={2}></td>
                        <td colSpan={2} className="text-right font-bold px-2 py-1.5 text-sm sm:text-base bg-gray-100 border border-black">Grand Total</td>
                        <td className="text-right font-bold px-2 py-1.5 text-sm sm:text-base whitespace-nowrap bg-gray-100 border border-black">
                          {Math.round(grandTotal).toLocaleString('en-US')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="pmc-inv-signatures flex justify-between mt-8 sm:mt-10 px-3">
                    <div className="pmc-inv-sig-box text-center w-48">
                      <div className="border-t border-black pt-1 font-bold text-xs sm:text-sm">
                        Receiver's Signature
                      </div>
                    </div>
                    <div className="pmc-inv-sig-box text-center w-48">
                      <div className="border-t border-black pt-1 font-bold text-xs sm:text-sm">
                        Manager Signature
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="pmc-inv-terms mt-4 font-bold text-xs leading-normal text-black">
                    The warranty is not applicable to keyboard, mouse, speaker, power Supply, Sticker-removed items, Burned &amp; physically damage items.
                  </div>

                  {/* Timestamp Footer */}
                  <div className="pmc-inv-footer-time flex justify-between mt-3 text-xs text-black">
                    <div>Printing Date : {printDateFormatted}</div>
                    <div>Print Time : {printTimeFormatted}</div>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="no-print border-t border-default-200 justify-between items-center">
              <span className="text-xs text-default-400">
                Official A4 Format · Press Ctrl+P or click Print Invoice
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  className="font-bold text-xs"
                  startContent={<Printer className="w-4 h-4" />}
                  onPress={handlePrint}
                >
                  Print Invoice
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
